import asyncio
from dataclasses import dataclass
import json
import logging
from game_engine import UserInfo, ChatGameEngine, GameEngine
import utils

logger = logging.getLogger(__name__)

def generate_user_info():
    return UserInfo(f"Unknown_{utils.generate_random_string()}", gender=0, avatar="")

class Room:
    def __init__(self, name, game_engine):
        self.name = name
        self.users = {}  # Use a dictionary to store user information
        self.game_engine: GameEngine = game_engine

    def should_be_removed(self):
        return len(self.users) == 0

    async def add(self, websocket, info: UserInfo):
        self.users[websocket] = info
        await self.notify_user_list_change()

    async def remove(self, websocket):
        if websocket in self.users:
            self.users.pop(websocket)
        await self.notify_user_list_change()

    async def update_info(self, websocket, info: UserInfo):
        if websocket in self.users:
            self.users[websocket] = info
            await self.notify_user_list_change()
        else:
            logger.error(f"User {websocket} is not in a group {self.name} but trying to update it's info")

    async def send_game_message(self, websocket, message):
        # logger.warn(f"websocket: {websocket}")
        userinfo = self.users.get(websocket)
        await self.game_engine.handle_message(self, websocket, message, userinfo)

    def status(self, websocket):
        if not websocket in self.users:
            logger.critical(f"Status error: user {websocket.remote_address} is not in a room '{self.name}'")
        user_list = [
            {
                "name": user_info.name,
                "gender": user_info.gender,
                "avatar": user_info.avatar,
            }
            for user_info in self.users.values()
        ]
        return {
            "game": self.game_engine.game_name(),
            "users": user_list
        }

    async def notify_user_list_change(self):
        user_list = [
            {
                "name": user_info.name,
                "gender": user_info.gender,
                "avatar": user_info.avatar,
            }
            for user_info in self.users.values()
        ]
        await asyncio.gather(
            *(
                user.send(json.dumps({"type": "user_list", "data": user_list}))
                for user in self.users
            )
        )

    def describe(self):
        return f"{self.name}[{len(self.users)}:{self.game_engine.game_name()}]"
