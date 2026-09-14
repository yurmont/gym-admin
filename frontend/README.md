# Gym Admin frontend

Independent Next.js application with static export for Firebase Hosting. All browser code lives in src/. Configuration and environment files live in this directory.

## Development

Use Node.js 24. Run all commands from this directory:

```sh
npm ci
# Copy .env.example to .env.local and configure public Firebase/API settings.
npm run dev
```

The UI runs at http://localhost:3000. Set NEXT_PUBLIC_API_URL to the backend URL ending in /api/v1. The browser sends Firebase ID tokens; database and GCS credentials belong exclusively to the backend. Local authentication needs a running Firebase Auth Emulator or a configured Firebase project. Set NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL to the emulator URL (normally http://127.0.0.1:9099); the frontend does not need the emulator configuration file.

## Validation and preview

```sh
npm run format
npm run format:check
npm run typecheck
npm run build
npm start
```

The build exports out/. npm start serves that directory locally. Components and features use the @/ alias pointing to src/. No backend source files are imported.

## Hosting

Set .env.local to public production Firebase settings and the deployed API URL. Remove NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_URL, then run:

```sh
npm run build
npx firebase-tools deploy --only hosting --project PROJECT
```

firebase.json serves out/ with static routes and headers. No SSR server is deployed. Public environment values are embedded during the build; changing them requires rebuilding.

This directory can be copied into a separate repository and installed, checked and built independently.

## File ownership

Paths in this guide are relative to frontend/. Routes live in src/app/, reusable UI in src/components/, feature views in src/features/ and browser integration code in src/lib/. The preview script is scripts/serve-frontend.mjs. Next.js, Tailwind, PostCSS and TypeScript configuration remain at this application's root.

Both package.json and package-lock.json belong here. Formatting uses this directory's .prettierrc.json and .prettierignore. CI is defined at ../.github/workflows/frontend.yml in the combined repository.
