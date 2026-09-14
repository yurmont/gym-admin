# Application boundaries

frontend/ and backend/ are independent npm projects with separate lockfiles. The repository root has no npm manifest, lockfile or application dependencies. No npm workspaces or cross-application source imports are used.

| Owner     | Responsibilities                                                                                                                                                  |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| frontend/ | UI, Firebase Web SDK, Bearer-token API client, client-facing types, static export and Firebase Hosting                                                            |
| backend/  | Firebase Admin verification, tenant/role authorization, business transactions, Neon PostgreSQL, schema migrations, Auth Emulator configuration, GCS and Cloud Run |
| docs/     | Architecture, versioned REST contract and product scope                                                                                                           |
| root      | Git, CI, editor/agent instructions and shared documentation                                                                                                       |

The frontend communicates through /api/v1 using Firebase ID tokens. Both applications use the same Firebase project, but only the backend resolves database profiles and permissions. Client identity, tenant and role fields never establish authorization.

Each application carries its own formatting configuration. The root has no Prettier configuration; shared documentation and CI files are formatted using explicit paths and frontend/.prettierrc.json with frontend/.prettierignore. Frontend build output is frontend/.next/ and frontend/out/; backend output is backend/dist/. Environment files are application-local and ignored. Backend database and GCS credentials never belong to frontend files.

## Separate repository extraction

Copy either application directory as the new repository root. Its package.json, package-lock.json, formatting configuration, environment example, README and deployment files are self-contained. Copy its CI workflow separately and remove its working-directory and cache path prefixes. Carry docs/API.md as the API contract reference when splitting the repositories.

Changes to a REST contract must preserve compatibility or introduce a new API version. There is no shared runtime/type package; future generated client types should come from an explicit API contract.

The backend owns firebase-emulators.json for optional local Auth testing. Both applications connect to the emulator over localhost; neither imports configuration from the other. The frontend can instead use a real Firebase project. Temporary validation artifacts and npm download caches are not application source and need not be retained in the repository.
