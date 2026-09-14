# SportSuite 360 backend

Independent NestJS REST API. Owns authorization, tenant isolation, business rules, Neon PostgreSQL migrations, Firebase Admin token verification and private GCS objects.

## Local development

Use Node.js 24 and run commands from this directory:

```sh
npm ci
# Copy .env.example to .env, preserving existing credentials.
docker compose up -d postgres
npm run migrate
npm run bootstrap -- FIREBASE_UID "My gym" "Administrator"
npm run build
npm run dev
```

For local Auth testing, start the emulator in a separate terminal from this directory:

```sh
npx firebase-tools emulators:start --config firebase-emulators.json --only auth --project demo-gym-admin
```

The Auth Emulator listens on port 9099 and its UI on port 4000. Configure backend FIREBASE_AUTH_EMULATOR_HOST and the frontend's NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL to point to it, using the same Firebase project ID. Create an Auth user through the emulator UI and copy its Firebase UID for bootstrap. This configuration is local-only and is never deployed.

Configure Firebase Authentication or a local Auth Emulator before bootstrapping an existing Firebase UID. Backend listens on port 8080. Node watches compiled dist/ output; after TypeScript changes run npm run build, or npm exec -- tsc -p tsconfig.json --watch in another terminal. Use npm start for a compiled deployment.

For Neon, save the server-only DATABASE_URL in .env and use npm run check:db for a read-only TLS/schema check. Tests always override database settings with disposable local PostgreSQL and never migrate your Neon database. GCS operations require a private bucket and Application Default Credentials with signing permission.

## Validation

```sh
npm run format
npm run format:check
npm run typecheck
npm test
```

Tests cover real local SQL, transactions, concurrency and HTTP behavior; Firebase/GCS adapters are injected. Windows starts PostgreSQL through pg_ctl's restricted token; Linux tests must run as a non-root user. Native dependency installation scripts must be enabled if required by the npm installation policy.

This directory can be copied into a separate repository and installed, tested, built and containerized without frontend or root files. All commands below run from this directory.

## Provisioning checklist

1. Create a Google Cloud/Firebase project, enable billing and Cloud Run, Artifact Registry, Secret Manager, IAM Credentials, Storage, Logging and Monitoring APIs. Register a Firebase Web app and enable email/password Authentication. Add the deployed frontend domain to Auth authorized domains.
2. Create a Neon PostgreSQL database near the chosen Cloud Run region. Create separate migration and restricted runtime database roles. Apply the new schema using a direct connection; use Neon's pooled host for serving traffic. Grant the runtime role only required CRUD access on business tables; do not grant schema modification or access to unrelated databases.
3. Create a private GCS bucket with uniform bucket-level access and public access prevention. Configure bucket CORS for the frontend origin, GET/PUT methods and Content-Type/x-goog-if-generation-match headers. Configure object lifecycle rules for unattached/old uploads according to retention needs. Upload confirmation enforces image content-type and a 5 MiB limit; unconfirmed objects must not become member photos.
4. Create a dedicated Cloud Run service account with bucket-scoped object access. Give it Secret Manager Secret Accessor on the database secret, and permission to sign blobs using its service identity (IAM Service Account Token Creator scoped to that account). Do not distribute private keys.
5. Store the pooled DATABASE_URL in Secret Manager. Additional external API credentials also belong in Secret Manager when introduced. Firebase project ID, bucket name and explicit frontend CORS origins are configuration, not private keys.

## Database migration

Use `npm run check:db` for a read-only connectivity, client TLS certificate and schema-presence check. The script never prints the URL/password. Neon terminates TLS at its proxy, so server-side pg_stat_ssl does not necessarily describe the client-to-proxy connection.

Set DATABASE_DIRECT_URL to the direct Neon connection and run `npm run migrate`. The migration runner serializes application with a PostgreSQL advisory lock and tracks files in schema_migrations. Keep applied SQL files immutable; add numbered files for future changes.

## Cloud Run

Build the image from this backend directory:

```sh
docker build -t REGION-docker.pkg.dev/PROJECT/REPOSITORY/gym-api:TAG .
docker push REGION-docker.pkg.dev/PROJECT/REPOSITORY/gym-api:TAG
gcloud run deploy gym-api \
  --image REGION-docker.pkg.dev/PROJECT/REPOSITORY/gym-api:TAG \
  --region REGION \
  --service-account gym-api@PROJECT.iam.gserviceaccount.com \
  --allow-unauthenticated \
  --set-secrets DATABASE_URL=gym-database-url:VERSION \
  --set-env-vars FIREBASE_PROJECT_ID=PROJECT,GCS_BUCKET_NAME=BUCKET,CORS_ORIGINS=https://PROJECT.web.app,DB_POOL_MAX=3 \
  --max-instances 5 \
  --concurrency 20
```

Replace every placeholder and secret version before execution. Public Cloud Run invocation is necessary for browser Bearer Firebase tokens; NestJS protects every business route. Health endpoints are public and return no infrastructure details. Do not set FIREBASE_AUTH_EMULATOR_HOST in production; startup rejects it.

The container uses PORT, binds 0.0.0.0, runs as a non-root user, keeps no persistent files, and closes PostgreSQL connections on shutdown. Configure startup/liveness checks against `/health`. `/health/ready` checks database connectivity. Start with conservative maximum instances; a pool of 3 at 5 instances permits up to 15 serving connections, plus migrations and other clients. Budget scaling against Neon limits and measure contention from existing per-tenant transaction locks.

Use an external HTTPS load balancer/Cloud Armor if abuse protection and shared rate limiting are needed. Per-container in-memory counters would not enforce a global limit across autoscaling instances.

## Observability and acceptance

Cloud Run collects JSON stdout logs in Cloud Logging. Request entries include generated request ID, route template, method, status, duration, UUID actor and tenant. Tokens, request bodies, private keys, SQL connection strings and raw infrastructure exceptions are omitted. Responses expose X-Request-ID for correlation.

In Cloud Monitoring configure alerts for 5xx rates, request latency, container restarts and max-instance saturation; monitor Neon connection/transaction metrics separately. Dashboards and alert policies must be created during infrastructure provisioning.

Before declaring the cloud deployment ready, verify real Firebase login/logout/refresh and revoked tokens, authorized and cross-tenant API access, Neon transactions, and actual GCS signed upload/confirmation/download/delete. Verify frontend deep links and missing-user access behavior. Automated local provider mocks cannot replace those live acceptance checks.

## File ownership

Paths in this guide are relative to backend/. Runtime code lives in src/, immutable schema migrations in migrations/, operational scripts in scripts/ and regression tests in test/. Local PostgreSQL configuration is compose.yaml, and local Auth Emulator configuration is firebase-emulators.json.

Dockerfile and .dockerignore belong here; run docker build with this directory as its context. Both package.json and package-lock.json, as well as .prettierrc.json and .prettierignore, are application-local. CI is defined at ../.github/workflows/backend.yml in the combined repository.
