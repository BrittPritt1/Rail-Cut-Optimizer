# Rail Cut Calculator

Plan low-waste cuts from 6-meter aluminium rails by reusing saved dimensions and entering the required quantity for each.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (port 5000)
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- `artifacts/rail-cut-calculator/src/App.tsx` — calculator workspace and interaction states
- `artifacts/api-server/src/routes/` — dimension collection and cut-plan endpoints
- `artifacts/api-server/src/lib/cut-plan-optimizer.ts` — rail packing domain logic
- `lib/db/src/schema/dimensions.ts` — saved dimension table
- `lib/api-spec/openapi.yaml` — source of truth for API contracts
- `artifacts/rail-cut-calculator/src/index.css` — visual theme and workshop surface

## Architecture decisions

- API contracts are defined in OpenAPI and generated into typed React Query hooks and Zod schemas.
- The cut planner uses a strategy boundary: best-fit decreasing provides a fast upper bound, then bounded branch-and-bound searches for fewer rails.
- Offcuts are classified against the full saved dimension collection, so reusable material is separated from true unusable waste even when its quantity is zero in the current plan.
- Route handlers stay thin; validation and persistence live at the boundary while optimization remains framework-independent.
- Dimensions are stored as reusable server-side records and the initial set is seeded with the common 6-meter stock cuts.

## Product

- Manage reusable aluminium cut dimensions.
- Enter a quantity for each saved dimension.
- Calculate a low-waste arrangement across 6-meter rails.
- Review each rail's cuts, used length, and offcut.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._

## Gotchas

_Populate as you build — sharp edges, "always run X before Y" rules._

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
