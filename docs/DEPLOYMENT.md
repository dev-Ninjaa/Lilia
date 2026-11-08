# Lilia deployment guide

**Program ID:** `51yqX5byrtqTYt1MS2cfo98UqPskzmbdW8SEBvj3FTbz`  
**Status:** Live on the local validator; Devnet pending a funded keypair.

## Components

| Component | Path | Run |
|---|---|---|
| Fastify API | `apps/api` | `bun run dev` (:4000) |
| Next.js dashboard | `apps/web` | `bun run dev` in `apps/web` (:3000) |
| MCP server | `apps/mcp` | `bun run mcp` (stdio) |
| Anchor program | `programs/lilia` | deployed, see below |
| Local validator | `test-ledger/` | `solana-test-validator` (:8899) |

## Prerequisites

- Bun 1.4.4, Node 20+, Rust 1.98 (for the Anchor program)
- Solana CLI 4.3.2 and Anchor CLI 1.2.2 in `~/.local/bin` / `~/.local/share/solana/install/active_release/bin`
- A Solana admin keypair (upgrade authority) at `~/.config/solana/id.json`

## 1. Local validator (current live setup)

```bash
# Start the validator (keeps state in test-ledger/)
solana-test-validator --quiet --ledger test-ledger --rpc-port 8899

# Fund the admin keypair
solana airdrop 100 --url http://127.0.0.1:8899

# Deploy the program (only if the .so changed)
solana program deploy target/deploy/lilia.so \
  --program-id target/deploy/lilia-keypair.json \
  --url http://127.0.0.1:8899 \
  --keypair ~/.config/solana/id.json

# Verify
solana program show 51yqX5byrtqTYt1MS2cfo98UqPskzmbdW8SEBvj3FTbz --url http://127.0.0.1:8899
```

## 2. Backend

```bash
bun install
bun run db:migrate
bun run dev
```

Required `.env` keys (see `.env.example`):

| Key | Purpose |
|---|---|
| `LILIA_API_KEY` | Bearer auth for the API (also used by the web proxy and MCP server) |
| `LILIA_SIGNING_PRIVATE_KEY` / `LILIA_SIGNING_PUBLIC_KEY` | Sentinel Ed25519 keys |
| `SOLANA_RPC_URL` | `http://127.0.0.1:8899` for local, `https://api.devnet.solana.com` for Devnet |
| `LILIA_ADMIN_KEYPAIR_PATH` | Upgrade-authority keypair for admin commands |
| `LILIA_PROGRAM_ID` | Deployed program ID |

## 3. Frontend

```bash
cd apps/web
cp .env.local.example .env.local   # fill LILIA_API_KEY + LILIA_API_BASE_URL
bun run dev
```

## 4. Acceptance run

```bash
bun run devnet:setup   # sentinel, mint, agents, policies (idempotent)
bun run devnet:verify  # 18-check report
bun run devnet:cleanup -- --disable
```

## 5. Devnet deployment

Prerequisite: a **funded** Devnet keypair. Public faucets are currently closed or GitHub-auth-gated (see `docs/PHASE_3_ACCEPTANCE_REPORT.md`).

```bash
# Build + deploy
anchor build
anchor deploy --provider.cluster devnet

# Point the backend at Devnet
# .env: SOLANA_RPC_URL=https://api.devnet.solana.com
# .env: LILIA_ADMIN_KEYPAIR_PATH=/path/to/funded/admin.json

bun run devnet:setup
bun run devnet:verify
```

## 6. CI/CD

- **CI** (`.github/workflows/ci.yml`): on every push/PR — install, Turbo build, typecheck, lint, Solana tests, Rust tests.
- **Deploy** (`.github/workflows/deploy.yml`): manual (`workflow_dispatch`) — builds the program and runs the Devnet setup/verify scripts using repository secrets `LILIA_API_KEY`, `ADMIN_KEYPAIR_JSON`, `LILIA_SIGNING_PRIVATE_KEY`, `LILIA_SIGNING_PUBLIC_KEY`.

## 7. Upgrading the program

```bash
solana program deploy target/deploy/lilia.so \
  --program-id target/deploy/lilia-keypair.json \
  --url <cluster> \
  --keypair ~/.config/solana/id.json
```

The admin keypair (`~/.config/solana/id.json`) must match the on-chain upgrade authority. Never commit `.env`, keypairs, or `.devnet/`.

## Troubleshooting

| Symptom | Fix |
|---|---|
| Validator port busy | `pkill -f solana-test-validator` or use another port |
| `EADDRINUSE :4000` | Another API instance is running |
| Program not found on cluster | Redeploy (step 1) |
| Devnet airdrop fails | Expected — use a funded keypair or the manual deploy workflow |
