# Application boundaries

frontend/ and backend/ are independent npm projects with separate lockfiles. The repository root has no npm manifest, lockfile or application dependencies. No npm workspaces or cross-application source imports are used.

| Owner     | Responsibilities                                                                                                                                                  |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| frontend/ | UI, Firebase Web SDK, Bearer-token API client, client-facing types, static export and Firebase Hosting                                                            |
| backend/  | Firebase Admin verification, tenant/role authorization, business transactions, Neon PostgreSQL, schema migrations, Auth Emulator configuration, GCS and Cloud Run |
| docs/     | Architecture, versioned REST contract and product scope                                                                                                           |
| root      | Git, CI, agent instructions and shared documentation                                                                                                              |

The frontend communicates through /api/v1 using Firebase ID tokens. Both applications use the same Firebase project, but only the backend resolves database profiles and permissions. Client identity, tenant and role fields never establish authorization.

Each application carries its own formatting configuration. The root has no Prettier configuration; shared documentation and CI files are formatted using explicit paths and frontend/.prettierrc.json with frontend/.prettierignore. Frontend build output is frontend/.next/ and frontend/out/; backend output is backend/dist/. Environment files are application-local and ignored. Backend database and GCS credentials never belong to frontend files.

## Current file locations

All paths below are relative to the repository root.

| Purpose                                                 | Current location                                                                                                  |
| ------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Frontend routes                                         | `frontend/src/app/`                                                                                               |
| UI and feature modules                                  | `frontend/src/components/`, `frontend/src/features/`                                                              |
| Browser API, auth and types                             | `frontend/src/lib/`                                                                                               |
| Next.js, Tailwind, PostCSS and TypeScript configuration | `frontend/next.config.ts`, `frontend/tailwind.config.ts`, `frontend/postcss.config.mjs`, `frontend/tsconfig.json` |
| Frontend environment example and local settings         | `frontend/.env.example`, ignored `frontend/.env.local`                                                            |
| Static preview server                                   | `frontend/scripts/serve-frontend.mjs`                                                                             |
| Firebase Hosting                                        | `frontend/firebase.json`                                                                                          |
| Backend source, SQL and tests                           | `backend/src/`, `backend/migrations/`, `backend/test/`                                                            |
| Backend environment example and local secrets           | `backend/.env.example`, ignored `backend/.env`                                                                    |
| Local PostgreSQL                                        | `backend/compose.yaml`                                                                                            |
| Local Firebase Auth Emulator                            | `backend/firebase-emulators.json`                                                                                 |
| Backend container build context                         | `backend/`, with `backend/Dockerfile` and `backend/.dockerignore`                                                 |
| Dependencies and lockfiles                              | `frontend/package.json`, `frontend/package-lock.json`, `backend/package.json`, `backend/package-lock.json`        |
| Formatting                                              | `.prettierrc.json` and `.prettierignore` inside each application                                                  |
| CI                                                      | `.github/workflows/frontend.yml`, `.github/workflows/backend.yml`                                                 |

There are no root npm or Prettier configuration files. The temporary `.local-tools/` and `.npm-cache/` folders and optional `.vscode/` settings were removed; they are not required to run either application.

## Formatting shared files

After installing frontend dependencies, run from the repository root:

```sh
node frontend/node_modules/prettier/bin/prettier.cjs --config frontend/.prettierrc.json --ignore-path frontend/.prettierignore --write README.md docs .github
node frontend/node_modules/prettier/bin/prettier.cjs --config frontend/.prettierrc.json --ignore-path frontend/.prettierignore --check README.md docs .github
```

Run npm run format and npm run format:check inside each application for its own files. Shared-file commands use explicit paths to avoid formatting dependencies, build output or local secrets.

## Separate repository extraction

Copy either application directory as the new repository root. Its package.json, package-lock.json, formatting configuration, environment example, README and deployment files are self-contained. Copy its CI workflow separately and remove its working-directory and cache path prefixes. Carry docs/API.md as the API contract reference when splitting the repositories.

Changes to a REST contract must preserve compatibility or introduce a new API version. There is no shared runtime/type package; future generated client types should come from an explicit API contract.

The backend owns firebase-emulators.json for optional local Auth testing. Both applications connect to the emulator over localhost; neither imports configuration from the other. The frontend can instead use a real Firebase project. Temporary validation artifacts and npm download caches are not application source and need not be retained in the repository.
