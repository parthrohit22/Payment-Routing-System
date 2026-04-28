import unittest
from copy import deepcopy
from types import SimpleNamespace
from unittest.mock import patch

from bson.objectid import ObjectId

import auth
import db
import payments as payments_module
import utils
from app import app
from utils import generate_jwt


class FakeCollection:
    def __init__(self, documents=None):
        self.documents = [deepcopy(document) for document in documents or []]

    def find_one(self, query, projection=None):
        for document in self.documents:
            if self._matches(document, query):
                if projection:
                    return {key: document[key] for key in projection if key in document}
                return deepcopy(document)
        return None

    def delete_one(self, query):
        for index, document in enumerate(self.documents):
            if self._matches(document, query):
                del self.documents[index]
                return SimpleNamespace(deleted_count=1)
        return SimpleNamespace(deleted_count=0)

    def insert_one(self, document):
        stored = deepcopy(document)
        stored.setdefault("_id", ObjectId())
        self.documents.append(stored)
        return SimpleNamespace(inserted_id=stored["_id"])

    def delete_many(self, query):
        before = len(self.documents)
        self.documents = [document for document in self.documents if not self._matches(document, query)]
        return SimpleNamespace(deleted_count=before - len(self.documents))

    def update_one(self, query, update):
        for document in self.documents:
            if self._matches(document, query):
                document.update(update.get("$set", {}))
                return SimpleNamespace(matched_count=1)
        return SimpleNamespace(matched_count=0)

    def _matches(self, document, query):
        return all(document.get(key) == value for key, value in query.items())


class SecurityTestCase(unittest.TestCase):
    def setUp(self):
        self.payment_id = ObjectId()
        self.users = FakeCollection(
            [
                {"email": "merchant@test.com", "role": "merchant"},
                {"email": "admin@test.com", "role": "admin"},
                {"email": "finance@test.com", "role": "finance"},
            ]
        )
        self.payments = FakeCollection(
            [
                {
                    "_id": self.payment_id,
                    "merchant": "Merchant One",
                    "payment_type": "card",
                    "amount_minor": 1000,
                    "currency": "GBP",
                    "region": "UK",
                    "status": "pending",
                    "created_by": "merchant@test.com",
                    "initiated_at": "2026-01-01T10:00:00",
                    "customer_details": {
                        "name": "Ava",
                        "email": "ava@test.com",
                        "country": "UK",
                    },
                    "provider_attempts": [
                        {"provider": "Stripe", "result": "failure", "latency_ms": 310}
                    ],
                },
                {
                    "_id": ObjectId(),
                    "merchant": "Other Merchant",
                    "created_by": "other@test.com",
                },
            ]
        )
        self.patches = [
            patch.object(utils, "JWT_SECRET", "payment-routing-test-secret-with-safe-length"),
            patch.object(auth, "users", self.users),
            patch.object(auth, "payments", self.payments),
            patch.object(payments_module, "payments", self.payments),
        ]
        for active_patch in self.patches:
            active_patch.start()

        app.config.update(TESTING=True)
        self.client = app.test_client()

    def tearDown(self):
        for active_patch in reversed(self.patches):
            active_patch.stop()

    def token(self, email, role):
        return generate_jwt(email, role)

    def headers(self, email, role):
        return {"Authorization": f"Bearer {self.token(email, role)}"}

    def test_password_strength_validation(self):
        cases = [
            ("Short1!", "at least 8 characters"),
            ("lowercase1!", "uppercase"),
            ("UPPERCASE1!", "lowercase"),
            ("NoNumber!", "number"),
            ("NoSpecial1", "special"),
        ]

        for password, expected_message in cases:
            with self.subTest(password=password):
                response = self.client.post(
                    "/auth/register",
                    data={"email": "new@test.com", "password": password, "role": "merchant"},
                )
                self.assertEqual(response.status_code, 400)
                self.assertIn(expected_message, response.get_json()["message"])

    def test_password_strength_accepts_valid_password(self):
        response = self.client.post(
            "/auth/register",
            data={"email": "strong@test.com", "password": "StrongPass1!", "role": "merchant"},
        )

        self.assertEqual(response.status_code, 201)

    def test_delete_me_deletes_user_and_created_payments(self):
        response = self.client.delete(
            "/me",
            headers=self.headers("merchant@test.com", "merchant"),
        )

        self.assertEqual(response.status_code, 200)
        self.assertIsNone(self.users.find_one({"email": "merchant@test.com"}))
        self.assertIsNone(self.payments.find_one({"created_by": "merchant@test.com"}))
        self.assertIsNotNone(self.payments.find_one({"created_by": "other@test.com"}))

    def test_merchant_update_returns_forbidden(self):
        response = self.client.put(
            f"/payments/{self.payment_id}",
            data={"status": "success"},
            headers=self.headers("merchant@test.com", "merchant"),
        )

        self.assertEqual(response.status_code, 403)

    def test_finance_can_update_status_without_full_payload(self):
        response = self.client.put(
            f"/payments/{self.payment_id}",
            data={"status": "success"},
            headers=self.headers("finance@test.com", "finance"),
        )

        self.assertEqual(response.status_code, 200)
        payment = self.payments.find_one({"_id": self.payment_id})
        self.assertEqual(payment["status"], "success")

    def test_finance_can_append_provider_attempts(self):
        response = self.client.put(
            f"/payments/{self.payment_id}",
            data={
                "provider_attempts": (
                    '[{"provider":"PayPal","result":"success","latency_ms":180}]'
                )
            },
            headers=self.headers("finance@test.com", "finance"),
        )

        self.assertEqual(response.status_code, 200)
        payment = self.payments.find_one({"_id": self.payment_id})
        self.assertEqual(len(payment["provider_attempts"]), 2)
        self.assertEqual(payment["provider_attempts"][1]["provider"], "PayPal")

    def test_finance_cannot_update_core_fields(self):
        forbidden_fields = [
            "merchant",
            "payment_type",
            "amount_minor",
            "currency",
            "region",
            "customer_details",
            "initiated_at",
        ]

        for field in forbidden_fields:
            with self.subTest(field=field):
                response = self.client.put(
                    f"/payments/{self.payment_id}",
                    data={field: "blocked"},
                    headers=self.headers("finance@test.com", "finance"),
                )
                self.assertEqual(response.status_code, 403)

    def test_admin_can_update_core_fields(self):
        response = self.client.put(
            f"/payments/{self.payment_id}",
            data={
                "merchant": "Updated Merchant",
                "payment_type": "invoice",
                "amount_minor": "2500",
                "currency": "USD",
                "region": "US",
                "customer_details": (
                    '{"name":"Mia","email":"mia@test.com","country":"US"}'
                ),
                "status": "success",
            },
            headers=self.headers("admin@test.com", "admin"),
        )

        self.assertEqual(response.status_code, 200)
        payment = self.payments.find_one({"_id": self.payment_id})
        self.assertEqual(payment["merchant"], "Updated Merchant")
        self.assertEqual(payment["amount_minor"], 2500)
        self.assertEqual(payment["currency"], "USD")
        self.assertEqual(payment["customer_details"]["email"], "mia@test.com")


if __name__ == "__main__":
    unittest.main()


def tearDownModule():
    db.client.close()
