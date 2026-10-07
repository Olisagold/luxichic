# Luxichic

Monorepo for the Luxichic platform.

## Structure

- `apps/web` — Next.js frontend
- `apps/api` — Laravel API
- `packages/` — shared `types`, `validation`, `ui`, and `config` (ESLint / TypeScript)
- `database/` — migrations, seeders, factories, documentation
- `docs/` — architecture, API, database, business rules, integrations, deployment
- `scripts/` — setup, database, deployment scripts
- `storage/` — uploads, products, services, temporary files
- `legacy/luxichic-react` — previous Vite + React frontend

## Getting started

```bash
pnpm install
pnpm dev
```
