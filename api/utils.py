import os
from datetime import datetime, timedelta, timezone

import jwt
from flask import jsonify, make_response, request

JWT_SECRET = os.getenv("JWT_SECRET", "payment-routing-secret")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_MINUTES = int(os.getenv("JWT_EXPIRY_MINUTES", "60"))


def api_response(data=None, message=None, status=200):
    response = {
        "status": status
    }

    if message:
        response["message"] = message

    if data is not None:
        response["data"] = data

    return make_response(jsonify(response), status)


def generate_jwt(email, role):
    now = datetime.now(timezone.utc)
    payload = {
        "sub": email,
        "role": role,
        "iat": now,
        "exp": now + timedelta(minutes=JWT_EXPIRY_MINUTES)
    }

    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_jwt(token):
    return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])


def get_request_identity():
    auth_header = request.headers.get("Authorization", "")

    if auth_header.startswith("Bearer "):
        token = auth_header.split(" ", 1)[1].strip()

        if not token:
            return None, api_response(message="Missing bearer token", status=401)

        try:
            payload = decode_jwt(token)
            return {
                "email": payload.get("sub"),
                "role": payload.get("role")
            }, None
        except jwt.ExpiredSignatureError:
            return None, api_response(message="Token expired", status=401)
        except jwt.InvalidTokenError:
            return None, api_response(message="Invalid token", status=401)

    role = request.headers.get("Role")
    if role:
        return {"email": None, "role": role}, None

    return None, api_response(
        message="Authorization token or Role header is required",
        status=403
    )


def require_roles(allowed_roles):
    identity, error = get_request_identity()

    if error:
        return error

    role = (identity.get("role") or "").lower()

    if role not in [allowed_role.lower() for allowed_role in allowed_roles]:
        return api_response(message="Access denied", status=403)

    return None
