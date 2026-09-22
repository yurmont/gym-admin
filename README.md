# Gym Admin

SportSuite 360 is split into two independently built and deployed applications. Each application owns its dependencies, lockfile, configuration, environment files and build output.

- [Frontend](frontend/README.md): Next.js UI, browser authentication and Firebase Hosting.
- [Backend](backend/README.md): NestJS API, authorization, Neon PostgreSQL and GCS.
- [Architecture](docs/architecture.md): ownership and API boundary.
- [Local integration and deployment](docs/DEPLOYMENT.md): running both applications together.
- [API contract](docs/API.md): REST routes and payloads.

## Application layout

| Application | Path        | Runtime role                                                                            | Main output                                                |
| ----------- | ----------- | --------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Frontend    | `frontend/` | Next.js browser UI with Firebase Authentication                                         | Static export in `frontend/out/`                           |
| Backend     | `backend/`  | NestJS REST API with Firebase Admin auth, tenant authorization, Neon PostgreSQL and GCS | Compiled Node.js app in `backend/dist/` and a Docker image |

The repository root has no npm project, application dependencies or Prettier configuration. Source belongs to `frontend/src/` or `backend/src/`. Generated `frontend/.next/`, `frontend/out/`, `backend/dist/` and `node_modules/` directories are ignored.

## Build and validation

Use Node.js 24. Run commands from the owning application folder.

Frontend:

```sh
cd frontend
npm ci
npm run format
npm run format:check
npm run typecheck
npm run build
```

`npm run build` creates the static `out/` directory. `npm start` serves that export locally.

Backend:

```sh
cd backend
npm ci
npm run format
npm run format:check
npm run typecheck
npm test
npm run build
```

`npm run build` compiles TypeScript into `dist/`. `npm test` also builds first and runs the backend regression suite against disposable local PostgreSQL.

## Local development

Configure `frontend/.env.local` from `frontend/.env.example` with public Firebase values and `NEXT_PUBLIC_API_URL` ending in `/api/v1`. Configure `backend/.env` from `backend/.env.example` with server-only database, Firebase and storage settings.

From the repository root, start local PostgreSQL when needed:

```sh
docker compose -f backend/compose.yaml up -d postgres
```

For local authentication, run the Firebase Auth Emulator from `backend/`:

```sh
npx firebase-tools emulators:start --config firebase-emulators.json --only auth --project demo-gym-admin
```

Then run the applications in separate terminals:

```sh
cd backend
npm run migrate
npm run bootstrap -- FIREBASE_UID "My gym" "Administrator"
npm run build
npm run dev
```

```sh
cd frontend
npm run dev
```

The frontend runs on `http://localhost:3000`. The backend API runs on port `8080` and must allow the frontend origin through CORS.

## Deployment

The applications deploy independently.

### Frontend: Firebase Hosting

The frontend is a static Next.js export. Firebase Hosting configuration lives in `frontend/firebase.json`, uses the `yurmont-gym` hosting site and serves `frontend/out/`.

Before building for production, set `frontend/.env.local` to production public Firebase values and the deployed backend API URL. Remove the local auth emulator setting.

```sh
cd frontend
npm run build
npx firebase-tools deploy --only hosting --project PROJECT
```

Public environment values are embedded during the build, so configuration changes require a new build and deploy.

### Backend: Google Cloud Run

The backend deploys as a Node.js 24 Docker container to Google Cloud Run. Runtime data services are Neon PostgreSQL for the database and Google Cloud Storage for private member files. Firebase Admin verifies browser Firebase ID tokens.

Build and push the image from `backend/`:

```sh
cd backend
docker build -t REGION-docker.pkg.dev/PROJECT/REPOSITORY/gym-api:TAG .
docker push REGION-docker.pkg.dev/PROJECT/REPOSITORY/gym-api:TAG
```

Deploy the image to Cloud Run with Secret Manager supplying `DATABASE_URL` and environment variables for Firebase, GCS, CORS and database pool sizing. The backend listens on `PORT`, exposes public health endpoints and protects business routes with Firebase bearer tokens.

Before declaring the cloud deployment ready, verify real Firebase login/logout, authorized and cross-tenant API access, Neon transactions, signed GCS upload/download behavior and frontend deep links.

## Ownership notes

Local database and Firebase credentials remain in their owning application's ignored environment files. The Auth Emulator configuration in `backend/firebase-emulators.json` is local-only and is never deployed.

See [Current file locations and formatting](docs/architecture.md) for ownership and shared-file commands.
