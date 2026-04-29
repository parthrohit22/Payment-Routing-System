# Testing Summary

## 1. Testing Approach

The frontend is tested with Angular's test runner and Vitest. The automated tests focus on behaviour that matters to a payment operations system: authentication, role-based access, payment API usage, filtering, sorting, pagination, provider attempts, analytics rendering and UI state handling.

Manual testing is also important because the project includes role-specific workflows that are best verified in a browser with real login sessions.

Run automated tests from the frontend folder:

```bash
cd frontend
npm test
```

Build verification:

```bash
cd frontend
ng build
```

## 2. Automated Test Coverage

| Area | Components or services tested |
| --- | --- |
| Authentication | `AuthService`, login page, register page |
| Guards | `authGuard`, `roleGuard` |
| HTTP integration | `roleHeaderInterceptor`, `PaymentsService` |
| Payments UI | `PaymentsPageComponent` |
| Analytics UI | `AnalyticsPageComponent` |
| Theme | `ThemeService` |
| App startup | root `App` component |

## 3. Authentication

| Scenario | Expected | Result |
| --- | --- | --- |
| Valid login submitted | Session is returned and stored with email, role and token | Passed |
| Invalid login submitted | Session is not stored and error is exposed | Passed |
| Register merchant account | Request sends merchant role and form data | Passed |
| Logout triggered | Session storage is cleared and user is routed to login | Passed |

## 4. Payments CRUD

| Scenario | Expected | Result |
| --- | --- | --- |
| Fetch paginated payment data | Service reads `payments`, `page`, `limit` and `total` | Passed |
| Aggregate all payment pages | Service combines all pages for complete role-scoped views | Passed |
| Create payment payload | Form data serialises payment and customer details correctly | Passed |
| Delete payment requested by admin | Confirmation dialog opens before deletion | Passed |
| Payment mutation succeeds | Notification is shown and analytics refresh is requested | Passed |

## 5. RBAC

| Scenario | Expected | Result |
| --- | --- | --- |
| Merchant opens payments page | Create control is visible, admin-only controls are hidden | Passed |
| Finance opens payments page | Approve/reject controls are visible, create/delete controls are hidden | Passed |
| Admin opens payments page | Admin controls such as delete and provider attempts are available | Passed |
| Payment cache changes user | Cached admin/global payments are not reused for merchant session | Passed |
| Route requires role | User without required role is redirected or blocked | Passed |

RBAC is critical because payment records contain merchant and customer data. The frontend tests ensure role-specific UI controls are not accidentally exposed, while the backend scopes merchant data by JWT identity.

## 6. Filtering and Sorting

| Scenario | Expected | Result |
| --- | --- | --- |
| Default payment order | Newest initiated payment appears first | Passed |
| Sort toggle selected | Payments switch between newest-first and oldest-first | Passed |
| Status filter applied | Only matching payment statuses remain visible | Passed |
| Search/filter/sort combined | Filtered results remain correctly sorted | Passed |
| Reset filters | Search, status, region, currency, sort and page return to defaults | Passed |

## 7. Pagination

| Scenario | Expected | Result |
| --- | --- | --- |
| Results exceed page size | Total pages reflects filtered and sorted result count | Passed |
| Next page selected | Page advances and displays the correct slice of payments | Passed |
| Filter changes while on later page | Current page resets to page 1 | Passed |
| Selected payment filtered out | Selection is cleared to avoid stale detail panel state | Passed |

## 8. Provider Attempts

| Scenario | Expected | Result |
| --- | --- | --- |
| Admin adds provider attempt | Attempt is appended to existing attempts before update request | Passed |
| Provider attempt form invalid | Invalid data is marked before submission | Covered by form validation behaviour |
| Attempt has latency value | Detail panel can classify latency as operational signal | Passed through component methods |

Provider attempts are tested because they represent the routing and failover history of a payment.

## 9. Analytics

| Scenario | Expected | Result |
| --- | --- | --- |
| Analytics data available | Volume, latency and status chart sections render | Passed |
| Merchant user views analytics | Merchant-specific subtitle is displayed | Passed |
| Unauthorized user views analytics | Access restricted state is displayed | Passed |
| Analytics request fails | Error state is displayed | Passed |

## 10. UI States

| Scenario | Expected | Result |
| --- | --- | --- |
| Payments are loading | Loading skeleton is shown | Verified in component template |
| No payments match filters | Empty state is shown | Verified through template logic |
| API request fails | Error panel and notification feedback are available | Passed through service/component handling |
| Theme toggled | Theme service persists selected mode | Passed |

## 11. Manual Browser Checks

The following manual browser checks were completed before final submission:

| Scenario | Expected | Result |
| --- | --- | --- |
| Login as admin | Full payment and analytics data visible | Passed |
| Login as finance | Approve/reject available; create/delete hidden | Passed |
| Login as merchant | Only merchant-owned payments visible | Passed |
| Create a merchant payment | Payment appears in payments and dashboard | Passed |
| Add provider attempt | Attempt appears in detail panel | Passed |
| Use filters and sorting together | Results remain stable and understandable | Passed |
| Resize to mobile width | Auth and workspace layouts remain usable | Passed - checked with browser responsive mode |

## 12. Current Test Evidence

The current suite includes tests for services, guards, interceptor, auth pages, payments page, analytics page, theme service and root app bootstrapping. This gives practical evidence that the frontend is not just visually complete but behaviourally verified.
