# Environment variables

Three places read configuration:

| File | Read by | Notes |
|---|---|---|
| `/.env` (repo root) | API (`apps/api`), `scripts/`, MCP server | Template: `.env.example`. Gitignored. |
| `/apps/web/.env.local` | Next.js server only | Template: `apps/web/.env.local.example`. Never prefix with `NEXT_PUBLIC`. |
| GitHub Actions secrets | `.github/workflows/deploy.yml` | `ADMIN_KEYPAIR_JSON`, `LILIA_API_KEY`, `LILIA_SIGNING_PRIVATE_KEY`, `LILIA_SIGNING_PUBLIC_KEY` |

## Root `.env` (API, scripts)

Validated at startup by `apps/api/src/config/env.ts`; an invalid value stops the API.

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `LILIA_API_KEY` | **Yes** (min 24 chars) | none | Bearer key every client must send. Same value goes in `apps/web/.env.local` and the MCP host config. |
| `LILIA_SIGNING_PRIVATE_KEY` | **Yes** for permits | empty | Ed25519 private key (PEM) that signs permits. Generate with `bun run db:generate-key`. Secret. |
| `LILIA_SIGNING_PUBLIC_KEY` | **Yes** for permits | empty | Matching public key (PEM). |
| `SOLANA_RPC_URL` | For on-chain (v2) features | empty | e.g. `https://api.devnet.solana.com`. Empty means v2 endpoints return 503. |
| `SOLANA_RPC_COMMITMENT` | No | `confirmed` | `processed`, `confirmed` or `finalized`. |
| `LILIA_PROGRAM_ID` | No | `51yqX5by...3FTbz` | Deployed program address. |
| `LILIA_ADMIN_KEYPAIR_PATH` | For on-chain admin | empty | Path to the Solana keypair JSON that is the program upgrade authority. Prefer this over the inline form. |
| `LILIA_DEMO_TRANSFER_AUTHORITY` | No | empty | Devnet demo only: inline keypair JSON used by `POST /api/transactions/demo-sign` so the Transfers page can sign without a wallet. Never set on mainnet. Secret. |
| `LILIA_ADMIN_KEYPAIR` | No | empty | Inline keypair JSON alternative (CI/containers). Secret. |
| `LILIA_SENTINEL_PUBLIC_KEY` | No | derived from signing key | Base58 key the on-chain `SentinelAuthority` trusts. |
| `LILIA_PERMIT_TTL_SLOTS` | No | `300` | Permit lifetime in slots (1 to 10000). |
| `LILIA_SLOT_TIME_MS` | No | `400` | Slot time used to convert wall-clock expiry to slots (100 to 2000). |
| `PORT` | No | `4000` | API port. |
| `HOST` | No | `0.0.0.0` | API bind address. |
| `NODE_ENV` | No | `development` | `development`, `production` or `test`. |
| `DATABASE_URL` | No | `./database/lilia.db` | SQLite file path. |
| `GEMINI_API_KEY` | No | empty | Accepted but currently unused (reports `configured_but_unused`). |

### Script-only (not in `.env`)

| Variable | Default | Purpose |
|---|---|---|
| `DEVNET_API_URL` | `http://127.0.0.1:$PORT` | API the `scripts/devnet/*` scripts call. |

## `apps/web/.env.local` (Next.js server)

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `LILIA_API_KEY` | **Yes** | none | Must equal the root `LILIA_API_KEY`. Used server-side only. |
| `LILIA_API_BASE_URL` | No | `http://127.0.0.1:4000` | Where the API runs. No trailing slash. |

## MCP server (`apps/mcp`, set in the MCP host config)

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `LILIA_API_KEY` | **Yes** | none | Bearer key for the API. |
| `LILIA_API_BASE_URL` | No | `http://127.0.0.1:4000` | API URL. |
| `SOLANA_NETWORK` | No | `devnet` | Informational label. |

## Current local setup

All required variables are set for local use against **devnet**. `GEMINI_API_KEY` is intentionally empty (unused). Secrets (`LILIA_API_KEY`, `LILIA_SIGNING_PRIVATE_KEY`, keypair files) must never be committed or pasted into docs.
