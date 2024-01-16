import asyncio
from pathlib import Path
import random
import string

def generate_random_string(length=5):
    characters = string.ascii_letters + string.digits
    random_string = ''.join(random.choice(characters) for _ in range(length))
    return random_string


async def list_files(path):
    path = Path(path)
    return [str(entry) for entry in await asyncio.to_thread(list, filter(Path.is_file, path.iterdir()))]
