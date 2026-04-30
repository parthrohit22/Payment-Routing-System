# Testing Summary

## 1. Testing Approach

The project uses automated frontend tests, backend security tests, and manual browser validation. The test strategy focuses on behaviour that matters to a payment routing workflow: authentication, RBAC, merchant scoping, payment API usage, filtering, sorting, pagination, provider attempts, analytics rendering, account deletion permissions, and UI state handling.

The tests do not try to prove that the system is production-complete. They provide evidence that the submitted workflow is internally consistent: the frontend presents role-specific operations, the backend rejects forbidden security actions, and operational state updates trigger the expected UI/analytics refresh behaviour.

Run automated frontend tests from the frontend folder:

```bash
cd frontend
npm test
```

Run backend security tests:

```bash
cd api
python -m unittest test_security.py
```

Build verification:

```bash
cd frontend
ng build
```

## 2. Automated Test Coverage

| Test type | Areas covered |
| --- | --- |
| Unit tests | `AuthService`, `PaymentsService`, `ThemeService`, guards, interceptor |
| Behavioural component tests | login/register pages, payments page, analytics page, app shell, root app |
| Backend security tests | password rules, merchant scoping, forbidden updates, role-limited mutations |
| Manual workflow validation | browser login sessions, role workflows, responsive layout, operational review |

This split is intentional. Unit tests verify isolated service and guard behaviour. Component tests verify visible workflow behaviour. Backend tests verify server-side authority for security-sensitive rules.

## 3. Authentication

| Scenario | Expected | Result |
| --- | --- | --- |
| Valid login submitted | Session is returned and stored with email, role and token | Passed |
| Invalid login submitted | Session is not stored and error is exposed | Passed |
| Register merchant account | Request sends merchant role and form data | Passed |
| Password does not meet strength rules | Backend rejects registration | Passed |
| Logout triggered | Session storage is cleared and user is routed to login | Passed |

These tests show that the frontend can establish and clear the session used by guards/interceptors, while backend security tests check that registration is not accepting weak passwords.

## 4. Payments Workflow

| Scenario | Expected | Result |
| --- | --- | --- |
| Fetch paginated payment data | Service reads `payments`, `page`, `limit` and `total` | Passed |
| Aggregate all payment pages | Service combines all pages for complete role-scoped views | Passed |
| Create payment payload | Form data serialises payment and customer details correctly | Passed |
| Payment mutation succeeds | Notification is shown and analytics refresh is requested | Passed |
| Admin deletes payment | Confirmation dialog opens before deletion | Passed |

The payment tests focus on workflow behaviour rather than database internals. They verify that the frontend sends correctly shaped requests and keeps the operational UI consistent after mutations.

## 5. RBAC

| Scenario | Expected | Result |
| --- | --- | --- |
| Merchant opens payments page | Create control is visible and privileged payment controls are hidden | Passed |
| Finance opens payments page | Approve/reject controls are visible; create/delete controls are hidden | Passed |
| Admin opens payments page | Admin payment controls such as delete and provider attempts are available | Passed |
| Merchant opens app shell | Delete Account is visible and requires confirmation | Passed |
| Admin/finance open app shell | Delete Account is hidden | Passed |
| Admin/finance call `DELETE /me` | Backend returns forbidden | Passed |
| Payment cache changes user | Cached admin/global payments are not reused for merchant session | Passed |
| Route requires role | User without required role is redirected or blocked | Passed |

RBAC is critical because payment records contain merchant and customer data. Frontend tests check that unavailable controls are not exposed in normal use. Backend tests are more important for security: they prove that forbidden account deletion and payment mutation requests are rejected even if a user bypasses the UI.

## 6. Filtering and Sorting

| Scenario | Expected | Result |
| --- | --- | --- |
| Default payment order | Newest initiated payment appears first | Passed |
| Sort toggle selected | Payments switch between newest-first and oldest-first | Passed |
| Status filter applied | Only matching payment statuses remain visible | Passed |
| Search/filter/sort combined | Filtered results remain correctly sorted | Passed |
| Reset filters | Search, status, region, currency, sort and page return to defaults | Passed |

Filtering and sorting are tested together because the payments workspace is not a static table. The tests reduce the risk of stale or contradictory UI state after users combine controls.

## 7. Pagination

| Scenario | Expected | Result |
| --- | --- | --- |
| Results exceed page size | Total pages reflects filtered and sorted result count | Passed |
| Next page selected | Page advances and displays the correct slice of payments | Passed |
| Filter changes while on later page | Current page resets to page 1 | Passed |
| Selected payment filtered out | Selection is cleared to avoid stale detail panel state | Passed |

Pagination tests prove that the frontend table remains coherent when derived state changes. This matters because the backend and frontend both use a 5-payment page model.

## 8. Provider Attempts

| Scenario | Expected | Result |
| --- | --- | --- |
| Admin adds provider attempt | Attempt is appended to existing attempts before update request | Passed |
| Finance adds provider attempt | Backend accepts provider-attempt mutation | Passed |
| Provider attempt form invalid | Invalid data is marked before submission | Covered by form validation behaviour |
| Attempt has latency value | Detail panel can classify latency as operational signal | Passed through component methods |

Provider attempts are tested because they represent the routing and failover history of a payment. They are not decorative UI data: provider, result and latency are the basis for route visibility and provider latency analytics.

## 9. Analytics

| Scenario | Expected | Result |
| --- | --- | --- |
| Analytics data available | Volume, latency and status chart sections render | Passed |
| Merchant user views analytics | Merchant-specific subtitle is displayed | Passed |
| Unauthorized user views analytics | Access restricted state is displayed | Passed |
| Analytics request fails | Error state is displayed | Passed |

Analytics tests verify that charts and access states respond to role/session context and service failures. Backend scoping is still the authority for which records contribute to the metrics.

## 10. UI States

| Scenario | Expected | Result |
| --- | --- | --- |
| Payments are loading | Loading skeleton is shown | Verified in component template |
| No payments match filters | Empty state is shown | Verified through template logic |
| API request fails | Error panel and notification feedback are available | Passed through service/component handling |
| Theme toggled | Theme service persists selected mode | Passed |

These tests cover the non-happy-path states that make the interface usable during loading, empty, and failed API conditions.

## 11. Manual Browser Checks

The following browser checks were completed before final submission:

| Scenario | Expected | Result |
| --- | --- | --- |
| Login as admin | Global payment and analytics data visible | Passed |
| Login as finance | Approve/reject available; create/delete hidden | Passed |
| Login as merchant | Only merchant-owned payments visible | Passed |
| Merchant account deletion | Delete Account is visible only to merchant and requires confirmation | Passed |
| Create a merchant payment | Payment appears in payments and dashboard | Passed |
| Add provider attempt | Attempt appears in detail panel | Passed |
| Use filters and sorting together | Results remain stable and understandable | Passed |
| Resize to mobile width | Auth and workspace layouts remain usable | Passed - checked with browser responsive mode |

Manual validation is used for integrated workflows where the value is in seeing the whole route/session/UI behaviour together. It complements, rather than replaces, automated assertions.

## 12. Testing Limitations

- Full browser end-to-end tests are not included, so the complete login-to-mutation journey is manually validated rather than automated through Playwright/Cypress.
- The automated frontend tests mock API services, so they verify Angular behaviour but do not prove MongoDB persistence.
- Backend security tests use controlled test doubles rather than a production MongoDB deployment.
- Chart rendering tests verify states and component behaviour, not pixel-perfect chart output.
- Provider routing is manually recorded in this submission; there is no automated routing algorithm to test.
- Performance, load testing, deployment, refresh-token handling, and production observability are outside the coursework scope.

These limitations are realistic for the project scale. The suite still targets the highest-risk behaviours: identity, RBAC, merchant scoping, controlled mutation, provider-attempt handling, and UI state consistency.

## 13. Current Test Evidence

The current suite includes tests for services, guards, interceptor, auth pages, payments page, analytics page, app shell, theme service, root app bootstrapping, and backend security rules. This gives practical evidence that the frontend is behaviourally verified and that the backend protects the main data boundaries.
