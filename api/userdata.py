from db import users
import bcrypt

VALID_ROLES = ["admin", "merchant", "finance"]

users_data = [
    {"email": "arjun@payments.com", "password": "pass123", "role": "merchant"},
    {"email": "honey@payments.com", "password": "pass123", "role": "merchant"},
    {"email": "parth@payments.com", "password": "admin123", "role": "admin"},
    {"email": "montu@payments.com", "password": "finance123", "role": "finance"}
]

clean_users = []

for user in users_data:

    
    if user["role"] not in VALID_ROLES:
        continue

    
    if users.find_one({"email": user["email"]}):
        continue

    hashed_password = bcrypt.hashpw(
        user["password"].encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")  

    clean_users.append({
        "email": user["email"],
        "password": hashed_password,
        "role": user["role"]
    })

if clean_users:
    users.insert_many(clean_users)
    print("Users inserted successfully")
else:
    print("No new users inserted")