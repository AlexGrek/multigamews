import asyncio
from dataclasses import asdict
import json
import logging
from typing import List, Optional

from pydantic import BaseModel, Field, validator

from dixit.error import UserCommandError
import utils
from dixit.dixitgame import (
    PHASE_INITIAL,
    PHASE_RESULTS,
    DixitAction,
    DixitGameState,
    init_dixit_game_state,
    process_user_action,
    start,
)
from game_engine import GameEngine, UserInfo


logger = logging.getLogger(__name__)


class Seat(BaseModel):
    websocket_uid: str
    info: UserInfo

    class Config:
        fields = {"info": ...}
        arbitrary_types_allowed = True

    @validator("*", pre=True)
    def check_websocket(cls, v):
        # websocket validation
        return v


class DixitGameSetup(BaseModel):
    seats: List[Optional[Seat]]
    windelay: int = 12
    playing: DixitGameState = None


class DixitGameStatusPersonal(BaseModel):
    websocket_uid: str
    seat: int


class DixitGameStatusMessageData(BaseModel):
    type: str = Field(default="status", alias="type")
    status: DixitGameSetup
    personal: Optional[DixitGameStatusPersonal]

    class Config:
        allow_population_by_field_name = True


class DixitGameStatusMessage(BaseModel):
    type: str = Field(default="game", alias="type")
    data: DixitGameStatusMessageData

    class Config:
        allow_population_by_field_name = True


def create_new_setup():
    setup_data = {"seats": [None] * 10, "playing": init_dixit_game_state(10)}
    setup = DixitGameSetup(**setup_data)
    return setup


class DixitGameEngine(GameEngine):
    def __init__(self):
        self.state = create_new_setup()
        self.websocket_uid_mapping = {}

    def game_name(self):
        return "dixit"

    def userinfo_to_dict(self, userinfo):
        if userinfo is None:
            return None
        return asdict(userinfo)

    async def broadcast_room_state(self, room):
        # logger.info(
        #     f"Sending DIXIT update to {room.users} users: {self.state.model_dump()}"
        # )
        state_json = DixitGameStatusMessage(
            **{
                "type": "game",
                "data": {"type": "status", "personal": None, "status": self.state},
            }
        ).model_dump_json()

        for user in room.users:
            await self.send_status(user)

    def get_personal_status(self, websocket):
        seat = self.user_index_by_websocket(websocket)
        websocket_uid = self.get_websocket_uid_mapping(websocket)
        return {"seat": seat, "websocket_uid": websocket_uid, "expected_actions": []}

    async def game_start(self, room, websocket):
        """Handle game start command"""
        if self.state.playing.status != PHASE_INITIAL:
            error = {
                "type": "game",
                "data": {
                    "type": "error",
                    "error": "game_false_start",
                    "message": f"Cannot start game that is in {self.state.playing.status} state",
                },
            }
            await websocket.send(json.dumps(error))
            return
        self.state.playing = start(self.state.playing, self.state.seats)
        await self.broadcast_room_state(room)
        await asyncio.sleep(1)
        await self.broadcast_room_state(room)

    async def game_player_command(self, room, websocket, action: DixitAction, seat):
        """Handle in-game command"""
        if seat < 0:
            logger.warn(f"User not in game trying to do some action: {action}")
            return
        try:
            process_user_action(self.state.playing, action)
            await self.broadcast_room_state(room)
            if self.state.playing.status == PHASE_RESULTS:
                # we are in victory state, we have to run next round after pause
                await asyncio.sleep(self.state.windelay)
                self.state.playing.start_phase_1()
                await self.broadcast_room_state(room)
        except UserCommandError as err:
            error = {
                "type": "game",
                "data": {"type": "error", "error": err.error_type, "message": f"{err}"},
            }
            await websocket.send(json.dumps(error))

    async def send_status(self, websocket):
        """Send status message to specific recipient"""
        state_share = self.state
        state_json = DixitGameStatusMessage(
            **{
                "type": "game",
                "data": {
                    "type": "status",
                    "personal": self.get_personal_status(websocket),
                    "status": state_share,
                },
            }
        ).model_dump_json()
        await websocket.send(state_json)

    async def get_status(self, websocket, userinfo: UserInfo):
        logger.info(f"User {userinfo.name} requested poker game status, sending...")
        await self.send_status(websocket)

    def get_websocket_uid_mapping(self, websocket):
        """Mapping between non-serializable websocket objects
        and serializable simplified UIDs that consist of 16
        alphanumeric characters"""
        if websocket in self.websocket_uid_mapping:
            return self.websocket_uid_mapping[websocket]
        genereated = utils.generate_random_string(16)
        self.websocket_uid_mapping[websocket] = genereated
        return genereated

    def user_index_by_websocket(self, websocket):
        """Get user seat, return -1 if the user has no seat"""
        uid = self.get_websocket_uid_mapping(websocket)
        for i, seat in enumerate(self.state.seats):
            if seat and seat.websocket_uid == uid:
                return i
        return -1

    async def user_list_changed(self, room, added, removed):
        for user in removed:
            undex = self.user_index_by_websocket(user)
            if undex >= 0:
                self.state.seats[undex] = None
        await self.broadcast_room_state(room)

    async def update_setup(self, updates, room):
        if upd := updates.get("gameName"):
            self.state.gameName = upd
        await self.broadcast_room_state(room)

    async def take_seat(self, room, websocket, userinfo: UserInfo, seat_index):
        """Handle take seat command"""
        logger.info(f"User {userinfo.name} takes seat {seat_index}")
        self.state.seats[seat_index] = Seat(
            websocket_uid=self.get_websocket_uid_mapping(websocket),
            info=self.userinfo_to_dict(userinfo),
            ai=False,
        )
        await self.broadcast_room_state(room)

    async def handle_message(self, room, websocket, message, userinfo):
        """Handle game message"""
        if message.get("type") == "get_status":
            await self.get_status(websocket, userinfo)
        if message.get("type") == "action":
            await self.game_player_command(
                room,
                websocket,
                DixitAction.model_validate(message.get("data")),
                self.user_index_by_websocket(websocket),
            )
        if message.get("type") == "start":
            await self.game_start(room, websocket)
        if message.get("type") == "change_options":
            if self.state.stage != "setup":
                await utils.send_error(
                    websocket, "Cannot change options while not in setup state"
                )
            else:
                await self.update_setup(message.get("data"), room)
        if message.get("type") == "take_seat":
            seat_to_take = message.get("data")
            # free any seat if it was already taken by this user
            taken = self.user_index_by_websocket(websocket)
            if taken >= 0:
                self.state.seats[taken] = None
            await self.take_seat(room, websocket, userinfo, seat_to_take)

        if message.get("type") == "chat":
            text = message.get("text")
            if text:
                for user in room.users:
                    await user.send(
                        json.dumps(
                            {
                                "type": "game",
                                "data": {
                                    "type": "chat",
                                    "sender": self.userinfo_to_dict(userinfo),
                                    "text": f"{text}",
                                },
                            }
                        )
                    )
