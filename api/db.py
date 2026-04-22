from pymongo import MongoClient

client = MongoClient("mongodb://localhost:27017/")
db = client["payment_engine"]
payments = db["payments"]
users = db["users"]