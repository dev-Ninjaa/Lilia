# Lilia

Lilia is an agent transaction security service with a Bun/Fastify REST backend, SQLite persistence, and a Solana Token-2022 transfer hook that enforces signed permits on-chain.

## Repository layout

| Path | Purpose |
|---|---|
| `apps/api` | Fastify REST API |
| `apps/web` | Next.js control center (separate workspace) |
| `packages/core` | Domain services, including Solana v2 issuance and submission |
| `packages/solana` | PDA, Permit v2 codec, and transaction-building SDK |
| `packages/schemas` | Zod request schemas |
| `programs/lilia` | Anchor Token-2022 transfer-hook program |
| `database` | SQLite schema and migrations |
| `scripts` | Migration, key generation, and inspection utilities |

## Requirements

- Bun (current stable release)
- Node-compatible environment for the built-in cryptography APIs
- Rust, Solana CLI, and Anchor CLI for the on-chain program

## Backend setup

```powershell
bun install
Copy-Item .env.example .env
bun run db:generate-key
```

The key-generation command prints Ed25519 PEM values; put the private and public values in `.env`, and set a random `LILIA_API_KEY` (at least 24 characters). For a new local development environment, `bun scripts/generate-signing-key.ts --configure-env` creates a private `.env` with random API and signing keys, but refuses to overwrite an existing file.

Run the idempotent migration, then start the server:

```powershell
bun run db:migrate
bun run dev
```

The API listens on `http://localhost:4000` by default. See [API.md](./docs/API.md) for all contracts and manual requests.

## Solana setup

The program ID is `51yqX5byrtqTYt1MS2cfo98UqPskzmbdW8SEBvj3FTbz`. Build and test locally:

```bash
anchor build
cargo test -p lilia
bun test packages/solana
```

To enable the on-chain API flows, set these in `.env`:

```env
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_RPC_COMMITMENT=confirmed
LILIA_PROGRAM_ID=51yqX5byrtqTYt1MS2cfo98UqPskzmbdW8SEBvj3FTbz
LILIA_SENTINEL_PUBLIC_KEY=
LILIA_ADMIN_KEYPAIR_PATH=/absolute/path/to/upgrade-authority.json
LILIA_PERMIT_TTL_SLOTS=300
```

- `LILIA_SENTINEL_PUBLIC_KEY` is the base58 key stored in the on-chain `SentinelAuthority`. When empty it is derived from `LILIA_SIGNING_PUBLIC_KEY`.
- `LILIA_ADMIN_KEYPAIR_PATH` must be the keypair whose public key is the on-chain `upgrade_authority`.
- Without these settings the v2 endpoints return 503 and no transaction is fabricated.

The program, Permit v2 codec, and v2 API flows are implemented and were exercised end-to-end on a local validator: setup, four live transfer scenarios, and an 18-check acceptance run. It is deployed and verified on Devnet (18/18 acceptance checks); addresses are in [DEVNET_DEPLOYMENT.md](./docs/DEVNET_DEPLOYMENT.md). See [PHASE_3_ACCEPTANCE_REPORT.md](./docs/PHASE_3_ACCEPTANCE_REPORT.md) for evidence and [scripts/devnet/README.md](./scripts/devnet/README.md) for the run order.

## Useful commands

| Command | Purpose |
|---|---|
| `bun run dev` | Run API with Bun watch mode |
| `bun run start` | Run API |
| `bun run typecheck` | Strict TypeScript check |
| `bun run lint` | Biome lint |
| `bun run format` | Format project |
| `bun run db:migrate` | Apply pending migrations |
| `bun run db:inspect` | Print database table row counts |
| `bun run db:generate-key` | Generate an Ed25519 key pair |
| `anchor build` | Build the Solana program and IDL |
| `cargo test -p lilia` | Run Rust unit tests |
| `bun test packages/solana` | Run Solana SDK tests |
| `bun run devnet:setup` | Provision the sentinel, mint, agent, and policy |
| `bun run devnet:verify` | Run the 18-check acceptance suite |
| `bun run devnet:cleanup` | Report locked rent (optional `--disable`) |

`apps/web` is a separate Next.js workspace with its own dependencies and lint configuration; it is excluded from the root TypeScript and Biome checks.
