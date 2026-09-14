# Backend migration plan

Baseline: the existing working tree, including uncommitted TypeScript services and tests. Cloud infrastructure had not been created when this migration began. The local migration has been verified and obsolete provider files have been removed.

## Implementation sequence

1. Add an independent NestJS npm workspace: validated configuration, Firebase Admin authentication, database-backed tenant/role resolution, versioned routes, validation, safe exceptions, JSON request logs, health checks, graceful shutdown.
2. Keep node-postgres and migrate the PostgreSQL schema with provider-independent identity and storage boundaries. Retain UUID profile IDs and use a unique text Firebase UID for identity mapping. Use a small pool and transaction-scoped tenant advisory locks.
3. Port the seven operations into domain services and repositories. Preserve request fields, response envelopes, Spanish messages, monetary rounding, audit fields, rollback, and concurrent-operation behavior. Add tenant-scoped read APIs and member/plan writes replacing browser database access.
4. Replace browser authentication with Firebase Web SDK and Bearer ID tokens. Replace the cookie proxy/server layout with a client session boundary. Export the Next.js UI as static files for Firebase Hosting.
5. Add private GCS member-photo signed upload/download and delete workflows. Authorize by database membership and tenant; verify uploaded object metadata before attaching it to a profile. No persistent container filesystem state.
6. Validate NestJS HTTP contracts, auth/roles, SQL transactions and concurrency, CRUD, storage errors, type checks, static frontend production build, and formatting. Remove obsolete implementation files and tooling after validating the replacement.
7. Prepare multi-stage Docker build, local PostgreSQL/Firebase Auth emulator configuration, Cloud Run/Secret Manager setup instructions, and Firebase Hosting configuration. Provision and deploy only after local readiness.

## Provider mapping

| Current                        | Target                                                  |
| ------------------------------ | ------------------------------------------------------- |
| Hosted PostgreSQL              | Neon PostgreSQL; local PostgreSQL for tests             |
| Edge Functions                 | NestJS controllers/services/repositories                |
| Hosted authentication          | Firebase Web SDK + Firebase Admin guard                 |
| Direct browser DB access       | Server tenant/role checks + REST repositories           |
| Provider-managed member photos | Private GCS objects + authorized signed URLs            |
| Previous environment/CLI       | Backend env, Cloud Run secrets, local Compose/emulators |

## Contracts to preserve

All operations return `{ success, message, data, errors? }`. Membership/payment/checkout operations return UUIDs; check-in returns `{ id, allowed, member_name, reason }`, including successful persisted denied entries. Payloads retain existing snake_case names. Validation errors use 422. Unauthorized requests use 401; authorization failures use 403; missing resources use 404; unexpected infrastructure failures use 500 with a generic public message.

The seven operations are membership create/renew/cancel, payment register/void, attendance check-in/check-out. Reads preserve nested member/plan objects, sorting, search, list limits and dashboard counts.

## Local and infrastructure boundaries

Local tests must not require Neon or a live Firebase/GCS account. Use real local PostgreSQL for repository/transaction tests and injectable Firebase/GCS adapters for deterministic provider failures. Live token issuance and signed URLs require a Firebase project and GCS IAM configuration in the later infrastructure phase.

Cloud Run uses Application Default Credentials and a dedicated service identity; DATABASE_URL comes from Secret Manager. Do not embed service-account JSON or private keys in images, frontend files, or Git. Neon uses a pooled URL for serving traffic and a direct URL for migrations. Budget database connections against maximum instances.

## Risks

Firebase UID does not replace UUID audit/profile keys. Registration grants no gym role automatically. All APIs derive tenant identity from the verified Firebase UID, never from submitted identity fields. Auth-dependent browser caches must clear on sign-out/account changes. Existing timezone/date and integer-cent monetary rules remain compatible. The static frontend session boundary controls presentation only; NestJS is the security boundary.

Only backend/migrations defines the application schema. No existing deployed application data has been identified for migration.

## Connection adapter decision

The original services use Postgres.js. The final adapter uses node-postgres (pg) because the supplied Neon connection string requests SCRAM channel binding, which Postgres.js 3.4.7 does not implement. Existing parameterized SQL, connection interfaces, transactions and domain rules remain unchanged; no ORM is introduced. The adapter verifies TLS certificates for Neon, enables channel binding, and removes libpq URI flags before passing explicit options to pg.

## Readiness status

Local implementation is complete. All 57 backend tests pass against disposable PostgreSQL. Type checking, formatting checks and the static frontend production build pass. All eight exported frontend routes respond successfully in the local preview, and the backend starts with production-only dependencies.

The supplied Neon connection is saved only in the ignored backend/.env file. A read-only check reached the gymadmin database over TLS with certificate verification enabled. The application schema is absent; no schema or data changes have been applied to Neon.

The infrastructure phase must apply the schema, configure Firebase Authentication and GCS IAM, deploy Cloud Run and Firebase Hosting, and verify live authentication and signed object URLs. The Dockerfile is prepared, but an actual container build remains unverified because the local Docker daemon is not running.
