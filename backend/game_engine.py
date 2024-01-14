import json
import logging
from dataclasses import dataclass

# Set the default log level to "debug"
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

@dataclass
class UserInfo:
    name: str
    gender: int = 0  # 0 for unknown, -1 for male, 1 for female
    avatar: str = ""

class GameEngine:
    async def handle_message(self, room, message):
        raise NotImplementedError("Subclasses must implement this method.")

class ChatGameEngine(GameEngine):
    async def handle_message(self, room, message):
        if message.get('type') == 'chat':
            text = message.get('text')
            if text:
                for user in room.users:
                    await user.send(json.dumps({"type": "game", "data": {"type": "chat", "text": f"{user.remote_address}: {text}"}}))
