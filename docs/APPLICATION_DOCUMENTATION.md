# Application Documentation

## 1. System Overview

Payment Routing System is a fintech operations application for managing payment orchestration. It gives different user roles a controlled view of payment records, provider attempts, transaction statuses and analytics.

The system is built around the idea that a payment may not succeed on the first provider. By storing provider attempts, latency and result data, the application gives operators visibility into routing behaviour and fallback outcomes.

The Angular frontend is the assessed COM661 component. It consumes a Flask API backed by MongoDB and presents a role-aware operational interface.

## 2. Architecture

The application has three main layers:

```text
Angular Frontend -> Flask API -> MongoDB
```

The Angular frontend handles user interaction. It renders login/register pages, the dashboard, payments workspace, analytics charts and role-specific controls. It does not directly access the database. All data is requested through Angular services.

The Flask API handles authentication, role checks, payment persistence and analytics queries. It decodes JWT tokens, identifies the active user and applies role-aware data access.

MongoDB stores users and payment records. Payment records include transaction details, customer details, status and provider attempts.

## 3. Data Flow

### Login request

1. User enters email and password in the Angular login form.
2. `AuthService.login` sends a `POST /api/auth/login` request.
3. Flask validates credentials and returns email, role and JWT token.
4. Angular stores the session in session storage.
5. The router sends the user to the correct workspace for their role.

### Authenticated payment request

1. A protected page calls `PaymentsService`.
2. The HTTP interceptor reads the stored session.
3. The request is sent with `Authorization: Bearer <token>`.
4. Flask decodes the JWT and attaches the user identity to the request.
5. The backend queries MongoDB using the user's role.
6. The response returns payment data to Angular.
7. Angular updates signals and computed values for the UI.

### Payment mutation request

1. User submits a create, update, status or provider attempt action.
2. Angular validates form state and sends the request through `PaymentsService`.
3. Flask validates role and request data.
4. MongoDB is updated.
5. Angular shows notification feedback.
6. Payment data is refreshed.
7. Analytics refresh state is triggered so charts reflect the latest records.

## 4. Component Structure

### `core`

The `core` folder contains application infrastructure:

- services for API communication and session management
- guards for authentication and RBAC
- HTTP interceptor for bearer token headers
- typed models for API, auth, payments and analytics
- constants shared across features

### `features`

The `features` folder contains route-level screens:

- `auth`: login and register pages
- `dashboard`: role-scoped payment summary
- `payments`: main payment operations workspace
- `analytics`: chart-based performance views
- `unauthorized`: access denied page

### `shared`

The `shared` folder contains reusable UI components:

- app shell
- stat card
- empty state
- confirmation dialog
- notification banner
- theme toggle

This keeps repeated UI behaviour out of feature components and makes the frontend easier to maintain.

## 5. State Management

The frontend uses Angular signals for local reactive state rather than broad shared mutable objects.

Examples in the payments page:

- `payments`: full role-scoped payment list
- `selectedPayment`: current detail panel record
- `searchTerm`, `statusFilter`, `regionFilter`, `currencyFilter`: filter state
- `sortDirection`: initiated date sort state
- `currentPage`: pagination state
- `isLoading`, `isSubmitting`, `errorMessage`: UI feedback state

Computed values derive UI-ready data:

- available regions and currencies
- filtered payment list
- sorted payment list
- paged payment list
- total page count
- role-based permissions

This means filtering, sorting and pagination are predictable and do not mutate the original API response.

## 6. API Integration

API access is isolated inside Angular services:

- `AuthService` handles login, registration, logout and session state.
- `PaymentsService` handles paginated payments, full payment aggregation, create, update and delete operations.
- `AnalyticsService` handles volume, latency and status analytics.
- `HealthService` checks backend availability.

The services use typed models so components work with known data shapes. The HTTP interceptor adds the authentication token to protected requests, keeping token handling out of feature components.

## 7. Authentication Flow

Authentication is JWT-based.

1. User logs in.
2. Flask returns a JWT containing user email and role.
3. Angular stores the session in session storage.
4. The app derives authentication state, role and email from `AuthService`.
5. The HTTP interceptor attaches the bearer token to API requests.
6. The backend verifies the token and applies role checks.
7. Logout clears the stored session and returns the user to login.

Route protection is handled by:

- `authGuard`: blocks unauthenticated access to private screens
- `roleGuard`: blocks access when the active role is not allowed by route data

## 8. Role-Based Access Logic

The frontend and backend both contribute to RBAC.

Frontend:

- route guards restrict screens
- computed permission checks hide or show actions
- forms and buttons are displayed according to role

Backend:

- protected endpoints require JWT identity
- merchant queries are scoped by `created_by`
- admin and finance users can access platform-wide payment data

Role behaviour:

| Role | Behaviour |
| --- | --- |
| Admin | Full operational control, including delete and provider attempt management |
| Finance | Can review payment data, approve/reject statuses and view analytics |
| Merchant | Can create payments and view only payments created by their own account |

Merchant scoping matters because payment records include customer and transaction information. It prevents one merchant from seeing another merchant's operational data.

## 9. Key Design Decisions

### Why `provider_attempts` exists

Payment routing is not always a single action. A provider can fail or respond slowly, and a fallback provider may be attempted. Storing attempts as an array preserves that history. It supports troubleshooting, failover visibility and provider latency analytics.

### Why pagination is used

Payment systems can accumulate many records. Pagination keeps API responses and table rendering manageable. The frontend aggregates pages only when a full role-scoped dataset is needed for dashboard metrics or complete client-side filtering.

### Why role scoping matters

Admin and finance users need broad visibility, but merchants should only see their own records. This is a security and usability requirement: merchants get a focused workspace and sensitive platform-wide data remains protected.

### Why analytics are separated from payments

The payments page is for operational action. Analytics are separated so performance trends such as provider latency and status distribution can be reviewed without cluttering the transaction workflow.

## 10. Limitations

- Provider routing decisions are represented through recorded provider attempts; the current system does not run an automated provider-selection algorithm in the frontend.
- The frontend depends on the Flask API being available and seeded with users/data for a full demonstration.
- The analytics views focus on core operational metrics rather than advanced forecasting.
- Automated tests cover important frontend behaviours, but full browser end-to-end tests would be a useful future improvement.
- The project is coursework-sized, so production concerns such as audit logs, refresh tokens, deployment pipelines and observability are intentionally limited.
