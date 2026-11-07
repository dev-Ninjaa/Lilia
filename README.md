# Lilia REST backend

Initial backend for the Lilia agent transaction security service. This repository contains the REST API and persistent SQLite storage only; it does not include Solana execution, an MCP server, or a frontend.

## Requirements

- Bun (current stable release)
- Node-compatible environment for the built-in cryptography APIs

## Setup

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

The API listens on `http://localhost:4000` by default. See [API.md](./API.md) for all contracts and manual PowerShell requests.

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

No automated test suite or tests directory is included.
