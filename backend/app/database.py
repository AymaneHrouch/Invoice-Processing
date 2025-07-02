import os

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

load_dotenv()

MONGO_URL = os.getenv("MONGO_URL", "mongodb://localhost:27018")
DB_NAME = "voynich_quotes"

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

quotes_collection = db["quotes"]
authors_collection = db["authors"]
tags_collection = db["tags"]
