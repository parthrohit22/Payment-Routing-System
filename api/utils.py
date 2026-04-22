from flask import jsonify, make_response, request


def api_response(data=None, message=None, status=200):
    response = {}

    if message:
        response["message"] = message

    if data is not None:
        response["data"] = data

    return make_response(jsonify(response), status)

from flask import jsonify, make_response, request


# ---------------------------
# STANDARD API RESPONSE
# ---------------------------
def api_response(data=None, message=None, status=200):
    response = {
        "status": status
    }

    if message:
        response["message"] = message

    if data is not None:
        response["data"] = data

    return make_response(jsonify(response), status)



def require_roles(allowed_roles):
    role = request.headers.get("Role")

    if not role:
        return api_response(
            message="Role header is required",
            status=403
        )

    
    role = role.lower()

    if role not in [r.lower() for r in allowed_roles]:
        return api_response(
            message="Access denied",
            status=403
        )

    return None
def require_roles(allowed_roles):
    role = request.headers.get("Role")

    if not role:
        return api_response(message="Role header is required", status=403)

    if role not in allowed_roles:
        return api_response(message="Access denied", status=403)

    return None