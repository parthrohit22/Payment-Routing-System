# API Endpoints

The Angular frontend communicates with the Flask API through `/api`, using the proxy configuration in `frontend/proxy.conf.json`. Protected endpoints require a JWT bearer token. The Angular HTTP interceptor attaches the token from the active session.

```http
Authorization: Bearer <jwt-token>
```

## Auth

### POST `/api/auth/login`

Authenticates a user and returns a session used by the Angular app.

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

Registers a merchant user.

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

## Payments

### GET `/api/payments`

Retrieves paginated payment records. Admin and finance users receive platform-wide payments. Merchants receive only payments created by their authenticated account.

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

Creates a new payment. The backend sets the initial status to `pending` and stores the authenticated user's email as `created_by`.

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

Updates a payment status and/or appends provider attempt data.

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

Deletes a payment record.

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

- admin delete action
- confirmation dialog
- payments refresh after mutation

## Analytics

Analytics endpoints are role-protected and use the same backend identity rules as payments. Merchant users receive analytics based only on their own payment records.

### GET `/api/analytics/payment-volume`

Returns payment volume grouped by currency.

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

Returns average latency grouped by provider.

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

Returns payment counts grouped by status.

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
