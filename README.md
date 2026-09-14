# SportSuite 360

Two independent applications share this repository. Each owns its dependencies, lockfile, configuration, environment files and build output.

- [Frontend](frontend/README.md): Next.js UI, browser authentication and Firebase Hosting.
- [Backend](backend/README.md): NestJS API, authorization, Neon PostgreSQL and GCS.
- [Architecture](docs/architecture.md): ownership and API boundary.
- [Local integration and deployment](docs/DEPLOYMENT.md): running both applications together.
- [API contract](docs/API.md): REST routes and payloads.

Run `npm ci` and `npm run dev` inside `frontend/`. Run `npm ci`, `npm run build` and `npm run dev` inside `backend/`. Each application has its own `format`, `format:check` and `typecheck` commands. Backend tests run with `npm test` inside `backend/`.

The repository root has no npm project, application dependencies or Prettier configuration. See [Current file locations and formatting](docs/architecture.md) for ownership and shared-file commands.

Source belongs to frontend/src/ or backend/src/. Generated frontend/.next/, frontend/out/, backend/dist/ and node_modules/ directories are ignored. Local database and Firebase credentials remain in their owning application's ignored environment files.
