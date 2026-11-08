# Devnet deployment record

Deployed 2026-11-08. Public addresses only; keypairs live in `~/.config/solana/id.json` and `.devnet/` (gitignored).

| Item | Value |
|---|---|
| Cluster | Solana devnet (`https://api.devnet.solana.com`) |
| Program ID | `51yqX5byrtqTYt1MS2cfo98UqPskzmbdW8SEBvj3FTbz` |
| ProgramData | `4GCE1ZqyjnGYqFrCBWuZgtF16nJQff9hyZB95A7Jie73` |
| Upgrade authority / admin | `23F52qKfs3VZhYSjExF5skQwJWZxyLctHbCmGgMwypEr` |
| Deploy signature | `3wDGQ33oiJHGWCuodMcvKZcv7m3jArhnHxN6tkvrwG8zUbAozyrCPvt9tEigXjByWhQt5Z6u18yG6o6waJmmY3kj` |
| Deploy slot | 519,996,695 (program size 301,792 bytes) |
| SentinelAuthority PDA | `HxJZ1ThQ8rsTeqpovxLndHLiRPvqpVbPpKdh6g3MFpjQ` |
| Sentinel public key | `A6zGwv2xNwCHx3xTkG4W4xNM2MQN7uSDaTDRVWX5VAzf` |
| Demo Token-2022 mint (with hook) | `3oJ5wNXd8rLddjFV6gNKkEjoRoDBKar1bVEhSwAeoWzZ` |
| ExtraAccountMetaList | `HS5xN9QYzzTEVUheyfS2twSpHPXJx53a7nhdW3BuNjKN` |
| Transfer authority (demo sender) | `GHdAfrEKVawspb83Za1b16PKnnWh74yV6eLoZc6TbtU` |
| Demo recipient | `5hJvyMZUZpKdLoLX9xX1tF3BpGU7rnTDJDpruoxTfkSP` |
| AgentRegistry | `GtnnB6Ajq2jGcFnwMidu5fqhoinrhi2tpzed4AWnWFSg` |
| Policy account | `C51P4xMgtaDzMANjnAFMjvAy9pNVnQ5zQaGsrc6HwxW8` (v1) |
| Backend agent / policy IDs | `0de3ff02-65a3-4056-84f2-05212d0570c0` / `2df21335-6846-4236-bb20-eeea7ca91d71` |
| Valid transfer tx | `2MMq8Xh9g4gNiPpWmpkMeBMPMEmSnyWgEGTqP3ALTUN1TYcaeNnBym64kN1snkPSfQQQMkq4exPsYkGMsutX839M` |

Explorer: https://explorer.solana.com/address/51yqX5byrtqTYt1MS2cfo98UqPskzmbdW8SEBvj3FTbz?cluster=devnet

## Result

`bun run devnet:verify`: **18/18 acceptance checks passed** (valid transfer, replay, amount tamper and expired permit all behaved as specified).

## Notes

- The program account shows a small balance (0.0008 SOL); the ~1.5 SOL deposit is rent held in the ProgramData account.
- The public faucet is closed, so `scripts/devnet/lib.ts` `ensureFunded` falls back to transferring SOL from the admin wallet.
- Local-validator state from before this deployment is backed up outside the repo in `../Lilia-local-backup/`.
- To redeploy an update: `anchor build` then `solana program deploy target/deploy/lilia.so --program-id target/deploy/lilia-keypair.json --url devnet`.
