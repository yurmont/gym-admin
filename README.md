# SportSuite 360 � Next.js + NestJS

Multi-tenant gym administration: members, plans, memberships, payments, attendance and dashboard. The UI and business behavior are preserved from the existing MVP.

## Architecture

- Next.js App Router, React, TypeScript and Tailwind; static export for Firebase Hosting.
- Firebase Authentication Web SDK for login/session management.
- NestJS REST API with versioned routes and Firebase Admin ID-token verification.
- Neon PostgreSQL accessed directly from NestJS using a server-only DATABASE_URL connection string and node-postgres. No ORM migration is required.
- Private Google Cloud Storage member photos with authorized signed URLs.
- Containerized NestJS for Cloud Run, production database secrets from Secret Manager, structured JSON logs for Cloud Logging.

Browsers call the API with Firebase Bearer ID tokens. Only NestJS holds database access; tenant and role authorization are enforced on every business API. Registration alone does not grant gym access.

## Local setup

Use Node.js 24 LTS. Run npm ci, copy the environment examples, start local PostgreSQL and the Firebase Auth Emulator, migrate the new schema, create an Auth user and bootstrap its administrator profile. Full commands are in [Deployment and local setup](docs/DEPLOYMENT.md).

Run npm run dev for the frontend and npm run dev:backend for the API. For Neon, configure backend/.env DATABASE_URL with the pooled Neon connection string, including TLS settings supplied by Neon. DATABASE_DIRECT_URL is optional for migrations and is never a frontend setting.

## Validation

```sh
npm run format
npm run format:check
npm run typecheck
npm run test:backend
npm run build
```

Backend tests use a disposable real PostgreSQL instance with no cloud resources. They preserve service tests and add NestJS HTTP, authentication/authorization, CRUD and storage adapter tests. Production frontend builds export to out/; npm start previews these static files locally.

## Main API routes

/api/v1/me, /members, /membership-plans, /memberships, /payments, /attendances and /dashboard. Membership create/renew/cancel, payment register/void, and attendance check-in/check-out retain their existing business rules and response envelopes. Public /health and /health/ready provide liveness and database readiness.

## Structure

```text
app/, components/, features/     frontend routes and UI
lib/firebase/                   Firebase Web authentication
lib/api/                        Bearer-token REST client
backend/src/auth/               Firebase Admin guard and profiles
backend/src/database/           node-postgres connection provider
backend/src/domain/             transactional business services
backend/src/resources/          REST controllers, reads and CRUD
backend/src/storage/            private GCS photo service
backend/migrations/             provider-independent schema
backend/test/                   local service and HTTP tests
backend/Dockerfile              multi-stage Cloud Run container
firebase.json                   static Hosting and Auth Emulator
compose.yaml                    development PostgreSQL
```

## Migration and deployment

See [Migration plan](docs/MIGRATION_PLAN.md) and [Deployment guide](docs/DEPLOYMENT.md). No cloud infrastructure has been provisioned or deployed by the local migration. Live Firebase, Neon, GCS and Cloud Run acceptance checks remain part of the infrastructure phase.
