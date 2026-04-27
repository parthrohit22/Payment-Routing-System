# Payment Routing System

Payment Routing System is a production-style Angular full-stack application for payment operations teams. It simulates a fintech orchestration workspace where authenticated users can create, monitor, filter, approve, reject and analyse payments across multiple providers.

The project was built for COM661 Full Stack Strategies and Development, Assignment 2, with the front end as the assessed component. The implementation is intentionally structured to exceed the Biz Directory baseline through role-based access, reactive forms, dashboards, analytics, testing, reusable components and documented API integration.

## Core Value

Payment providers can fail, slow down or perform differently across regions. This application gives merchants, finance users and administrators a clear operational interface for routing decisions, payment status management and provider performance visibility.

## Features

- Authentication with JWT-backed sessions.
- Role-based routing and controls for `admin`, `finance` and `merchant`.
- Merchant-scoped payment visibility so merchants only see their own payments.
- Payments workspace with search, status/region/currency filters, sorting, pagination and detail selection.
- Create and update payment workflows using Angular reactive forms.
- Admin-only delete and provider attempt controls.
- Finance/admin approval and rejection flow.
- Dashboard summary with role-scoped payment metrics and recent payment activity.
- Analytics charts for payment volume, provider latency and status distribution.
- Reusable shell, stat cards, empty states, notification banner, confirmation dialog and theme toggle.
- Loading, error and empty states for user feedback.
- Unit tests for services, guards, interceptors, auth, payments, analytics and shared app behaviour.

## Demo Roles

Seed users are defined in `api/userdata.py`.

| Role | Email | Password | Access |
| --- | --- | --- | --- |
| Admin | `parth@payments.com` | `admin123` | Full dashboard, payments, analytics, edit/delete/status/provider controls |
| Finance | `vishnu@payments.com` | `finance123` | Dashboard, payments, analytics, approve/reject controls |
| Merchant | `arjun@payments.com` | `pass123` | Own payments and analytics only, create payment |
| Merchant | `honey@payments.com` | `pass123` | Own payments and analytics only, create payment |

## Tech Stack

- Angular 21 standalone components
- Angular signals and computed state
- Reactive forms
- Angular Router guards and HTTP interceptor
- Chart.js with ng2-charts
- Vitest/Angular unit testing
- Flask API with MongoDB persistence
- JWT authentication

## Project Structure

```text
Payment Routing System/
├── api/                    # Flask API used by the Angular frontend
├── frontend/               # Angular application assessed for CW2
│   ├── src/app/core        # services, guards, interceptor, models, constants
│   ├── src/app/features    # auth, dashboard, payments, analytics, unauthorized
│   └── src/app/shared      # reusable UI components
└── docs/                   # coursework and portfolio documentation
```

## Run Locally

### Backend

```bash
cd api
pip install -r requirements.txt
python userdata.py
python app.py
```

The API runs on the Flask default port unless configured otherwise.

### Frontend

```bash
cd frontend
npm install
npm start
```

The Angular dev server uses `frontend/proxy.conf.json` to call the backend through `/api`.

## Verification

```bash
cd frontend
CI=1 npm run build
CI=1 npm test
```

## Rubric Alignment

| COM661 Criterion | Evidence in this project |
| --- | --- |
| Use of Angular | Standalone components, signals, computed state, reactive forms, routing, guards, interceptor, pipes, template control flow, inputs/outputs and charts |
| Application Structure | Clear core/features/shared split, reusable components, typed models and isolated services |
| Communication with Back-end | Authenticated GET/POST/PUT/DELETE requests, pagination, JWT bearer token, role-aware API responses and analytics endpoints |
| Usability | Search, filtering, sorting, pagination, dashboards, modals, notifications, confirmation dialog, responsive auth, theme toggle and accessible feedback states |
| Submission Package | Documentation, endpoint summary, testing summary, self-evaluation draft and video script are included in `docs/` |

## Documentation

- [API endpoint summary](docs/API_ENDPOINTS.md)
- [Application documentation](docs/APPLICATION_DOCUMENTATION.md)
- [Testing summary](docs/TESTING_SUMMARY.md)
- [Self-evaluation draft](docs/SELF_EVALUATION_DRAFT.md)
- [Video walkthrough script](docs/VIDEO_WALKTHROUGH_SCRIPT.md)
- [Submission checklist](docs/SUBMISSION_CHECKLIST.md)
