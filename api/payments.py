import json
from datetime import datetime

from bson.objectid import ObjectId
from flask import Blueprint, request, g

from db import payments
from utils import api_response, require_roles

payments_bp = Blueprint("payments_bp", __name__)

VALID_CURRENCIES = ["GBP", "USD", "EUR"]
VALID_ATTEMPT_PROVIDERS = ["Stripe", "PayPal", "Adyen"]
VALID_ATTEMPT_RESULTS = ["success", "failure"]
VALID_PAYMENT_STATUS = ["success", "pending", "failed"]
FINANCE_FORBIDDEN_UPDATE_FIELDS = {
    "merchant",
    "payment_type",
    "amount_minor",
    "currency",
    "region",
    "customer_details",
    "initiated_at",
}

def build_query():
    query = {}


    if g.user["role"] == "merchant":
        query["created_by"] = g.user["email"]


    status = request.args.get("status")
    if status in VALID_PAYMENT_STATUS:
        query["status"] = status

  
    date_from = request.args.get("from")
    date_to = request.args.get("to")

    if date_from or date_to:
        query["initiated_at"] = {}

        if date_from:
            query["initiated_at"]["$gte"] = date_from

        if date_to:
            query["initiated_at"]["$lte"] = date_to

    return query


def parse_json_field(field_name):
    raw = request.form.get(field_name)
    if not raw:
        return None, None
    try:
        return json.loads(raw), None
    except:
        return None, api_response(message=f"Invalid {field_name} JSON", status=400)


def parse_customer_details():
    data, err = parse_json_field("customer_details")
    if err:
        return None, err

    if data:
        if not isinstance(data, dict):
            return None, api_response(message="customer_details must be object", status=400)

        return {
            "name": str(data.get("name", "")).strip(),
            "email": str(data.get("email", "")).strip(),
            "country": str(data.get("country", "")).strip(),
        }, None

    return {
        "name": request.form.get("customer_name", "").strip(),
        "email": request.form.get("customer_email", "").strip(),
        "country": request.form.get("customer_country", "").strip(),
    }, None


def parse_provider_attempts():
    data, err = parse_json_field("provider_attempts")
    if err:
        return None, err

    if data is None:
        return None, None

    if not isinstance(data, list):
        return None, api_response(message="provider_attempts must be array", status=400)

    parsed = []

    for attempt in data:
        if not isinstance(attempt, dict):
            return None, api_response(message="Invalid provider attempt", status=400)

        provider = attempt.get("provider")
        result = attempt.get("result")
        latency = attempt.get("latency_ms")

        if provider not in VALID_ATTEMPT_PROVIDERS:
            return None, api_response(message="Invalid provider", status=400)

        if result not in VALID_ATTEMPT_RESULTS:
            return None, api_response(message="Invalid result", status=400)

        try:
            latency = int(latency)
            if latency < 0:
                raise ValueError
        except:
            return None, api_response(message="Invalid latency", status=400)

        parsed.append({
            "provider": provider,
            "result": result,
            "latency_ms": latency
        })

    return parsed, None

@payments_bp.route("/payments", methods=["GET"])
def get_payments():
    err = require_roles(["admin", "merchant", "finance"])
    if err:
        return err

    page = max(1, int(request.args.get("page", 1)))
    limit = max(1, min(100, int(request.args.get("limit", 5))))
    skip = (page - 1) * limit

    query = build_query()

    total = payments.count_documents(query)

    items = []
    for doc in payments.find(query).skip(skip).limit(limit):
        doc["_id"] = str(doc["_id"])
        items.append(doc)

    return api_response(data={
        "payments": items,
        "page": page,
        "limit": limit,
        "total": total
    })


@payments_bp.route("/payments", methods=["POST"])
def add_payment():
    err = require_roles(["admin", "merchant"])
    if err:
        return err

    email = g.user["email"]

    merchant = request.form.get("merchant")
    payment_type = request.form.get("payment_type")
    currency = request.form.get("currency")
    region = request.form.get("region")

    try:
        amount = int(request.form.get("amount_minor", 0))
        if amount <= 0:
            raise ValueError
    except:
        return api_response(message="Invalid amount", status=400)

    if not all([merchant, payment_type, currency, region]):
        return api_response(message="Missing fields", status=400)

    if currency not in VALID_CURRENCIES:
        return api_response(message="Invalid currency", status=400)

    customer, err = parse_customer_details()
    if err:
        return err

    attempts, err = parse_provider_attempts()
    if err:
        return err

    payments.insert_one({
        "merchant": merchant.strip(),
        "payment_type": payment_type.strip(),
        "amount_minor": amount,
        "currency": currency,
        "region": region.strip(),
        "status": "pending",
        "created_by": email,
        "initiated_at": datetime.utcnow().isoformat(),
        "customer_details": customer,
        "provider_attempts": attempts or []
    })

    return api_response(message="Payment created", status=201)


@payments_bp.route("/payments/<id>", methods=["PUT"])
def update_payment(id):
    err = require_roles(["admin", "finance", "merchant"])
    if err:
        return err

    role = g.user["role"]

    if role == "merchant":
        return api_response(message="Access denied", status=403)

    if role == "finance":
        attempted_fields = set(request.form.keys())
        if attempted_fields & FINANCE_FORBIDDEN_UPDATE_FIELDS:
            return api_response(message="Access denied", status=403)

    try:
        oid = ObjectId(id)
    except:
        return api_response(message="Invalid ID", status=400)

    update = {}

    if role == "admin":
        if "merchant" in request.form:
            merchant = request.form.get("merchant", "").strip()
            if not merchant:
                return api_response(message="Invalid merchant", status=400)
            update["merchant"] = merchant

        if "payment_type" in request.form:
            payment_type = request.form.get("payment_type", "").strip()
            if not payment_type:
                return api_response(message="Invalid payment type", status=400)
            update["payment_type"] = payment_type

        if "amount_minor" in request.form:
            try:
                amount = int(request.form.get("amount_minor", 0))
                if amount <= 0:
                    raise ValueError
            except:
                return api_response(message="Invalid amount", status=400)
            update["amount_minor"] = amount

        if "currency" in request.form:
            currency = request.form.get("currency")
            if currency not in VALID_CURRENCIES:
                return api_response(message="Invalid currency", status=400)
            update["currency"] = currency

        if "region" in request.form:
            region = request.form.get("region", "").strip()
            if not region:
                return api_response(message="Invalid region", status=400)
            update["region"] = region

        if "initiated_at" in request.form:
            initiated_at = request.form.get("initiated_at", "").strip()
            if not initiated_at:
                return api_response(message="Invalid initiated_at", status=400)
            update["initiated_at"] = initiated_at

        if "customer_details" in request.form:
            customer, err = parse_customer_details()
            if err:
                return err
            update["customer_details"] = customer

    if "status" in request.form:
        status = request.form.get("status")
        if status not in VALID_PAYMENT_STATUS:
            return api_response(message="Invalid status", status=400)
        update["status"] = status

    attempts, err = parse_provider_attempts()
    if err:
        return err

    if attempts is not None:
        existing = payments.find_one({"_id": oid}, {"provider_attempts": 1})
        current = existing.get("provider_attempts", []) if existing else []
        update["provider_attempts"] = current + attempts

    if not update:
        return api_response(message="No fields to update", status=400)

    res = payments.update_one({"_id": oid}, {"$set": update})

    if res.matched_count == 0:
        return api_response(message="Not found", status=404)

    return api_response(message="Updated")


@payments_bp.route("/payments/<id>", methods=["DELETE"])
def delete_payment(id):
    err = require_roles(["admin"])
    if err:
        return err

    try:
        oid = ObjectId(id)
    except:
        return api_response(message="Invalid ID", status=400)

    res = payments.delete_one({"_id": oid})

    if res.deleted_count == 0:
        return api_response(message="Not found", status=404)

    return api_response(message="Deleted")

@payments_bp.route("/analytics/payment-volume", methods=["GET"])
def payment_volume():
    err = require_roles(["admin", "finance", "merchant"])
    if err:
        return err

    match = build_query()

    result = list(payments.aggregate([
        {"$match": match},
        {"$group": {"_id": "$currency", "total_volume": {"$sum": "$amount_minor"}}},
        {"$project": {"_id": 0, "currency": "$_id", "total_volume": 1}}
    ]))

    return api_response(data=result)


@payments_bp.route("/analytics/provider-latency", methods=["GET"])
def provider_latency():
    err = require_roles(["admin", "finance", "merchant"])
    if err:
        return err

    match = build_query()

    result = list(payments.aggregate([
        {"$match": match},
        {"$unwind": "$provider_attempts"},
        {
            "$group": {
                "_id": "$provider_attempts.provider",
                "average_latency_ms": {"$avg": "$provider_attempts.latency_ms"}
            }
        },
        {"$project": {"_id": 0, "provider": "$_id", "average_latency_ms": 1}}
    ]))

    return api_response(data=result)


@payments_bp.route("/analytics/payment-status", methods=["GET"])
def payment_status():
    err = require_roles(["admin", "finance", "merchant"])
    if err:
        return err

    match = build_query()

    result = list(payments.aggregate([
        {"$match": match},
        {"$group": {"_id": "$status", "count": {"$sum": 1}}},
        {"$project": {"_id": 0, "status": "$_id", "count": 1}}
    ]))

    return api_response(data=result)
