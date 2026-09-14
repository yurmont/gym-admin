# Infrastructure and deployment

Local code can be built and tested without cloud accounts. Infrastructure has not been created. These steps are a later provisioning/cutover phase; no commands below run automatically.

## Local development

Use Node.js 24 LTS and npm. Run `npm ci` from the repository root.

For normal local development, start Docker Desktop and run `docker compose up -d postgres`. Copy `backend/.env.example` to `backend/.env`, then run `npm run db:migrate`.

Copy the root `.env.example` to `.env.local`; preserve any existing local environment file before replacing its old Supabase settings. Start Firebase Auth Emulator with `npx firebase-tools emulators:start --only auth --project demo-gym-admin`. Emulator UI runs at http://127.0.0.1:4000. Create an email/password user in the emulator and copy its Firebase UID.

Grant that user a gym administrator profile with:

```sh
npm run bootstrap --workspace @gym-admin/backend -- FIREBASE_UID "My gym" "Administrator"
```

The bootstrap command creates a tenant and profile in a transaction. It does not create a Firebase account, and fails safely if the UID already has a profile. New Firebase registrations have no database role until explicitly provisioned. Do not accept a client-supplied tenant or role when registering users.

Run `npm run dev:backend` and `npm run dev` in separate terminals. Backend development builds before starting; after changing backend TypeScript, run `npm run build:backend` or run `npm exec --workspace @gym-admin/backend -- tsc -p tsconfig.json --watch` in another terminal. Node watches compiled output and restarts the API. Frontend runs on port 3000; API on 8080.

GCS operations need a real private bucket and local Application Default Credentials (`gcloud auth application-default login`), including signing permission. Auth/CRUD/business flows work with the Auth Emulator and local PostgreSQL without GCS. The automated storage suite substitutes the provider adapter; it does not pretend to validate live IAM or actual signed URL signatures.

## Automated validation

```sh
npm run format
npm run format:check
npm run typecheck
npm run test:backend
npm run build
```

The backend suite starts a new temporary native PostgreSQL cluster using the test-only embedded PostgreSQL package. It applies only the new `backend/migrations` schema, runs service/transaction/concurrency and NestJS HTTP tests, then shuts down and deletes only its own temporary directory. It never migrates the developer's DATABASE_URL. Windows uses pg_ctl's restricted process token; Linux CI must run as a non-root user. Native dependency installation scripts must be enabled/approved if your npm policy blocks them.

The API tests verify the shared authentication guard through an injected Firebase identity adapter and real PostgreSQL profiles. Invalid/expired tokens, absent profiles, inactive accounts, manager/instructor roles and tenant isolation are tested. Live Firebase token issuance and live GCS signing are infrastructure acceptance checks.

## Provisioning checklist

1. Create a Google Cloud/Firebase project, enable billing and Cloud Run, Artifact Registry, Secret Manager, IAM Credentials, Storage, Logging and Monitoring APIs. Register a Firebase Web app and enable email/password Authentication. Add the deployed frontend domain to Auth authorized domains.
2. Create a Neon PostgreSQL database near the chosen Cloud Run region. Create separate migration and restricted runtime database roles. Apply the new schema using a direct connection; use Neon's pooled host for serving traffic. Grant the runtime role only required CRUD access on business tables; do not grant schema modification or access to unrelated databases.
3. Create a private GCS bucket with uniform bucket-level access and public access prevention. Configure bucket CORS for the frontend origin, GET/PUT methods and Content-Type/x-goog-if-generation-match headers. Configure object lifecycle rules for unattached/old uploads according to retention needs. Upload confirmation enforces image content-type and a 5 MiB limit; unconfirmed objects must not become member photos.
4. Create a dedicated Cloud Run service account with bucket-scoped object access. Give it Secret Manager Secret Accessor on the database secret, and permission to sign blobs using its service identity (IAM Service Account Token Creator scoped to that account). Do not distribute private keys.
5. Store the pooled DATABASE_URL in Secret Manager. Additional external API credentials also belong in Secret Manager when introduced. Firebase project ID, bucket name and explicit frontend CORS origins are configuration, not private keys.

## Database migration

Use `npm run check:db --workspace @gym-admin/backend` for a read-only connectivity, client TLS certificate and schema-presence check. The script never prints the URL/password. Neon terminates TLS at its proxy, so server-side pg_stat_ssl does not necessarily describe the client-to-proxy connection.

Set DATABASE_DIRECT_URL to the direct Neon connection and run `npm run db:migrate`. The migration runner serializes application with a PostgreSQL advisory lock and tracks files in schema_migrations. Keep applied SQL files immutable; add numbered files for future changes.

Do not apply `supabase/migrations` to Neon. Those files remain legacy references and include Supabase-specific schemas and roles. There is no deployed data migration because infrastructure did not previously exist.

## Cloud Run

Build the image from the repository root:

```sh
docker build -f backend/Dockerfile -t REGION-docker.pkg.dev/PROJECT/REPOSITORY/gym-api:TAG .
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

## Firebase Hosting

Set the root frontend environment to real public Firebase Web settings and the deployed API URL ending in `/api/v1`. Remove NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL before building. Backend credentials never belong in root frontend environment files.

```sh
npm run build
npx firebase-tools deploy --only hosting --project PROJECT
```

The checked-in firebase.json serves `out/`, including one static directory per route. API calls go to Cloud Run using NEXT_PUBLIC_API_URL and Firebase ID tokens; no Node.js SSR runtime is required for the frontend. Changes to public build configuration require rebuilding.

## Observability and acceptance

Cloud Run collects JSON stdout logs in Cloud Logging. Request entries include generated request ID, route template, method, status, duration, UUID actor and tenant. Tokens, request bodies, private keys, SQL connection strings and raw infrastructure exceptions are omitted. Responses expose X-Request-ID for correlation.

In Cloud Monitoring configure alerts for 5xx rates, request latency, container restarts and max-instance saturation; monitor Neon connection/transaction metrics separately. Dashboards and alert policies must be created during infrastructure provisioning.

Before declaring the cloud deployment ready, verify real Firebase login/logout/refresh and revoked tokens, authorized and cross-tenant API access, Neon transactions, and actual GCS signed upload/confirmation/download/delete. Verify frontend deep links and missing-user access behavior. Automated local provider mocks cannot replace those live acceptance checks.
