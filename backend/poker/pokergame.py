from dataclasses import asdict
import json
import logging

import websockets
from game_engine import GameEngine, UserInfo
from typing import List, Optional, Union
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)


class Seat(BaseModel):
    websocket: object = Field(..., alias="websocket", repr=False)
    info: dict
    ai: bool


class PokerGameSetup(BaseModel):
    gameName: str = "holdem"
    seats: List[Optional[Seat]]


class PokerAction(BaseModel):
    action: str
    amount: int


class PokerPlayer(BaseModel):
    stack: int
    bet: Union[int, None]
    cards: List[str]
    folded: bool
    lastAction: PokerAction = None
    isAllIn: bool


class PokerGamePlaying(BaseModel):
    players: List[Union[PokerPlayer, None]]
    dealer: int
    turn: int
    table: List[str]
    bank: int


class PokerGameStatus(BaseModel):
    stage: str
    setup: PokerGameSetup
    playing: PokerGamePlaying = None


def create_new_setup():
    setup_data = {"gameName": "holdem", "seats": [None] * 9}
    setup = PokerGameSetup(**setup_data)
    poker_game_status_data = {"stage": "setup", "setup": setup, "playing": None}
    return PokerGameStatus(**poker_game_status_data)


class PokerGameEngine(GameEngine):
    def __init__(self):
        self.state = create_new_setup()

    def game_name(self):
        return "poker"

    def userinfo_to_dict(self, userinfo):
        if userinfo is None:
            return None
        return asdict(userinfo)

    async def broadcast_room_state(self, room):
        state_json = json.dumps(
            {"type": "game", "data": {"type": "status", "status": self.state}}
        )
        logger.info(state_json)

        for user in room.users:
            await user.send(state_json)

    def user_index_by_websocket(self, websocket):
        for i, seat in enumerate(self.state.setup.seats):
            if seat and seat.websocket == websocket:
                return i
        return -1

    async def take_seat(self, room, websocket, userinfo: UserInfo, seat_index):
        logger.info(f"User {userinfo.name} takes seat {seat_index}")
        self.state.setup.seats[seat_index] = Seat(
            websocket=websocket, info=self.userinfo_to_dict(userinfo), ai=False
        )
        await self.broadcast_room_state(room)

    async def handle_message(self, room, websocket, message, userinfo):
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
