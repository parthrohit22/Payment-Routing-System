# API Endpoints

The Angular frontend communicates with the Flask API through `/api`, using `frontend/proxy.conf.json` during local development. Protected endpoints require a JWT bearer token. The Angular interceptor attaches the active session token, but Flask remains the authority for identity, role checks, merchant scoping, and mutation rules.

```http
Authorization: Bearer <jwt-token>
```

## Auth

### POST `/api/auth/login`

Authenticates a stored user and returns the session data Angular needs for guarded navigation and role-aware interface decisions.

JWT required: No

Request body:

```text
email=parth@payments.com
password=admin123
```

Response example:

```json
{
  "status": 200,
  "message": "Login successful",
  "data": {
    "email": "parth@payments.com",
    "role": "admin",
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

Frontend usage:

- `AuthService.login`
- login form
- session storage
- role-based landing route

### POST `/api/auth/register`

Registers a user account. The Angular registration page submits merchant registration, keeping self-service signup aligned with merchant-scoped access rather than privileged roles.

JWT required: No

Request body:

```text
email=newmerchant@example.com
password=pass123
role=merchant
```

Response example:

```json
{
  "status": 201,
  "message": "User registered"
}
```

Frontend usage:

- `AuthService.register`
- register form

### DELETE `/api/me`

Deletes the authenticated merchant account and removes payments created by that merchant account. This is account/profile deletion, not platform payment administration. Admin and finance users do not receive this control in the frontend and are rejected by the backend.

JWT required: Yes

Allowed backend role:

- merchant

Example request:

```http
DELETE /api/me
Authorization: Bearer <jwt-token>
```

Response example:

```json
{
  "status": 200,
  "message": "Account deleted"
}
```

Frontend usage:

- merchant-only app-shell account deletion
- confirmation dialog
- logout after successful deletion

## Payments

Payments are lifecycle records. The backend creates them as `pending`, scopes retrieval by role, validates allowed mutation fields, and stores provider attempts as routing history.

### GET `/api/payments`

Retrieves paginated payment records under the active user's role boundary. Admin and finance users receive platform-wide records. Merchants receive only records where `created_by` matches the authenticated email. Optional query parameters support backend filtering before pagination.

JWT required: Yes

Query parameters:

| Parameter | Example | Purpose |
| --- | --- | --- |
| `page` | `1` | Page number |
| `limit` | `5` | Number of records per page |
| `status` | `success` | Optional backend status filter |
| `from` | `2026-01-01` | Optional initiated date lower bound |
| `to` | `2026-01-31` | Optional initiated date upper bound |

Example request:

```http
GET /api/payments?page=1&limit=5
Authorization: Bearer <jwt-token>
```

Response example:

```json
{
  "status": 200,
  "data": {
    "payments": [
      {
        "_id": "65f1a7c4b2e8f4a91c0d2211",
        "merchant": "Spotify",
        "payment_type": "subscription",
        "amount_minor": 1299,
        "currency": "GBP",
        "region": "UK",
        "status": "success",
        "created_by": "arjun@payments.com",
        "initiated_at": "2026-01-03T10:00:00",
        "customer_details": {
          "name": "Ava Reed",
          "email": "ava.reed@example.com",
          "country": "UK"
        },
        "provider_attempts": [
          {
            "provider": "Stripe",
            "result": "success",
            "latency_ms": 142
          }
        ]
      }
    ],
    "page": 1,
    "limit": 5,
    "total": 1
  }
}
```

Frontend usage:

- `PaymentsService.fetchPayments`
- `PaymentsService.fetchAllPayments`
- dashboard metrics
- payments table
- filters, sorting and pagination

### POST `/api/payments`

Initiates a payment record. The backend sets `status` to `pending`, records the authenticated user's email as `created_by`, stores customer details, and accepts an initial `provider_attempts` array when supplied.

JWT required: Yes

Allowed frontend roles:

- admin
- merchant

Request body:

```text
merchant=Spotify
payment_type=subscription
amount_minor=1299
currency=GBP
region=UK
customer_details={"name":"Ava Reed","email":"ava.reed@example.com","country":"UK"}
provider_attempts=[]
```

Response example:

```json
{
  "status": 201,
  "message": "Payment created"
}
```

Frontend usage:

- `PaymentFormModalComponent`
- `PaymentsService.createPayment`
- create payment flow

### PUT `/api/payments/{id}`

Applies controlled payment lifecycle mutations. Merchant users are blocked from updates. Finance users can update status and append provider attempts, but cannot alter core payment/customer fields. Admin users can update core fields as well as status/provider attempts.

Provider attempts are appended to the existing array, preserving routing history rather than replacing it.

JWT required: Yes

Allowed backend roles:

- admin
- finance

Request body for status update:

```text
status=success
```

Request body for provider attempt:

```text
provider_attempts=[{"provider":"PayPal","result":"failure","latency_ms":310}]
```

Response example:

```json
{
  "status": 200,
  "message": "Updated"
}
```

Frontend usage:

- approve/reject controls
- provider attempt modal
- analytics refresh after mutation

### DELETE `/api/payments/{id}`

Deletes a payment record as a platform administration action. This is separate from merchant account/profile deletion.

JWT required: Yes

Allowed backend role:

- admin

Example request:

```http
DELETE /api/payments/65f1a7c4b2e8f4a91c0d2211
Authorization: Bearer <jwt-token>
```

Response example:

```json
{
  "status": 200,
  "message": "Deleted"
}
```

Frontend usage:

- admin payment delete action
- confirmation dialog
- payments refresh after mutation

## Analytics

Analytics endpoints are role-protected and use the same backend identity rules as payments. Merchant users receive analytics only from their own payment records. Admin and finance users receive platform-wide analytics. Metrics are derived from stored lifecycle records and provider attempts.

### GET `/api/analytics/payment-volume`

Returns payment volume grouped by currency, with optional filters applied before aggregation.

JWT required: Yes

Optional query parameters:

| Parameter | Example | Purpose |
| --- | --- | --- |
| `status` | `success` | Filter analytics by payment status |
| `from` | `2026-01-01` | Filter by initiated date lower bound |
| `to` | `2026-01-31` | Filter by initiated date upper bound |

Response example:

```json
{
  "status": 200,
  "data": [
    {
      "currency": "GBP",
      "total_volume": 124900
    }
  ]
}
```

### GET `/api/analytics/provider-latency`

Returns average latency grouped by provider using the `provider_attempts` routing history stored on payment records.

JWT required: Yes

Optional query parameters:

- `status`
- `from`
- `to`

Response example:

```json
{
  "status": 200,
  "data": [
    {
      "provider": "Stripe",
      "average_latency_ms": 142
    },
    {
      "provider": "PayPal",
      "average_latency_ms": 184
    }
  ]
}
```

### GET `/api/analytics/payment-status`

Returns payment counts grouped by lifecycle status.

JWT required: Yes

Optional query parameters:

- `status`
- `from`
- `to`

Response example:

```json
{
  "status": 200,
  "data": [
    {
      "status": "success",
      "count": 8
    },
    {
      "status": "pending",
      "count": 3
    },
    {
      "status": "failed",
      "count": 2
    }
  ]
}
```

Frontend usage:

- `AnalyticsService.getPaymentVolume`
- `AnalyticsService.getProviderLatency`
- `AnalyticsService.getPaymentStatus`
- analytics charts
- refresh after payment mutation

## Changes Since CW1

### Security and Identity

- JWT authentication was added so API access is tied to a signed identity rather than anonymous requests.
- Role-Based Access Control was introduced for `admin`, `finance`, and `merchant`.
- Merchant visibility is enforced server-side using the authenticated email, not only frontend filtering.
- Merchant account deletion is restricted to merchant users and removes records created by that account.

### Payment Workflow

- Payments now follow a controlled lifecycle: backend-created `pending` records, restricted updates, provider attempt recording, and final status reporting.
- `provider_attempts` captures routing/fallback evidence with provider, result, and latency.
- Finance users can perform review-style lifecycle changes without being able to rewrite core payment/customer fields.

### Querying and Analytics

- `GET /payments` now supports role scoping, pagination, status filtering, and initiated-date filtering.
- Analytics endpoints now respect the same role visibility rules as payments.
- Provider latency and status distribution metrics were added so the system reports operational behaviour rather than only listing records.

### Summary

The CW2 API is a more mature system boundary than CW1: authentication identifies the user, RBAC constrains what that user can see or mutate, provider attempts make routing history visible, and analytics are derived from the same scoped operational records used by the payments workflow.
