import re

from flask import Blueprint, g, request
from db import payments, users
from utils import api_response, generate_jwt, require_roles
import bcrypt

auth_bp = Blueprint("auth_bp", __name__)

VALID_ROLES = ["admin", "merchant", "finance"]


def validate_password_strength(password):
    if len(password) < 8:
        return "Password must be at least 8 characters"

    if not re.search(r"[A-Z]", password):
        return "Password must include at least one uppercase letter"

    if not re.search(r"[a-z]", password):
        return "Password must include at least one lowercase letter"

    if not re.search(r"\d", password):
        return "Password must include at least one number"

    if not re.search(r"[^A-Za-z0-9]", password):
        return "Password must include at least one special character"

    return None


@auth_bp.route("/auth/register", methods=["POST"])
def register():
    email = request.form.get("email")
    password = request.form.get("password")
    role = request.form.get("role", "merchant")

    if not email or not password:
        return api_response(message="Missing required fields", status=400)

    if role not in VALID_ROLES:
        return api_response(message="Invalid role", status=400)

    password_error = validate_password_strength(password)
    if password_error:
        return api_response(message=password_error, status=400)

    if users.find_one({"email": email}):
        return api_response(message="User already exists", status=400)

    hashed_password = bcrypt.hashpw(
        password.encode("utf-8"),
        bcrypt.gensalt()
    ).decode("utf-8")

    users.insert_one({
        "email": email,
        "password": hashed_password,
        "role": role
    })

    return api_response(message="User registered", status=201)


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
            "token": generate_jwt(user["email"], user["role"]),
        },
        message="Login successful",
    )


@auth_bp.route("/me", methods=["DELETE"])
def delete_me():
    err = require_roles(["merchant"])
    if err:
        return err

    email = g.user.get("email")
    if not email:
        return api_response(message="Authenticated email required", status=403)

    users.delete_one({"email": email})
    payments.delete_many({"created_by": email})

    return api_response(message="Account deleted")
