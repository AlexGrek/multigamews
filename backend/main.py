import asyncio
import websockets
import json
import logging
from game_engine import ChatGameEngine, GameEngine
from dataclasses import dataclass

# Set the default log level to "info"
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class UserInfo:
    name: str
    gender: int = 0  # 0 for unknown, -1 for male, 1 for female
    avatar: str = ""


class Room:
    def __init__(self, name, game_engine):
        self.name = name
        self.users = {}  # Use a dictionary to store user information
        self.game_engine = game_engine

    async def send_game_message(self, message):
        await self.game_engine.handle_message(self, message)

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



class WebSocketServer:
    def __init__(self):
        self.rooms = {}

    async def handle_connection(self, websocket, path):
        logger.info(f"Connection established: {websocket.remote_address}")

        try:
            async for message in websocket:
                logger.info(
                    f"Received message from {websocket.remote_address}: {message}"
                )
                data = json.loads(message)

                message_type = data.get("type")
                if message_type == "init":
                    await self.handle_init_command(websocket, data)
                elif message_type == "game":
                    await self.handle_game_command(websocket, data)
        except websockets.exceptions.ConnectionClosedError:
            logger.info(f"Connection closed: {websocket.remote_address}")
            await self.remove_user(websocket)

    async def handle_init_command(self, websocket, data):
        command = data.get("command")
        if command == "create":
            await self.create_room(
                websocket, data.get("name"), data.get("game", "chat")
            )
        elif command == "enter":
            await self.enter_room(websocket, data.get("name"))
        elif command == "list":
            await self.send_room_list(websocket)
        elif command == "change_info":
            await self.change_user_info(websocket, data)
        elif command == "get_user_info":
            await self.get_user_info(websocket)

    async def handle_game_command(self, websocket, data):
        room = self.find_user_room(websocket)
        if room:
            game_engine_data = data.get("data")
            if game_engine_data:
                await room.send_game_message(game_engine_data)
        else:
            logger.warning(f"User {websocket.remote_address} is not in any room.")

    async def change_user_info(self, websocket, data):
        room = self.find_user_room(websocket)
        if room:
            user_info = room.users.get(websocket)
            if user_info:
                new_name = data.get("name")
                new_gender = data.get("gender", user_info.gender)
                new_avatar = data.get("avatar", user_info.avatar)

                room.users[websocket] = UserInfo(
                    name=new_name, gender=new_gender, avatar=new_avatar
                )
                await self.send_user_list(room)
                logger.debug(
                    f"User {websocket.remote_address} changed their info: {room.users[websocket]}"
                )
            else:
                logger.warning(f"User {websocket.remote_address} not found in room.")
        else:
            logger.warning(f"User {websocket.remote_address} is not in any room.")

    async def get_user_info(self, websocket):
        room = self.find_user_room(websocket)
        if room:
            user_info = room.users.get(websocket)
            if user_info:
                await websocket.send(
                    json.dumps(
                        {
                            "type": "user_info",
                            "data": {
                                "name": user_info.name,
                                "gender": user_info.gender,
                                "avatar": user_info.avatar,
                            },
                        }
                    )
                )
            else:
                logger.warning(f"User {websocket.remote_address} not found in room.")
        else:
            logger.warning(f"User {websocket.remote_address} is not in any room.")

    async def enter_room(self, websocket, room_name):
        # Remove the user from any existing room
        await self.remove_user(websocket)

        room = self.rooms.get(room_name)
        if room:
            room.users[websocket] = UserInfo(name=f"User{len(room.users) + 1}")
            await self.send_user_list(room)
            await self.send_room_list(websocket)
            await room.notify_user_list_change()
            logger.debug(f"User entered room: {room_name}")
        else:
            await websocket.send(
                json.dumps({"type": "error", "message": "Room does not exist."})
            )
            logger.warning(f"Failed to enter room (does not exist): {room_name}")

    async def send_user_list(self, room):
        user_list = [
            {
                "name": user_info.name,
                "gender": user_info.gender,
                "avatar": user_info.avatar,
            }
            for user_info in room.users.values()
        ]
        await asyncio.gather(
            *(
                user.send(json.dumps({"type": "user_list", "data": user_list}))
                for user in room.users
            )
        )

    async def send_room_list(self, websocket):
        # Check and delete empty rooms
        empty_rooms = [
            room_name for room_name, room in self.rooms.items() if not room.users
        ]
        for empty_room in empty_rooms:
            del self.rooms[empty_room]
            logger.debug(f"Room deleted (empty): {empty_room}")

        room_list = [
            {"name": room.name, "userCount": len(room.users)}
            for room in self.rooms.values()
        ]
        await websocket.send(json.dumps({"type": "rooms", "data": room_list}))
        logger.debug(f"Sent room list to {websocket.remote_address}: {room_list}")

    def find_user_room(self, websocket):
        for room in self.rooms.values():
            if websocket in room.users:
                return room
        return None

    async def remove_user(self, websocket):
        room = self.find_user_room(websocket)
        if room:
            del room.users[websocket]
            logger.debug(
                f"User {websocket.remote_address} removed from room: {room.name}"
            )

            # Notify other users in the room about the user removal
            await room.notify_user_list_change()

            # Check if the room is empty and delete it if needed
            if not room.users:
                del self.rooms[room.name]
                logger.debug(f"Room deleted (empty): {room.name}")

            await self.send_room_list(websocket)

    async def create_room(self, websocket, room_name, game_type):
        if room_name in self.rooms:
            await websocket.send(
                json.dumps({"type": "error", "message": "Room already exists."})
            )
            logger.debug(f"Failed to create room (already exists): {room_name}")
        else:
            game_engine = (
                ChatGameEngine()
            )  # Change this line if you have other game engines
            new_room = Room(name=room_name, game_engine=game_engine)
            self.rooms[room_name] = new_room

            # Add the user to the room
            new_room.users[websocket] = UserInfo(name=f"User1")

            await websocket.send(
                json.dumps(
                    {"type": "rooms", "data": [{"name": room_name, "userCount": 1}]}
                )
            )
            logger.debug(f"Room created: {room_name}")

            await self.send_room_list(websocket)


async def main():
    server = WebSocketServer()
    start_server = websockets.serve(server.handle_connection, "localhost", 8765)

    logger.debug("WebSocket server running at ws://localhost:8765/")
    await start_server

    # Keep the server running
    await asyncio.Event().wait()


if __name__ == "__main__":
    asyncio.run(main())