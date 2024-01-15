import json
import logging
from dataclasses import asdict, dataclass

# Set the default log level to "debug"
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

@dataclass
class UserInfo:
    name: str
    gender: int = 0  # 0 for unknown, -1 for male, 1 for female
    avatar: str = ""

class GameEngine:
    async def handle_message(self, room, websocket, message, userinfo):
        raise NotImplementedError("Subclasses must implement this method.")
    
    def game_name(self):
        return None

class ChatGameEngine(GameEngine):
    def game_name(self):
        return "chat"
    
    def userinfo_to_dict(self, userinfo):
        if userinfo is None:
            return None
        return asdict(userinfo)
     
    async def handle_message(self, room, websocket, message, userinfo):
        if message.get('type') == 'chat':
            text = message.get('text')
            if text:
                for user in room.users:
                    await user.send(json.dumps({"type": "game", "data": {"type": "chat", "sender": self.userinfo_to_dict(userinfo), "text": f"{text}"}}))
