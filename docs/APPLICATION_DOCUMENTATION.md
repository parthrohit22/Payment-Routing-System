# Application Documentation

## 1. System Overview

Payment Routing System is a full-stack operations application for payment lifecycle control. It presents payments as operational records that move from creation to review, provider attempts, and final status. The frontend is the controlled user interface; the Flask API is the authority for authentication, RBAC, merchant scoping, persistence, and mutation rules.

The core modelling decision is `provider_attempts`. A payment may not succeed on the first provider, so the system records each attempt with provider, result, and latency. This turns routing/fallback behaviour into inspectable history and gives analytics meaningful operational data.

The Angular frontend is the assessed COM661 component. It consumes a Flask API backed by MongoDB and demonstrates role-aware workflows without treating the browser as the data authority.

## 2. Architecture

The application has three main layers:

```text
Angular Frontend -> Flask API -> MongoDB
```

Angular handles interaction: login/register pages, dashboard, payments workspace, analytics charts, confirmation dialogs, notifications, and role-aware controls. It validates input and manages interface state before calling the API.

Flask handles the server contract: login, JWT issuing/validation, role checks, merchant-scoped queries, payment persistence, controlled payment updates, account deletion rules, and analytics aggregation.

MongoDB stores users and payment records. Payment records include transaction details, customer details, status, merchant ownership, initiated timestamp, and provider attempts.

## 3. Data Flow

### Login request

1. User enters email and password in the Angular login form.
2. `AuthService.login` sends `POST /api/auth/login`.
3. Flask validates credentials against MongoDB and returns email, role and JWT token.
4. Angular stores the session in session storage.
5. Guards and role-aware navigation use the session for browser workflow decisions.

### Authenticated payment request

1. A protected page calls `PaymentsService`.
2. The HTTP interceptor reads the stored session.
3. The request is sent with `Authorization: Bearer <token>`.
4. Flask decodes the JWT and attaches identity to the request.
5. The backend queries MongoDB using the role boundary.
6. Merchant requests are scoped by `created_by = authenticated_email`.
7. Angular receives data and updates signals/computed values for the UI.

### Payment mutation request

1. User submits create, status, provider-attempt, edit, or delete action.
2. Angular validates form state and calls `PaymentsService`.
3. Flask validates role and allowed fields.
4. MongoDB is updated only through the API.
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

This separates workflow screens from reusable interface behaviour and keeps repeated UI decisions out of feature components.

## 5. State Management

The frontend uses Angular signals for local reactive state rather than broad shared mutable objects. This is important because the payments workspace combines multiple concerns: role-scoped data, search, filters, sorting, pagination, current selection, loading states, and mutation feedback.

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

The original API response is not mutated by filtering or sorting. This makes selection synchronisation and reset behaviour predictable, especially when filters remove the currently selected payment from view.

## 6. API Integration

API access is isolated inside Angular services:

- `AuthService` handles login, registration, logout, active session state, and account deletion requests.
- `PaymentsService` handles paginated payments, full payment aggregation, create, update and payment delete operations.
- `AnalyticsService` handles volume, latency and status analytics.
- `HealthService` checks backend availability.

The services use typed models so components work with known data shapes. The HTTP interceptor centralises bearer token attachment so feature components do not manually handle auth headers.

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

Frontend and backend both participate in RBAC, but they do not have equal authority.

Frontend:

- route guards restrict navigation
- computed permission checks hide or show actions
- forms and buttons are displayed according to role

Backend:

- protected endpoints require JWT identity
- merchant queries are scoped by `created_by`
- admin and finance users can access platform-wide payment data
- payment and account mutations are checked against role-specific rules

Role behaviour:

| Role | Behaviour |
| --- | --- |
| Admin | Global payment visibility, core payment edits, provider attempts, status changes, and payment deletion |
| Finance | Global payment review, approve/reject status changes, provider attempts, and analytics |
| Merchant | Merchant-scoped payment visibility, payment creation, analytics for own records, and own account deletion |

Merchant scoping matters because payment records include customer and transaction information. UI restrictions improve usability, but backend scoping protects the actual data boundary.

## 9. Key Design Decisions

### Why `provider_attempts` exists

Payment routing is not always a single action. A provider can fail or respond slowly, and a fallback provider may be attempted. Storing attempts as an ordered array preserves that history, supports investigation, and provides the source data for provider latency analytics.

### Why lifecycle mutation is controlled

Payment status and provider attempts affect operational truth. Merchant users can initiate payments, but finance/admin users control status and provider-attempt updates so review actions remain separate from merchant data entry.

### Why pagination is used

Payment systems can accumulate many records. Pagination keeps API responses and table rendering manageable. The frontend aggregates pages only when a full role-scoped dataset is needed for dashboard metrics or complete client-side filtering.

### Why role scoping matters

Admin and finance users need broad visibility for review and analytics. Merchants need focused access to their own records. Server-side scoping prevents a merchant session from accessing platform-wide data even if frontend state or requests are manipulated.

### Why analytics are separated from payments

The payments page is for operational action. Analytics are separated so payment volume, provider latency, and status distribution can be reviewed without cluttering the transaction workflow. The metrics still derive from the same stored payment records.

## 10. Limitations

- Provider routing decisions are represented through recorded provider attempts; the current system does not run an automated provider-selection algorithm.
- The frontend depends on the Flask API being available and seeded with users/data for a full demonstration.
- Analytics focus on core operational metrics rather than forecasting or predictive modelling.
- Automated tests cover important frontend and backend behaviours, but full browser end-to-end tests would improve confidence.
- The project is coursework-sized, so production concerns such as audit logs, refresh tokens, deployment pipelines and observability are intentionally limited.
