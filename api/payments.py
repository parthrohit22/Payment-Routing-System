from flask import Blueprint, request
from bson.objectid import ObjectId
from datetime import datetime
from db import payments
from utils import api_response, require_roles

payments_bp = Blueprint("payments_bp", __name__)



@payments_bp.route("/payments", methods=["GET"])
def get_payments():
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

    merchant = request.form.get("merchant")
    payment_type = request.form.get("payment_type")
    amount_minor = request.form.get("amount_minor")
    currency = request.form.get("currency")
    region = request.form.get("region")
    status = request.form.get("status")

   
    customer_name = request.form.get("customer_name")
    customer_email = request.form.get("customer_email")
    customer_country = request.form.get("customer_country")


    if not merchant or not payment_type or not amount_minor or not currency or not region or not status:
        return api_response(message="Missing required fields", status=400)

    try:
        amount_minor = int(amount_minor)
    except:
        return api_response(message="Amount must be a number", status=400)

    valid_currencies = ["GBP", "USD", "EUR"]
    if currency not in valid_currencies:
        return api_response(message="Invalid currency", status=400)

    
    customer_details = {}
    if customer_name:
        customer_details["name"] = customer_name
    if customer_email:
        customer_details["email"] = customer_email
    if customer_country:
        customer_details["country"] = customer_country

    new_payment = {
        "merchant": merchant,
        "payment_type": payment_type,
        "amount_minor": amount_minor,
        "currency": currency,
        "region": region,
        "initiated_at": datetime.utcnow().isoformat(),
        "status": status,
        "customer_details": customer_details,
        "provider_attempts": []   # IMPORTANT for analytics
    }

    payments.insert_one(new_payment)

    return api_response(message="Payment added", status=201)



@payments_bp.route("/payments/<id>", methods=["PUT"])
def update_payment(id):

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


    customer_name = request.form.get("customer_name")
    customer_email = request.form.get("customer_email")
    customer_country = request.form.get("customer_country")

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
        valid_currencies = ["GBP", "USD", "EUR"]
        if currency not in valid_currencies:
            return api_response(message="Invalid currency", status=400)
        updated_payment["currency"] = currency

    if region:
        updated_payment["region"] = region

    if status:
        updated_payment["status"] = status

    if customer_name:
        updated_payment["customer_details.name"] = customer_name

    if customer_email:
        updated_payment["customer_details.email"] = customer_email

    if customer_country:
        updated_payment["customer_details.country"] = customer_country

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