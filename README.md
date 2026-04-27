# Payment Routing System

## 1. Project Overview

Payment Routing System is a full-stack payment orchestration platform built with an Angular frontend, Flask API and MongoDB persistence. It models how a fintech operations team can create payments, track provider attempts, respond to failed routes, and monitor transaction performance across multiple payment providers.

The project is not just a payment list UI. It is an operational workspace for routing visibility: each payment contains provider attempt history, status transitions and customer/payment metadata so administrators, finance users and merchants can understand what happened to a transaction and what action is required next.

The system focuses on four realistic payment orchestration concerns:

- provider routing: recording which provider was attempted for a transaction
- latency awareness: storing provider latency for operational comparison
- failover handling: preserving failed and successful provider attempts in order
- operational visibility: surfacing payment status, provider performance and transaction flow through dashboards and analytics

This project was built for COM661 Full Stack Strategies and Development, Assignment 2, and is structured as a portfolio-quality Angular full-stack application.

## 2. System Flow

A payment starts when a merchant or administrator creates a new transaction from the Angular payments workspace. The frontend validates the form, serialises the payment payload and sends it to the Flask API. The backend stores the payment in MongoDB with a `pending` status, the merchant identity and the initial payment metadata.

Provider attempts represent the routing layer of the system. When a provider attempt is added, the attempt records the provider name, result and latency. If one provider fails, another provider can be recorded as a fallback attempt. This produces an auditable transaction trail instead of overwriting the previous outcome.

As the transaction is reviewed, authorised users can update the payment status. Finance users can approve or reject payments, while administrators can manage the full payment lifecycle. Analytics then read from the same stored payment and provider-attempt data to show payment volume, status distribution and provider latency.

The operational flow is:

```text
Payment created
-> Provider attempt recorded
-> Failure can be followed by fallback provider attempt
-> Provider attempts stored on the payment
-> Status updated by authorised role
-> Dashboard and analytics reflect the latest payment data
```

## 3. Architecture

The application is separated into a browser-based Angular frontend, a Flask API and MongoDB storage.

```text
Angular Frontend -> Flask API -> MongoDB
```

The Angular frontend owns the user experience: authentication screens, dashboard, payments workspace, analytics charts, filtering, sorting, pagination, modals and role-specific controls. It communicates with the API through typed Angular services.

The Flask API owns persistence and access rules. It exposes authentication, payments and analytics endpoints. MongoDB stores users and payment records, including customer details and provider attempt arrays.

Authentication uses JWT. When a user logs in, the API returns a token containing their email and role. The Angular app stores the session in browser session storage and an HTTP interceptor attaches the token to API requests as a bearer token. Route guards protect authenticated pages and role-specific routes.

Role-based access is enforced in two places:

- the frontend hides unavailable screens and actions using route guards and computed role checks
- the backend scopes protected data using the JWT identity, especially for merchant-only payment visibility

## 4. Data Model

A payment record contains the transaction fields required for display, filtering, routing visibility and analytics.

```json
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
      "result": "failure",
      "latency_ms": 310
    },
    {
      "provider": "PayPal",
      "result": "success",
      "latency_ms": 184
    }
  ]
}
```

`amount_minor` stores money in minor units to avoid floating point currency issues. `initiated_at` supports chronological sorting and recent activity views.

`provider_attempts` is central to the orchestration model. It preserves the sequence of providers attempted for a payment, records whether each attempt succeeded or failed, and captures latency. This supports failover analysis, provider performance reporting and operational investigation when a transaction does not succeed on the first route.

## 5. Role-Based Access

The system uses three roles, each mapped to a realistic payment operations responsibility.

| Role | Access |
| --- | --- |
| Admin | Full access to dashboard, payments, analytics, edit/delete controls, status changes and provider attempt management |
| Finance | Can review payments, approve/reject outcomes and view analytics |
| Merchant | Can create payments and view only payments created by their own account |

Merchant scoping is important because payments contain customer and transaction data. A merchant should not see global platform data or another merchant's transaction records. The backend scopes merchant queries by the authenticated JWT email, and the frontend payment cache is isolated by role/email/token so global admin data is not reused in a merchant session.

## 6. Core Features

### Payment Operations

The payments workspace provides the main operational workflow. Users can search by merchant or customer, filter by status, region and currency, sort by initiated date, paginate through records and inspect a selected payment in a detail panel. Create, edit, delete and status actions are shown only when the active role is allowed to use them.

### Routing and Attempts

Provider attempts capture the routing history for a payment. Administrators can add provider attempts with provider name, result and latency. The detail panel presents this history so failed routes and fallback attempts remain visible instead of being hidden behind a single status field.

### Analytics

The analytics page turns operational payment data into charts for volume by currency, provider latency and payment status distribution. These charts are based on backend analytics endpoints and are refreshed after payment mutations.

### Authentication

Login and registration are handled through the Flask API. The Angular app stores the authenticated session, attaches JWT headers to requests, protects private routes and adapts visible actions based on the active user role.

## 7. Tech Stack

- Angular 21 standalone components
- Angular signals and computed state
- Reactive forms
- Angular Router guards
- Angular HTTP interceptor
- Chart.js with ng2-charts
- Vitest and Angular unit testing
- Flask API
- MongoDB
- JWT authentication

## 8. Project Structure

```text
Payment Routing System/
├── api/
│   ├── app.py              # Flask app entry point and route registration
│   ├── auth.py             # Login and registration endpoints
│   ├── payments.py         # Payment CRUD, RBAC queries and analytics endpoints
│   ├── db.py               # MongoDB connection
│   ├── utils.py            # JWT, response and role helper functions
│   └── userdata.py         # Demo user seeding
├── frontend/
│   ├── src/app/core/       # Services, guards, interceptor, constants and models
│   ├── src/app/features/   # Auth, dashboard, payments, analytics and unauthorized pages
│   ├── src/app/shared/     # Reusable UI components
│   ├── angular.json        # Angular project configuration
│   └── package.json        # Frontend dependencies and scripts
└── docs/                   # Coursework and portfolio documentation
```

The backend and frontend are intentionally separated. The backend exposes the API and applies persistence/security rules. The frontend consumes that API through services and focuses on usability, state management and role-aware workflows.

## 9. Run Locally

### Backend

```bash
cd api
pip install -r requirements.txt
python userdata.py
python app.py
```

### Frontend

```bash
cd frontend
npm install
ng serve
```

The Angular development server uses `frontend/proxy.conf.json` so frontend calls to `/api` are forwarded to the Flask backend.

## 10. Testing

Run the frontend test suite:

```bash
cd frontend
npm test
```

Build the Angular application:

```bash
cd frontend
ng build
```

The tests cover authentication, guards, HTTP interception, payment service behaviour, payment filtering/sorting/pagination, provider attempts, analytics rendering states, theme handling and app bootstrapping.

## 11. Rubric Alignment

| COM661 Criterion | Evidence |
| --- | --- |
| Use of Angular | Standalone components, signals, computed state, reactive forms, guards, interceptor, pipes, inputs/outputs, template control flow and charts |
| Application Structure | Clear `core`, `features` and `shared` separation with typed models and dedicated services |
| Back-End Communication | Authenticated GET, POST, PUT and DELETE workflows with JWT headers, pagination, analytics endpoints and role-scoped responses |
| Usability | Search, filtering, sorting, pagination, modals, confirmation, notifications, loading/error/empty states, responsive auth and role-specific controls |
| Documentation and Testing | README, endpoint summary, system documentation, testing summary, self-evaluation support and automated unit tests |

## 12. Why This Project

Payment routing is a real fintech problem. Providers differ in availability, latency, region support and reliability. A serious payment platform needs more than a transaction table: it needs visibility into provider attempts, failure handling, status ownership and operational metrics.

This project demonstrates those concerns in a focused full-stack application. It shows how an Angular frontend can support realistic payment operations through authenticated workflows, role-based access, reactive forms, API integration, analytics and tested state-driven UI behaviour.
