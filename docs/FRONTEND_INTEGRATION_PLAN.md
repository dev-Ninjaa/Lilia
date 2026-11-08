# Frontend integration plan

**Date:** November 8, 2026  
**Status:** Implemented (Scope A + agent/policy write actions via the proxy).  
**Goal:** Wire the existing Next.js dashboard (`apps/web`) to the real Lilia backend API and Solana v2 endpoints, replacing mock data with live data in stages.

Implemented: `src/app/api/lilia/[...path]/route.ts` proxy (server-side bearer key), `src/lib/api.ts` client, `src/lib/mappers.ts` backend→view mapping, live Overview/Agents/Policies/Transactions/Threats/Integrations tabs, real Simulation Lab runs (off-chain only), and working agent register/disable + policy create. On-chain transfer from the UI remains out of scope until Devnet can be funded.

## Current state

The frontend is a polished but fully mock-driven Next.js 16.4.5 / React 19 app. `src/app/page.tsx` seeds local state from `src/lib/mockData.ts`; all view components are presentational and receive props. There are no `fetch()` calls to the backend — only static text snippets (an MCP config and a cURL example in `IntegrationsView`) mention the API. The backend already exposes every screen's data behind a single Bearer API key, with a `{ success, data, meta }` envelope.

## Scope options

| Scope | Contents |
|---|---|
| **A. Read-only + simulation** | Live Dashboard, Agents, Policies, Transactions, Threats, Integrations status, real simulation runs |
| **B. A + write actions** | Agent/policy CRUD and on-chain admin, evaluate + authorize (v2), prepare, submit |
| **C. Full loop** | B plus client-signed on-chain transfer from the UI |

Recommended start: **A**, then B. C waits until Devnet can be funded.

## Architecture

```
apps/web (Next.js, :3000)
  ├─ src/lib/api.ts          # typed client: envelope unwrap, error mapping
  ├─ src/lib/mappers.ts      # backend → view-model mapping
  └─ app/api/lilia/[...path] # server-side proxy (holds LILIA_API_KEY)
        │  HTTPS, Bearer key (server-only)
        ▼
Fastify API (:4000)
  └─ /api/agents, /api/policies, /api/transactions, /api/security/*,
     /api/sentinel/*, /api/v2/*, /api/solana/*, /api/simulation/*
```

**Proxy vs CORS.** The backend has no `@fastify/cors`, so browser calls would fail. Preferred: a Next.js route-handler proxy that injects the key server-side — the key never ships to the client. Alternative: add dev-only CORS (`http://localhost:3000`) to Fastify and expose the key via `NEXT_PUBLIC_*` — faster, but the key is visible in the browser. The proxy route-handler is the secure default; it also matches the single-owner model (one key, one owner).

**Next 16 note.** `apps/web/AGENTS.md` warns this Next.js has breaking changes and requires reading the relevant guide in `node_modules/next/dist/docs/` before writing code. Follow that before the proxy and data-fetching work.

## Screen → endpoint mapping

| Screen | Endpoints | Mapper work |
|---|---|---|
| Dashboard | `GET /api/security/overview`, `GET /api/agents`, `GET /api/transactions` | Aggregate counts; map status enums |
| Agents | `GET /api/agents`, `POST /api/agents/register`, `PATCH /api/agents/:id`, `POST /api/agents/:id/disable`, `POST .../register-on-chain`, `POST .../status-on-chain` | Map UUID/`transferAuthority`/`onChainRegistryPda` → view model; drop fake `dailyCap` |
| Policies | `GET /api/policies`, `POST /api/policies`, `POST /api/policies/:id/publish-on-chain` | Map `maxTransferAmount` decimal string → number; `allowedMint` → `supportedMint` |
| Transactions | `GET /api/transactions`, `GET /api/transactions/:signature` | Map `status`/`flowVersion`/`slot` to the view's `EXECUTED/REJECTED_*` states |
| Threats | `GET /api/security/events` | Map `eventType`/`severity` enums |
| Integrations | `GET /api/integrations`, `GET /api/integrations/solana/status`, `GET /api/integrations/mcp/status`, `GET /api/solana/status` | New live status panel (program ID, slot, Sentinel key, configured/unconfigured) |
| Simulation Lab | `POST /api/simulation/run` | Replace canned logs with real decision; label `blockchainExecution: "not_performed"` honestly |

## Phases

### Phase 1 — API foundation
- Add `src/lib/api.ts` and `src/lib/mappers.ts`.
- Add the server-side proxy route handlers under `src/app/api/lilia/`.
- Add `.env.local` example (server-only key) and document it in `apps/web/README.md`.
- Verify: `bun run build` + `bun run lint` inside `apps/web`.

### Phase 2 — Read-only integration (Scope A)
- Fetch and render `/api/security/overview`, agents, policies, transactions, events.
- Add loading, error, and empty states to each view.
- Add the live status panel in Integrations.
- Verify with the API running: each tab shows real rows from SQLite; empty DB shows empty states, not mock rows.

### Phase 3 — Real simulation (Scope A)
- Call `POST /api/simulation/run` from SimulationLab.
- Show the actual decision and reason; remove fake tx hashes; keep the "no on-chain execution" label.

### Phase 4 — Write actions (Scope B)
- Wire agent register/toggle, policy create, evaluate, authorize v2, prepare, submit buttons to their endpoints.
- Surface `400/401/403/503` errors in the UI (especially `SOLANA_NOT_CONFIGURED`).
- Verify: full flow creates real rows and records real signatures.

### Phase 5 — Optional on-chain transfer (Scope C)
- Only after Devnet funding. Client-side signing with a demo transfer-authority keypair; clearly label demo-grade key handling.

## Verification

- `bun run typecheck`, `bun run lint`, `bun test packages/solana`, `cargo test -p lilia` (root, unchanged).
- `bun run build` + `bun run lint` inside `apps/web` (separate workspace).
- Manual pass against a running API: every tab reflects real data; no mock rows remain.

## Risks and constraints

- **Security:** never expose `LILIA_API_KEY` to the client; the proxy holds it.
- **Scope creep:** keep C out until Devnet is funded.
- **Data honesty:** simulation must keep "not performed" labeling; no fake signatures.
- **Next 16 conventions:** read the docs under `node_modules/next/dist/docs/` before implementing route handlers and data fetching.
