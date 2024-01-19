import asyncio
import random
from typing import Dict, List, Optional
from poker.pokergame import PokerGameEngine
from room import Room, generate_user_info
import websockets
import json
import logging
from game_engine import ChatGameEngine, GameEngine, UserInfo
from dataclasses import dataclass, asdict
import utils
import pprint
from colorlog import ColoredFormatter
import traceback

PUBLIC_PATH = "../multigamews-frontend/public/"
AVATAR_PATH = "avatars/"

# Configure colorlog
formatter = ColoredFormatter(
    "%(log_color)s%(levelname)-8s%(reset)s %(blue)s%(message)s",
    datefmt=None,
    reset=True,
    log_colors={
        "DEBUG": "cyan",
        "INFO": "green",
        "WARNING": "yellow",
        "ERROR": "red",
        "CRITICAL": "red,bg_white",
    },
)

# Set up the root logger with the configured formatter
handler = logging.StreamHandler()
handler.setFormatter(formatter)
root_logger = logging.getLogger()
root_logger.addHandler(handler)
root_logger.setLevel(logging.INFO)

logger = root_logger

# Set the default log level to "info"
logging.basicConfig(level=logging.INFO)
# logger = logging.getLogger(__name__)


@dataclass
class UserStatus:
    info: UserInfo
    room: Optional[str]
    game_status: Optional[any]


class WebSocketServer:
    def __init__(self):
        self.rooms: List[Room] = []
        self.userRoomMapping: Dict[any, Optional[Room]] = {}
        self.userInfoMapping: Dict[any, Optional[UserInfo]] = {}
        self.admins = []
        self.log_forever = True

    def get_user_info(self, websocket) -> UserInfo:
        if not (websocket in self.userInfoMapping):
            self.userInfoMapping[websocket] = generate_user_info()
        return self.userInfoMapping[websocket]

    async def new_user_connects(self, websocket):
        self.userRoomMapping[websocket] = None
        await self.send_user_status(websocket)
        await asyncio.sleep(1)
        await self.send_room_list(websocket)

    async def remove_room(self, room: Room):
        self.rooms.remove(room)

    async def broadcast_rooms(self):
        users_outside = [
            websocket
            for websocket in self.userRoomMapping.keys()
            if self.userRoomMapping[websocket] is None
        ]
        logger.info(f"Broadcasting room changes to {len(users_outside)} users")
        await asyncio.gather(*(self.send_room_list(user) for user in users_outside))

    async def user_leave_room(self, websocket, room: Optional[Room]):
        self.userRoomMapping[websocket] = None
        if room:
            await room.remove(websocket)
            if room.should_be_removed():
                await self.remove_room(room)

    async def user_change_room(self, websocket, room: Optional[Room]):
        if (prev := self.userRoomMapping.get(websocket)) is not None:
            await self.user_leave_room(websocket, prev)

        # check if the room exists now
        if room is not None and not room in self.rooms:
            logger.error(f"Attempt to enter removed room: {room.describe()}")
            await utils.send_error(
                websocket, f"Cannot enter room '{room.describe}': does not exist"
            )
            room = None

        self.userRoomMapping[websocket] = room
        if room:
            await room.add(websocket, self.get_user_info(websocket))
        await self.send_user_status(websocket)
        await self.broadcast_rooms()

    async def send_user_status(self, websocket):
        info = self.get_user_info(websocket)
        room = self.userRoomMapping.get(websocket)
        roomname = None
        roomgame = None
        if room:
            roomname = room.name
            roomgame = room.status(websocket)
        await websocket.send(json.dumps({"type": "status", "data": asdict(UserStatus(info=info, room=roomname, game_status=roomgame))}))
        
    async def get_request(self, websocket, data):
        try:
            result = await self.process_response(websocket, data)
            await websocket.send(json.dumps({"type": "response", "request": data, "data": result}))
        except Exception as e:
            logger.error(f"Error while processing request {data}: {e}")
            await websocket.send(json.dumps({"type": "response", "request": data, "error": f"Error: {e}"}))
        
    async def process_response(self, websocket, data):
        async def avatars():
            return [x.replace("\\", "/").replace(PUBLIC_PATH, "") for x in await utils.list_files(PUBLIC_PATH+AVATAR_PATH)]
        if data == "avatar_list":
            return await avatars()
        if data == "avatar_list_9":
            all = await avatars()
            return random.sample(all, 9)
        else:
            raise ValueError(f"Unknown request: {data}")

    async def handle_disconnect(self, websocket):
        logger.info(f"Disconnected user {websocket.remote_address}")
        if (prev := self.userRoomMapping.get(websocket)) is not None:
            await self.user_leave_room(websocket, prev)
        self.userRoomMapping.pop(websocket)
        self.userInfoMapping.pop(websocket)
        await self.broadcast_rooms()

    async def handle_connection(self, websocket, path):
        logger.info(f"Connection established: {websocket.remote_address}")

        await self.new_user_connects(websocket)

        try:
            async for message in websocket:
                try:
                    logger.info(
                        f"Received message from {websocket.remote_address}: {message}"
                    )
                    data = json.loads(message)

                    message_type = data.get("type")
                    if message_type == "init":
                        await self.handle_init_command(websocket, data)
                    elif message_type == "game":
                        await self.handle_game_command(websocket, data)
                except Exception as e:
                    tb = traceback.format_exc()
                    logger.critical(f"An error occurred: {e}\n{tb}")
        finally:
            logger.warn(f"Connection closed: {websocket.remote_address}")
            await self.handle_disconnect(websocket)

    async def handle_init_command(self, websocket, data):
        command = data.get("command")
        if command == "create":
            await self.create_room(
                websocket, data.get("name"), data.get("game", "chat")
            )
        elif command == "enter":
            await self.handle_enter_room(websocket, data.get("name"))
        elif command == "list":
            await self.send_room_list(websocket)
        elif command == "change_info":
            await self.change_user_info(websocket, data.get("data"))
        elif command == "request":
            await self.get_request(websocket, data.get("data"))
        elif command == "get_user_info":
            await self.send_user_status(websocket)

    async def handle_game_command(self, websocket, data):
        room = self.userRoomMapping[websocket]
        if room:
            game_engine_data = data.get("data")
            if game_engine_data:
                await room.send_game_message(websocket, game_engine_data)
        else:
            logger.warning(
                f"User {websocket.remote_address} is not in any room, but sending game commands."
            )
            await utils.send_error(websocket, "Not in any room, cannot send game commands.")

    async def change_user_info(self, websocket, data):
        room = self.userRoomMapping[websocket]
        self.userInfoMapping[websocket] = UserInfo(**data)
        if room:
            await room.update_info(websocket, self.userInfoMapping[websocket])
        await self.send_user_status(websocket)

    def room_by_name(self, name) -> Optional[Room]:
        return next((x for x in self.rooms if x.name == name), None)

    async def handle_enter_room(self, websocket, room_name):
        if not room_name:  # null or empty
            logger.info("User leaving any room")
            await self.user_change_room(websocket, None)
            return

        room = self.room_by_name(room_name)
        if room:
            await self.user_change_room(websocket, room)
        else:
            logger.error(f"Trying to enter room '{room_name}' that does not exist")

    async def send_room_list(self, websocket):
        room_list = [
            {"name": room.name, "userCount": len(room.users), "game": room.game_engine.game_name()} for room in self.rooms
        ]
        await websocket.send(json.dumps({"type": "rooms", "data": room_list}))
        logger.debug(f"Sent room list to {websocket.remote_address}: {room_list}")

    async def create_room(self, websocket, room_name, game_type):
        if self.room_by_name(room_name):
            await websocket.send(
                json.dumps({"type": "error", "message": "Room already exists."})
            )
            logger.warning(f"Failed to create room (already exists): {room_name}")
        else:
            game_engine = (
                ChatGameEngine() if game_type == "chat" else PokerGameEngine()
            )  # Change this line if you have other game engines
            new_room = Room(name=room_name, game_engine=game_engine)
            self.rooms.append(new_room)

            # add useer to the newly created room
            await self.user_change_room(websocket, new_room)

    async def log_everything_forever(self, interval=30):
        def describeOrNone(room):
            if room:
                return room.describe()
            else:
                return None

        while True:
            logger.info("---- Logging everything ----------------------------")
            rooms = pprint.pformat(list(map(lambda rm: rm.describe(), self.rooms)))
            logger.info("Rooms:" + rooms)
            users = pprint.pformat(
                {
                    key.remote_address: describeOrNone(value)
                    for key, value in self.userRoomMapping.items()
                }
            )
            logger.info("Users: " + users)
            info = pprint.pformat(
                {
                    key.remote_address: pprint.pformat(value)
                    for key, value in self.userInfoMapping.items()
                }
            )
            logger.info("UserInfo: " + info)
            logger.info("---- ---- ---- ---- --- ----------------------------")
            await asyncio.sleep(interval)


async def main():
    server = WebSocketServer()
    start_server = websockets.serve(server.handle_connection, "localhost", 8765)

    logger.debug("WebSocket server running at ws://localhost:8765/")
    await asyncio.gather(start_server, server.log_everything_forever())

    # Keep the server running
    await asyncio.Event().wait()


if __name__ == "__main__":
    asyncio.run(main())
