# Local integration and deployment

Install frontend and backend independently with npm ci in each folder. Run build, formatting, type checking and test commands inside their owning application folder.

## Run both applications

1. Configure frontend/.env.local from frontend/.env.example with public Firebase settings and an API URL ending in /api/v1.
2. Configure backend/.env from backend/.env.example with server-only database settings and the same Firebase project. Preserve existing Neon credentials.
3. For a local database run docker compose -f backend/compose.yaml up -d postgres. Run migrations only against the database you intend to initialize.
4. From backend/, start the Auth Emulator:

```sh
npx firebase-tools emulators:start --config firebase-emulators.json --only auth --project demo-gym-admin
```

Create a user in the emulator UI at http://127.0.0.1:4000 and copy its Firebase UID. Set the matching emulator settings in both application environment files. From backend/, run npm run migrate and npm run bootstrap -- FIREBASE_UID "My gym" "Administrator" against your local database.

Start npm run dev from frontend/ and npm run build followed by npm run dev from backend/ in separate terminals. Frontend runs on port 3000 and API on 8080. Backend CORS must permit the frontend origin.

## Deploy independently

Follow [Frontend Hosting](../frontend/README.md) and [Backend Cloud Run, Neon and GCS](../backend/README.md). Frontend hosting configuration belongs to frontend/firebase.json. The Auth Emulator configuration belongs to backend/firebase-emulators.json. It is optional local development tooling and is never deployed; both applications connect to it over localhost.

Neon connectivity has been verified, but the application schema has not been applied there. Firebase/GCS/Cloud Run provisioning and live acceptance checks remain pending. No infrastructure commands run automatically.
