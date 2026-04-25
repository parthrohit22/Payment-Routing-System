import json
from flask import Blueprint, request
from bson.objectid import ObjectId
from datetime import datetime
from db import payments
from utils import api_response, require_roles

payments_bp = Blueprint("payments_bp", __name__)


VALID_CURRENCIES = ["GBP", "USD", "EUR"]
VALID_ATTEMPT_PROVIDERS = ["Stripe", "PayPal", "Adyen"]
VALID_ATTEMPT_RESULTS = ["success", "failure"]


def parse_customer_details():
    raw_customer_details = request.form.get("customer_details")
    if raw_customer_details is not None:
        try:
            customer_details = json.loads(raw_customer_details)
        except json.JSONDecodeError:
            return None, api_response(message="Invalid customer_details JSON", status=400)

        if not isinstance(customer_details, dict):
            return None, api_response(message="customer_details must be an object", status=400)

        return {
            "name": str(customer_details.get("name", "")).strip(),
            "email": str(customer_details.get("email", "")).strip(),
            "country": str(customer_details.get("country", "")).strip()
        }, None

    return {
        "name": request.form.get("customer_name", "").strip(),
        "email": request.form.get("customer_email", "").strip(),
        "country": request.form.get("customer_country", "").strip()
    }, None


def parse_provider_attempts():
    raw_provider_attempts = request.form.get("provider_attempts")
    if raw_provider_attempts is None:
        return None, None

    try:
        provider_attempts = json.loads(raw_provider_attempts)
    except json.JSONDecodeError:
        return None, api_response(message="Invalid provider_attempts JSON", status=400)

    if not isinstance(provider_attempts, list):
        return None, api_response(message="provider_attempts must be an array", status=400)

    parsed_attempts = []
    for attempt in provider_attempts:
        if not isinstance(attempt, dict):
            return None, api_response(message="Each provider attempt must be an object", status=400)

        provider = str(attempt.get("provider", "")).strip()
        result = str(attempt.get("result", "")).strip()
        latency_ms = attempt.get("latency_ms")

        if provider not in VALID_ATTEMPT_PROVIDERS:
            return None, api_response(message="Invalid provider", status=400)

        if result not in VALID_ATTEMPT_RESULTS:
            return None, api_response(message="Invalid provider attempt result", status=400)

        try:
            latency_ms = int(latency_ms)
        except (TypeError, ValueError):
            return None, api_response(message="Latency must be a number", status=400)

        if latency_ms < 0:
            return None, api_response(message="Latency must be zero or greater", status=400)

        parsed_attempts.append({
            "provider": provider,
            "result": result,
            "latency_ms": latency_ms
        })

    return parsed_attempts, None



@payments_bp.route("/payments", methods=["GET"])
def get_payments():
    role_check = require_roles(["admin", "merchant"])
    if role_check:
        return role_check

    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 5))

    skip = (page - 1) * limit
    total = payments.count_documents({})

    result = []
    for payment in payments.find().skip(skip).limit(limit):
        payment["_id"] = str(payment["_id"])
        result.append(payment)

    return api_response(
        data={
            "payments": result,
            "page": page,
            "limit": limit,
            "total": total
        }
    )


@payments_bp.route("/payments", methods=["POST"])
def add_payment():
    role_check = require_roles(["admin", "merchant"])
    if role_check:
        return role_check

    merchant = request.form.get("merchant")
    payment_type = request.form.get("payment_type")
    amount_minor = request.form.get("amount_minor")
    currency = request.form.get("currency")
    region = request.form.get("region")
    status = request.form.get("status")

   
    if not merchant or not payment_type or not amount_minor or not currency or not region or not status:
        return api_response(message="Missing required fields", status=400)

    try:
        amount_minor = int(amount_minor)
    except:
        return api_response(message="Amount must be a number", status=400)

    if currency not in VALID_CURRENCIES:
        return api_response(message="Invalid currency", status=400)

    customer_details, customer_error = parse_customer_details()
    if customer_error:
        return customer_error

    provider_attempts, attempts_error = parse_provider_attempts()
    if attempts_error:
        return attempts_error

    new_payment = {
        "merchant": merchant,
        "payment_type": payment_type,
        "amount_minor": amount_minor,
        "currency": currency,
        "region": region,
        "initiated_at": datetime.utcnow().isoformat(),
        "status": status,
        "customer_details": customer_details,
        "provider_attempts": provider_attempts or []
    }

    payments.insert_one(new_payment)

    return api_response(message="Payment added", status=201)



@payments_bp.route("/payments/<id>", methods=["PUT"])
def update_payment(id):
    role_check = require_roles(["admin"])
    if role_check:
        return role_check

    try:
        payment_id = ObjectId(id)
    except:
        return api_response(message="Invalid payment ID", status=400)

    merchant = request.form.get("merchant")
    payment_type = request.form.get("payment_type")
    amount_minor = request.form.get("amount_minor")
    currency = request.form.get("currency")
    region = request.form.get("region")
    status = request.form.get("status")


    updated_payment = {}

    if merchant:
        updated_payment["merchant"] = merchant

    if payment_type:
        updated_payment["payment_type"] = payment_type

    if amount_minor:
        try:
            updated_payment["amount_minor"] = int(amount_minor)
        except:
            return api_response(message="Amount must be a number", status=400)

    if currency:
        if currency not in VALID_CURRENCIES:
            return api_response(message="Invalid currency", status=400)
        updated_payment["currency"] = currency

    if region:
        updated_payment["region"] = region

    if status:
        updated_payment["status"] = status

    if "customer_details" in request.form or any(
        field in request.form
        for field in ["customer_name", "customer_email", "customer_country"]
    ):
        customer_details, customer_error = parse_customer_details()
        if customer_error:
            return customer_error
        updated_payment["customer_details"] = customer_details

    if "provider_attempts" in request.form:
        provider_attempts, attempts_error = parse_provider_attempts()
        if attempts_error:
            return attempts_error
        updated_payment["provider_attempts"] = provider_attempts

    if not updated_payment:
        return api_response(message="No update fields provided", status=400)

    result = payments.update_one(
        {"_id": payment_id},
        {"$set": updated_payment}
    )

    if result.matched_count == 0:
        return api_response(message="Payment not found", status=404)

    return api_response(message="Payment updated successfully")



@payments_bp.route("/payments/<id>", methods=["DELETE"])
def delete_payment(id):

    role_check = require_roles(["admin"])
    if role_check:
        return role_check

    try:
        payment_id = ObjectId(id)
    except:
        return api_response(message="Invalid payment ID", status=400)

    result = payments.delete_one({"_id": payment_id})

    if result.deleted_count == 0:
        return api_response(message="Payment not found", status=404)

    return api_response(message="Payment deleted successfully")



@payments_bp.route("/payments/status/<status>", methods=["GET"])
def get_payments_by_status(status):
    role_check = require_roles(["admin", "merchant"])
    if role_check:
        return role_check

    result = []
    for payment in payments.find({"status": status}):
        payment["_id"] = str(payment["_id"])
        result.append(payment)

    return api_response(data=result)


@payments_bp.route("/analytics/payment-volume", methods=["GET"])
def payment_volume():

    role_check = require_roles(["admin", "finance"])
    if role_check:
        return role_check

    pipeline = [
        {"$group": {"_id": "$currency", "total_volume": {"$sum": "$amount_minor"}}},
        {"$project": {"_id": 0, "currency": "$_id", "total_volume": 1}}
    ]

    result = list(payments.aggregate(pipeline))
    return api_response(data=result)



@payments_bp.route("/analytics/provider-latency", methods=["GET"])
def provider_latency():

    role_check = require_roles(["admin", "finance"])
    if role_check:
        return role_check

    pipeline = [
        {"$unwind": "$provider_attempts"},
        {
            "$group": {
                "_id": "$provider_attempts.provider",
                "avg_latency": {"$avg": "$provider_attempts.latency_ms"}
            }
        },
        {
            "$project": {
                "_id": 0,
                "provider": "$_id",
                "average_latency_ms": "$avg_latency"
            }
        }
    ]

    result = list(payments.aggregate(pipeline))
    return api_response(data=result)


@payments_bp.route("/analytics/payment-status", methods=["GET"])
def payment_status():

    role_check = require_roles(["admin", "finance"])
    if role_check:
        return role_check

    pipeline = [
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
        {"$project": {"_id": 0, "status": "$_id", "count": 1}}
    ]

    result = list(payments.aggregate(pipeline))
    return api_response(data=result)
