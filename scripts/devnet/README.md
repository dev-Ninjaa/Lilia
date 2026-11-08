# Devnet acceptance scripts

End-to-end scripts for Phases 6, 7, and 9 of the Solana implementation. They
drive the real backend HTTP API and the real Anchor program; nothing is mocked.
The same scripts run against a local validator or Devnet — only `SOLANA_RPC_URL`
and a funded admin keypair change.

## Prerequisites

1. A cluster with the Lilia program deployed.
2. A funded admin keypair whose public key is the program's upgrade authority.
3. `.env` at the repository root with:

```env
SOLANA_RPC_URL=http://127.0.0.1:8899
SOLANA_RPC_COMMITMENT=confirmed
LILIA_PROGRAM_ID=51yqX5byrtqTYt1MS2cfo98UqPskzmbdW8SEBvj3FTbz
LILIA_API_KEY=<generated key>
LILIA_ADMIN_KEYPAIR_PATH=/absolute/path/to/upgrade-authority.json
```

4. Migrations applied (`bun run db:migrate`) and the API running (`bun run dev`).

## Run order

```bash
bun run devnet:setup      # sentinel, mint, ATAs, extra metas, agent, policy
bun run devnet:verify     # 18 acceptance checks, including 4 live transfers
bun run devnet:cleanup    # report locked rent (optionally --disable the agent)
```

Individual steps:

```bash
bun scripts/devnet/register-agent.ts
bun scripts/devnet/create-policy.ts
bun scripts/devnet/demo-valid-transfer.ts
bun scripts/devnet/demo-replay-attack.ts
bun scripts/devnet/demo-amount-mismatch.ts
bun scripts/devnet/demo-expired-permit.ts
```

`setup.ts` is idempotent: it reuses `.devnet/state.json` and skips accounts that
already exist. Delete `.devnet/` to start a fresh demo (and fund the new keys).

## Local validator

```bash
solana-test-validator --reset --quiet --ledger test-ledger --rpc-port 8899
solana airdrop 500 --url http://127.0.0.1:8899
solana program deploy target/deploy/lilia.so \
  --program-id target/deploy/lilia-keypair.json \
  --url http://127.0.0.1:8899
```

## Devnet

```bash
solana config set --url https://api.devnet.solana.com
anchor deploy --provider.cluster devnet
```

Fund the admin keypair before running setup. At the time of writing the public
RPC faucet returns `The RPC faucet is closed on this cluster` and
`https://faucet.solana.com` requires GitHub authentication, so Devnet needs a
keypair funded by other means.

## What each demo proves

| Script | Expected result |
|---|---|
| `demo-valid-transfer.ts` | Backend-issued permit prepares, the client signs, submit confirms on-chain |
| `demo-replay-attack.ts` | Reusing the same permit bytes fails with `InvalidSequence` |
| `demo-amount-mismatch.ts` | Transfer amount above the signed amount fails with `AmountMismatch` |
| `demo-expired-permit.ts` | A permit past `expires_at_slot` fails with `PermitExpired` |

The negative demos rebuild the transaction from the permit's canonical bytes so
the backend's own validation is bypassed; the transfer hook is what rejects
them.

## Notes

- Replay protection lives in `AgentRegistry.next_authorization_sequence`. There
  are no per-transfer accounts, so `cleanup.ts` only reports rent held by the
  persistent accounts.
- A failed transfer does not advance the on-chain sequence, so the next issuance
  legitimately reuses it. Migration `0003` keeps the database from rejecting
  that reissue.
- `.devnet/` holds keypairs and run state and is gitignored.
