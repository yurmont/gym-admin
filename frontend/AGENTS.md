<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Formatting

- Use the owning application's Prettier configuration for every new or modified supported file, including SQL and TOML.
- Run `npm run format` and `npm run format:check` inside each modified application folder before handing off the work. Format explicit shared root/docs/CI paths using frontend/node_modules/prettier/bin/prettier.cjs --config frontend/.prettierrc.json --ignore-path frontend/.prettierignore from the repository root; never format the entire repository without application-specific ignore paths.
- Run `npm run typecheck` inside the owning application folder after TypeScript or TSX changes.
- Preserve existing user changes; formatting must not change application behavior.
- Respect `.prettierignore`: do not format dependencies, generated files, and local secrets.
- Keep these instructions outside the generated Next.js block. Next.js regenerates that block; `AGENTS.md` and `CLAUDE.md` are excluded from automated formatting for that reason.
