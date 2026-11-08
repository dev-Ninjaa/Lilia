# Phase 3 acceptance report

**Date:** November 8, 2026  
**Scope:** Solana phases 6 (token creation), 7 (execution scripts), and 9
(acceptance verification)  
**Result:** 18/18 automated checks pass on a local validator. Devnet deployment
is the only outstanding item and is blocked by faucet access, not by code.

## Environment

| Item | Value |
|---|---|
| Solana CLI | 4.3.2 (Agave) |
| Anchor CLI | 1.2.2 |
| Rust | 1.98.0 |
| Program ID | `51yqX5byrtqTYt1MS2cfo98UqPskzmbdW8SEBvj3FTbz` |
| Cluster | `http://127.0.0.1:8899` (local validator) |
| Admin / upgrade authority | `23F52qKfs3VZhYSjExF5skQwJWZxyLctHbCmGgMwypEr` |
| Token program | Token-2022 (`TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb`) |
| Mint | `AU1dEFdCvUo4iqvkV2RKqRRGJjj28TfHwrBj8k7kfsjE` |
| Mint decimals | 6 |
| ExtraAccountMetaList | `Ft2NoNVRS9FBGM6Fq64CECAavTxR2TKz59s5edSMgav8` |
| SentinelAuthority | `HxJZ1ThQ8rsTeqpovxLndHLiRPvqpVbPpKdh6g3MFpjQ` |
| Sentinel key (backend) | `A6zGwv2xNwCHx3xTkG4W4xNM2MQN7uSDaTDRVWX5VAzf` |
| Transfer authority | `BQVAfyH3TeD5iShu3T7Eubj1Jsr1QBfZB479mfjahS21` |
| AgentRegistry | `BHWFp782aSmmFuWe7Uqvq42RuBQBCXExqVm8Z8dggWiX` |
| Policy | `DJ1S3f3LFCttvyr7bbVPyveHuaY3Qn2uMMgeGdDUsd7o` (v1) |

## Commands run

```bash
anchor build
cargo test -p lilia
bun run typecheck
bun run lint
bun test packages/solana
bun run db:migrate
bun run dev                      # API on 127.0.0.1:4000
bun scripts/devnet/setup.ts
bun scripts/devnet/verify.ts
```

## Automated results

| Check | Result | Evidence |
|---|---|---|
| Anchor program compiles | PASS | `anchor build` exit 0 |
| Program deployed | PASS | executable account at the program ID |
| Program ID matches config | PASS | state, env, and keypair agree |
| SentinelAuthority initialized with backend key | PASS | on-chain key equals `/api/solana/status` |
| Token-2022 mint has TransferHook extension | PASS | hook program equals the Lilia program |
| ExtraAccountMetaList initialized | PASS | 156-byte account |
| AgentRegistry exists and is active | PASS | `active=true` |
| Policy exists and is active | PASS | `version=1` |
| Backend reads on-chain sequence | PASS | permit sequence equals registry counter |
| Canonical bytes reproducible (TS ↔ Rust) | PASS | 308-byte permit, SHA-256 matches |
| Ed25519 precompile precedes transfer | PASS | 2 instructions, first is the precompile |
| Valid transfer succeeds | PASS | `2wfzcfhfSiSkA5BUcUVUwTERkvkvvtHCD9Zq255hr6w9HAFWqd3RYGCLc94vRBRQyywK9S3rFTDG3tRVdUgCxYFH` |
| Replay fails with `InvalidSequence` | PASS | first use `2BStgsy6d71LqjP842odJhBLizBtLnyd6a7zyFXTyyGhEakkMeJr2QVE1D7eXAJ1mcevEMW1e4DiwTZBTdvjtgkF`, replay rejected |
| Amount tampering fails with `AmountMismatch` | PASS | signed 100000000 raw, sent 101000000 raw |
| Expired permit fails with `PermitExpired` | PASS | rejected one slot after expiry |
| Backend records the confirmed signature | PASS | `GET /api/transactions/:signature` returns `confirmed` |
| Existing v1 authorize and prepare still work | PASS | v1 permit prepared successfully |
| No private keys in API responses | PASS | status and permit payloads clean |
| Docs match the implementation | PASS | API.md and ONCHAIN_ACCOUNT_SPEC.md |

`verify.ts` prints `18/18 acceptance checks passed` and exits 0.

## Mapping to the Phase 9 checklist

| Plan item | Status | Where |
|---|---|---|
| 1. Program compiles | PASS | `anchor build` |
| 2. Program deployed (signature recorded) | PARTIAL | local validator only; Devnet blocked |
| 3. SentinelAuthority initialized | PASS | check 3 |
| 4. Token-2022 mint with hook | PASS | check 4 |
| 5. ExtraAccountMetaList initialized | PASS | check 5 |
| 6. AgentRegistry exists | PASS | check 6 |
| 7. Policy exists on-chain | PASS | check 7 |
| 8. Backend reads on-chain state | PASS | check 8 |
| 9. Backend issues V2 permit | PASS | check 8 |
| 10. TS and Rust agree on canonical bytes | PASS | check 9 |
| 11. Ed25519 instruction constructed correctly | PASS | check 10 + Rust web3.js vector |
| 12. Hook checks transfer parameters | PASS | amount demo |
| 13. Hook checks on-chain agent state | PASS | registry read in `execute` |
| 14. Sequence replay prevention | PASS | replay demo |
| 15. Valid transfer succeeds | PASS | check 11 |
| 16. Replay fails with `InvalidSequence` | PASS | check 12 |
| 17. Amount tampering fails | PASS | check 13 |
| 18. Expired permit fails | PASS | check 14 |
| 19. Backend records signatures | PASS | check 15 |
| 20. v1 functionality intact | PASS | check 16 |
| 21. No private keys exposed | PASS | check 17 |
| 22. Documentation reflects implementation | PASS | check 18 |

## Bugs found and fixed during the run

1. **Ed25519 precompile parser read the wrong header.** The Rust verifier treated
   the first two fields as `u16` values, but the on-chain format is
   `u8 num_signatures`, `u8 padding`, then `u16` offsets. It also expected the
   message before the signature, while `Ed25519Program.createInstructionWithPublicKey`
   emits header, public key, signature, message. The parser now matches the
   actual layout, and a byte-for-byte web3.js vector test guards it.
2. **Unique `(agent_id, sequence)` index blocked legitimate reissuance.** A failed
   transfer does not advance the on-chain counter, so the next permit reuses the
   sequence. Migration `0003` drops the unique index and keeps a plain lookup
   index; replay protection remains on-chain.

## Devnet blocker

Devnet was reachable, but no keypair could be funded:

- `solana airdrop` → `airdrop request failed` (rate limited)
- RPC `requestAirdrop` → `The RPC faucet is closed on this cluster`
- `https://faucet.solana.com` → `GitHub authentication is required`
- solfaucet.com and faucet.triangleplatform.com → unavailable or suspended

The scripts are cluster-agnostic. Once a funded keypair exists, run
`anchor deploy --provider.cluster devnet`, point `SOLANA_RPC_URL` at Devnet, and
re-run `bun run devnet:setup && bun run devnet:verify`.

## Reproduce

```bash
solana-test-validator --reset --quiet --ledger test-ledger --rpc-port 8899
solana airdrop 500 --url http://127.0.0.1:8899
solana program deploy target/deploy/lilia.so \
  --program-id target/deploy/lilia-keypair.json \
  --url http://127.0.0.1:8899
bun run db:migrate
bun run dev
bun run devnet:setup
bun run devnet:verify
```
