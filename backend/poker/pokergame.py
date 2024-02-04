from dataclasses import asdict
from poker.poker_runtime_holdem import (
    PokerAction,
    PokerGamePlaying,
    UserCommandError,
    UserResponse,
    create_deck,
    createSimplePokerGamePlaying,
    game_next,
    game_next_round,
    game_start,
    start_round,
)
import utils
import json
import logging
import asyncio
from pydantic.json import pydantic_encoder

import websockets
from game_engine import GameEngine, UserInfo
from typing import List, Optional, Union
from pydantic import BaseModel, Field, validator

logger = logging.getLogger(__name__)


class Seat(BaseModel):
    websocket_uid: str
    info: UserInfo
    ai: bool

    class Config:
        fields = {"info": ..., "ai": ...}
        arbitrary_types_allowed = True

    @validator("*", pre=True)
    def check_websocket(cls, v):
        # websocket validation
        return v


class PokerGameSetup(BaseModel):
    gameName: str = "holdem"
    seats: List[Optional[Seat]]
    windelay: int = 6


class PokerGameStatus(BaseModel):
    stage: str
    setup: PokerGameSetup
    playing: Optional[PokerGamePlaying] = None


class PokerGameStatusPersonal(BaseModel):
    websocket_uid: str
    seat: int
    expected_actions: list[PokerAction]


class PokerGameStatusMessageData(BaseModel):
    type: str = Field(default="status", alias="type")
    status: PokerGameStatus
    personal: Optional[PokerGameStatusPersonal]

    class Config:
        allow_population_by_field_name = True


class PokerGameStatusMessage(BaseModel):
    type: str = Field(default="game", alias="type")
    data: PokerGameStatusMessageData

    class Config:
        allow_population_by_field_name = True


def create_new_setup():
    setup_data = {"gameName": "holdem", "seats": [None] * 9}
    setup = PokerGameSetup(**setup_data)
    poker_game_status_data = {"stage": "setup", "setup": setup, "playing": None}
    return PokerGameStatus(**poker_game_status_data)


def start_game(status: PokerGameStatus):
    status.stage = "playing"
    status.playing = createSimplePokerGamePlaying(status.setup.seats, 1500, 30)
    logger.info(f"Game starting... {status.model_dump_json()}")
    return status


class PokerGameEngine(GameEngine):
    def __init__(self):
        self.state = create_new_setup()
        self.websocket_uid_mapping = {}
        self.deck = create_deck()

    def game_name(self):
        return "poker"

    def userinfo_to_dict(self, userinfo):
        if userinfo is None:
            return None
        return asdict(userinfo)

    async def broadcast_room_state(self, room):
        # logger.info(
        #     f"Sending POKER update to {room.users} users: {self.state.model_dump()}"
        # )
        if (self.state and self.state.playing and self.state.playing):
            logger.info(f"Broadcasting room {self.state.playing.victory}")
        state_json = PokerGameStatusMessage(
            **{
                "type": "game",
                "data": {"type": "status", "personal": None, "status": self.state},
            }
        ).model_dump_json()
        # logger.info(state_json)

        for user in room.users:
            await self.send_status(user)

    def get_personal_status(self, websocket):
        seat = self.user_index_by_websocket(websocket)
        websocket_uid = self.get_websocket_uid_mapping(websocket)
        return {"seat": seat, "websocket_uid": websocket_uid, "expected_actions": []}

    async def game_start(self, room, websocket):
        """Handle game start command"""
        if self.state.stage != "setup":
            error = {
                "type": "game",
                "data": {"type": "error", "error": "game_false_start", "message": f"Cannot start game that is in {self.state.stage} state"},
            }
            await websocket.send(json.dumps(error))
            return
        self.state = start_game(self.state)
        await self.broadcast_room_state(room)
        await asyncio.sleep(1)
        game_start(self.state.playing, self.deck)
        await self.broadcast_room_state(room)

    async def game_player_command(self, room, websocket, action: PokerAction, seat):
        """Handle in-game command"""
        if seat < 0:
            logger.warn(f"User not in game trying to do some action: {action}")
            return
        try:
            game_next(
                self.state.playing, self.deck, UserResponse(action=action, seat=seat)
            )
            await self.broadcast_room_state(room)
            if self.state.playing.victory:
                # we are in victory state, we have to run next round after pause
                await asyncio.sleep(self.state.setup.windelay)
                game_next_round(self.state.playing, self.deck)
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
        if self.state.playing and not self.state.playing.victory:
            state_copy = self.state.model_copy(deep=True)
            seat = self.user_index_by_websocket(websocket)
            allinRound = self.state.playing.isAllinRound()
            state_copy.playing.players = [player.copy_hide_cards_if_needed(allinRound, skip=i==seat) if player else None for i, player in enumerate(state_copy.playing.players)]
            state_share = state_copy
        state_json = PokerGameStatusMessage(
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
        for i, seat in enumerate(self.state.setup.seats):
            if seat and seat.websocket_uid == uid:
                return i
        return -1

    async def user_list_changed(self, room, added, removed):
        for user in removed:
            undex = self.user_index_by_websocket(user)
            if undex >= 0:
                self.state.setup.seats[undex] = None
        await self.broadcast_room_state(room)

    async def update_setup(self, updates, room):
        if upd := updates.get("gameName"):
            self.state.setup.gameName = upd
        await self.broadcast_room_state(room)

    async def take_seat(self, room, websocket, userinfo: UserInfo, seat_index):
        """Handle take seat command"""
        logger.info(f"User {userinfo.name} takes seat {seat_index}")
        self.state.setup.seats[seat_index] = Seat(
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
                PokerAction.model_validate(message.get("data")),
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
                self.state.setup.seats[taken] = None
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
