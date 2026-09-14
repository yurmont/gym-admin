# REST API contracts

All business routes use `/api/v1` and require `Authorization: Bearer <Firebase ID token>`. Firebase UID resolves to an active PostgreSQL profile. Reads are tenant-scoped; writes require admin or recepcion. An instructor can read but cannot perform management operations. Unassigned or inactive Firebase users receive 403. Submitted actor/tenant identity is never trusted.

Responses use `{ success, message, data, errors? }`. Successful business actions return 200 to preserve prior contracts. Validation returns 422, missing/invalid/expired tokens 401, denied authorization 403, unavailable resources 404, duplicate records and duplicate check-in 409, and infrastructure errors 500 with a generic message. Malformed JSON returns 400. X-Request-ID correlates responses with structured request logs.

## Business actions

| Method/path                     | Body                                                                                                                    | data                             |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------- |
| POST /memberships               | member_id, membership_plan_id, start_date; optional discount=0, pay_now=false, method=efectivo, auto_renew=false, notes | Membership UUID                  |
| POST /memberships/:id/renew     | optional discount=0, pay_now=false, method=efectivo                                                                     | New membership UUID              |
| POST /memberships/:id/cancel    | none                                                                                                                    | Membership UUID                  |
| POST /payments                  | member_id and membership_id (nullable), concept, amount, method, reference (nullable); optional discount=0              | Payment UUID                     |
| POST /payments/:id/void         | none                                                                                                                    | Payment UUID                     |
| POST /attendances/check-in      | identifier; optional method=manual                                                                                      | id, allowed, member_name, reason |
| POST /attendances/:id/check-out | none                                                                                                                    | Attendance UUID                  |

Dates use YYYY-MM-DD. IDs are UUIDs except Firebase identity UID, which is text. Payment methods are efectivo, tarjeta, transferencia, yape or plin. Payment concepts are membresia, matricula, clase_suelta, producto, servicio, penalidad or otro. Check-in methods are qr, huella, tarjeta, pin, manual or facial. Discounts cannot be negative; payment amounts must be positive. Existing schemas/defaults and integer-cent calculations are preserved.

Denied entry is a successful business action with allowed=false: the denied attendance record and reason are persisted. Infrastructure failures roll back transactional operations. Per-tenant PostgreSQL advisory locks serialize membership/payment/attendance writes across instances.

## Reads and CRUD

- GET /me returns the profile, role and gym name.
- GET /members?q=... searches name, code, document and phone, sorted by last name, at most 100 rows.
- POST /members and PATCH /members/:id accept first_name, last_name, optional nullable document_number, phone and email. Return the saved member.
- GET /membership-plans returns plans sorted by sort_order.
- POST /membership-plans and PATCH /membership-plans/:id accept name, price, duration_days, nullable sessions_included, color and optional is_active. PATCH /membership-plans/:id/status accepts is_active only.
- GET /memberships returns at most 100 memberships sorted by start_date, with nested member and plan objects. GET /memberships/options returns selectable members and active plans.
- GET /payments returns at most 100 payments sorted by paid_at, with nested members. GET /payments/options returns selectable members and pending memberships.
- GET /attendances?since=ISO_TIMESTAMP returns at most 100 records since the supplied timestamp, sorted by check_in, with nested members.
- GET /dashboard?today=ISO_TIMESTAMP&month=ISO_TIMESTAMP returns active, overdue, attendance, income and recent payments. Timestamp boundaries preserve the existing browser-local reporting behavior.

No delete-member/plan operation is introduced: the previous UI creates/updates members and creates/updates/deactivates plans.

## Member photos

1. POST /members/:id/photo/upload-url with content_type (image/jpeg, image/png or image/webp). Returns a short-lived signed PUT url, tenant/member-prefixed path, expires_at, max_bytes and required headers. The generation precondition prevents overwriting an existing object.
2. Upload directly to GCS using the returned URL and headers.
3. POST /members/:id/photo/confirm with path. NestJS verifies member ownership and actual GCS metadata (image type, positive size, at most 5 MiB), then attaches the path to the database member.
4. GET /members/:id/photo/download-url authorizes the member and signs its attached object for download.
5. DELETE /members/:id/photo deletes the object and clears that path. A concurrent attachment of a different photo is not cleared.

Signed URLs expire after five minutes. GCS IAM/bucket CORS/signing must be configured during infrastructure setup. Unconfirmed/replaced objects require bucket retention/cleanup policies; confirmation limits attachment size and does not prevent a client uploading an oversized unattached object.
