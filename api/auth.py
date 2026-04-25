from flask import Blueprint, request
from db import users
from utils import api_response, generate_jwt
import bcrypt

auth_bp = Blueprint("auth_bp", __name__)

VALID_ROLES = ["admin", "merchant", "finance"]



@auth_bp.route("/auth/register", methods=["POST"])
def register():

    email = request.form.get("email")
    password = request.form.get("password")
    role = request.form.get("role", "merchant")

    if not email or not password:
        return api_response(message="Missing required fields", status=400)

    if role not in VALID_ROLES:
        return api_response(message="Invalid role", status=400)

   
    if users.find_one({"email": email}):
        return api_response(message="User already exists", status=400)

    
    hashed_password = bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8") 

    new_user = {
        "email": email,
        "password": hashed_password,
        "role": role
    }

    users.insert_one(new_user)

    return api_response(
        message="User registered successfully",
        status=201
    )


@auth_bp.route("/auth/login", methods=["POST"])
def login():

    email = request.form.get("email")
    password = request.form.get("password")

    if not email or not password:
        return api_response(message="Missing credentials", status=400)

    user = users.find_one({"email": email})

    if not user:
        return api_response(message="Invalid credentials", status=401)

   
    if not bcrypt.checkpw(
        password.encode("utf-8"),
        user["password"].encode("utf-8")
    ):
        return api_response(message="Invalid credentials", status=401)

    return api_response(
        data={
            "email": user["email"],
            "role": user["role"],
            "token": generate_jwt(user["email"], user["role"])
        },
        message="Login successful",
        status=200
    )
