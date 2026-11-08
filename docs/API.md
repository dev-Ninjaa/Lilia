# Lilia REST API

This document describes the implemented backend, not future blockchain behavior.

## Local setup and authentication

Base URL: `http://localhost:4000`; API prefix: `/api`. Install with `bun install`, configure `.env`, run `bun run db:migrate`, and start with `bun run dev` (or `bun run start`). Use `bun run db:generate-key` to create an Ed25519 key pair. The generated private key must remain secret. `bun scripts/generate-signing-key.ts --configure-env` creates a new `.env` only if none exists.

Set `LILIA_API_KEY` to a random secret with at least 24 characters. All endpoints except `GET /api/health` require `Authorization: Bearer <LILIA_API_KEY>`. This MVP has a single configured owner; owner identity is derived from the credential and is never accepted from request data. Do not send the key in query strings.

| Variable | Required | Meaning |
|---|---:|---|
| `PORT` | No | Listen port, default 4000 |
| `HOST` | No | Bind address, default `0.0.0.0` |
| `NODE_ENV` | No | `development`, `production`, or `test` |
| `DATABASE_URL` | No | SQLite file path, default `./database/lilia.db` |
| `LILIA_API_KEY` | Yes | Single-owner Bearer credential |
| `LILIA_SIGNING_PRIVATE_KEY` | For permits | Ed25519 private key as PKCS#8 PEM |
| `LILIA_SIGNING_PUBLIC_KEY` | For permits | Matching Ed25519 public key as SPKI PEM |
| `GEMINI_API_KEY` | No | Reported as configured, provider is currently unused |
| `SOLANA_RPC_URL` | No | Reported as present, no RPC adapter/health check is implemented |

Both signing key variables must be configured together. At startup the application checks Ed25519 type and matching public/private keys. If absent, the API still starts but `POST /api/sentinel/authorize` fails closed with `503 SIGNING_NOT_CONFIGURED`.

## Request, response, and pagination conventions

JSON body limit is 64 KiB. Successful responses use:

```json
{"success":true,"data":{},"meta":{"requestId":"<fastify-request-id>","timestamp":"<ISO-8601>"}}
```

Errors use `success:false`, an `error.code`, safe message, validation `details` (when applicable), and request metadata. No stack traces or credentials are returned. Pagination query is `page` (1-based, default 1) and `limit` (default 20, max 100). List responses put the array in `data` and include `meta.pagination` with `page`, `limit`, `total`, and `totalPages`.

Token amounts are decimal strings with up to 18 fractional digits; comparisons use integer arithmetic. UUID path values are validated. Address-like strings are required and length-limited, but without a chain adapter this API does not claim chain-specific address validation.

## Common errors

| Status | Code | Meaning |
|---:|---|---|
| 400 | `VALIDATION_ERROR` | Invalid JSON shape, path/query value, UUID, or amount |
| 401 | `UNAUTHORIZED` | Missing/invalid Bearer API key |
| 404 | `AGENT_NOT_FOUND`, `POLICY_NOT_FOUND`, etc. | Missing or non-owned record |
| 409 | `AGENT_DISABLED`, `POLICY_INACTIVE`, `ASSESSMENT_OUTDATED`, `PERMIT_DETAILS_MISMATCH`, etc. | Current security state prevents operation |
| 503 | `SIGNING_NOT_CONFIGURED` | Permit signing key pair unavailable |
| 503 | `SOLANA_INTEGRATION_NOT_CONFIGURED` | Submission is deliberately unavailable |
| 500 | `INTERNAL_SERVER_ERROR` | Unexpected server failure; details are logged server-side |

All records are persisted to SQLite. `agent.registered` means backend registry creation only, not on-chain registration.

## Endpoint catalog

For each endpoint, unless stated otherwise: header is `Content-Type: application/json` for requests with bodies and `Authorization: Bearer <key>` for protected routes; responses use the common envelope; unlisted path/query/body values are not accepted as identity. Auth failures are 401, malformed inputs are 400, and non-owned resources are reported as 404. Mutation records and security events are stored in SQLite. An empty successful object/array illustrates the response shape; resource fields are returned as stored and decoded.

### A. Agent management

#### 1. Register agent
- **Method / URL:** `POST /api/agents/register`
- **Purpose / auth:** Create a backend registry record; Bearer required.
- **Path/query:** None.
- **Body:** `{"name":"Agent Alpha","description":"Autonomous payment agent","publicKey":"AGENT_PUBLIC_KEY","metadata":{}}`. `name` 1–100 chars; description max 1000; public key 1–128; metadata JSON object.
- **Success:** 201 `{"success":true,"data":{"id":"<uuid>","status":"active","ownerId":"<authenticated-owner>"},"meta":{...}}`.
- **Errors / statuses:** 201, 400, 401, 500.
- **Validation / DB:** Zod validates fields; inserts agent and `agent.registered` security event.
- **Security / integration:** Owner is derived from API key. Registry is local only; it does not register the agent on-chain.

#### 2. List agents
- **Method / URL:** `GET /api/agents`
- **Purpose / auth:** List only the authenticated owner’s agents; Bearer required.
- **Path:** None. **Query:** `page`, `limit`, optional `status=active|disabled`.
- **Body:** None.
- **Success:** 200 `{"success":true,"data":[{"id":"<uuid>","status":"active"}],"meta":{"pagination":{"page":1,"limit":20,"total":1,"totalPages":1},...}}`.
- **Errors / statuses:** 200, 400, 401.
- **Validation / DB:** Pagination/status validated; reads persistent owner-scoped records and count.
- **Security / integration:** No other owner’s records are returned; no blockchain lookup.

#### 3. Get agent
- **Method / URL:** `GET /api/agents/:agentId`
- **Purpose / auth:** Get an owned agent and policy summary; Bearer required.
- **Path:** `agentId` UUID. **Query/body:** None.
- **Success:** 200 envelope with agent plus `policies` summary array.
- **Errors / statuses:** 200, 400, 401, 404.
- **Validation / DB:** Reads agent and associated policy summaries.
- **Security / integration:** Ownership scoped; `onChainAddress` is reserved and does not imply registration.

#### 4. Disable agent
- **Method / URL:** `POST /api/agents/:agentId/disable`
- **Purpose / auth:** Disable future Sentinel evaluation/authorization; Bearer required.
- **Path:** `agentId` UUID. **Query/body:** None.
- **Success:** 200 `data:{"id":"<uuid>","status":"disabled"}`.
- **Errors / statuses:** 200, 400, 401, 404, 500.
- **Validation / DB:** Updates agent status and writes `agent.disabled`.
- **Security / integration:** Ownership checked before state change; no on-chain action.

#### 5. Update agent
- **Method / URL:** `PATCH /api/agents/:agentId`
- **Purpose / auth:** Edit display metadata; Bearer required.
- **Path:** `agentId` UUID. **Query:** None.
- **Body:** Any non-empty subset of `name`, `description`, `metadata` (same field rules as registration).
- **Success:** 200 envelope with updated agent.
- **Errors / statuses:** 200, 400, 401, 404.
- **Validation / DB:** Updates only those editable fields and `updatedAt`.
- **Security / integration:** Owner, public key, and status cannot be supplied or altered.

### B. Policy management

#### 6. Create policy
- **Method / URL:** `POST /api/policies`
- **Purpose / auth:** Create version-1 spending policy for an owned agent; Bearer required.
- **Path/query:** None.
- **Body:** `{"agentId":"<uuid>","name":"Default Spending Policy","maxTransferAmount":"1000","allowedRecipients":[],"blockedRecipients":[],"allowedMint":null,"expiresAt":null}`. Amount is exact decimal string; recipient arrays contain up to 500 strings; expiry is ISO datetime or null.
- **Success:** 201 envelope with full policy.
- **Errors / statuses:** 201, 400, 401, 404, 500.
- **Validation / DB:** Inserts policy and `policy.created` event.
- **Security / integration:** Agent ownership is verified; policy is backend-only.

#### 7. Get policy
- **Method / URL:** `GET /api/policies/:policyId`
- **Purpose / auth:** Retrieve complete owned policy; Bearer required.
- **Path:** `policyId` UUID. **Query/body:** None.
- **Success:** 200 envelope with policy and decoded recipient lists.
- **Errors / statuses:** 200, 400, 401, 404.
- **Validation / DB:** Reads persistent policy.
- **Security / integration:** Non-owned policy is indistinguishable from missing.

#### 8. List policies
- **Method / URL:** `GET /api/policies`
- **Purpose / auth:** List owned policies; Bearer required.
- **Path/body:** None. **Query:** `page`, `limit`, optional UUID `agentId`.
- **Success:** 200 paginated policy array.
- **Errors / statuses:** 200, 400, 401, 404 for non-owned filter agent.
- **Validation / DB:** Owner-scoped query/count; agent filter ownership checked.
- **Security / integration:** No cross-owner results.

#### 9. Update policy
- **Method / URL:** `PATCH /api/policies/:policyId`
- **Purpose / auth:** Update policy fields; Bearer required.
- **Path:** `policyId` UUID. **Body:** Non-empty subset of `name`, `maxTransferAmount`, `allowedRecipients`, `blockedRecipients`, `allowedMint`, `expiresAt` with create-policy field validation.
- **Success:** 200 envelope with incremented `policyVersion`.
- **Errors / statuses:** 200, 400, 401, 404, 409 if inactive.
- **Validation / DB:** In a DB transaction increments version and revokes all issued permits; writes `policy.updated`.
- **Security / integration:** Old permits are revoked and their policy version is stale.

#### 10. Deactivate policy
- **Method / URL:** `DELETE /api/policies/:policyId`
- **Purpose / auth:** Soft-deactivate a policy; Bearer required.
- **Path:** `policyId` UUID. **Query/body:** None.
- **Success:** 200 `data:{"id":"<uuid>","isActive":false,"policyVersion":2}`.
- **Errors / statuses:** 200, 400, 401, 404.
- **Validation / DB:** Transactionally deactivates, increments version, revokes issued permits; writes `policy.deactivated`.
- **Security / integration:** No physical deletion; cannot authorize new transfers.

### C. Sentinel

#### 11. Evaluate transfer
- **Method / URL:** `POST /api/sentinel/evaluate`
- **Purpose / auth:** Deterministically evaluate a proposed transfer; Bearer required.
- **Path/query:** None.
- **Body:** `{"agentId":"<uuid>","policyId":"<uuid-optional>","recipient":"RECIPIENT_ADDRESS","mint":"TOKEN_MINT","amount":"500","context":{"purpose":"Payment"}}`. The `policyId` is optional; when omitted, the most recently updated active policy for the agent is selected automatically.
- **Success:** 201 envelope with assessment ID, `decision`, risk score/level, reasons, provider, and timestamp.
- **Errors / statuses:** 201, 400, 401, 404, 409 for disabled agent or no active policy.
- **Validation / DB:** Exact decimal validation; persists assessment and security event.
- **Security / integration:** Policy failures cannot be overridden by AI; amount uses integer arithmetic. No RPC is queried.

#### 12. Authorize assessment
- **Method / URL:** `POST /api/sentinel/authorize`
- **Purpose / auth:** Issue backend Ed25519 signed permit; Bearer required.
- **Body:** `{"assessmentId":"<uuid>"}`. **Path/query:** None.
- **Success:** 201 with permit id, canonical payload string, signature, public verification key, hash, expiry and status.
- **Errors / statuses:** 201, 400, 401, 404, 409 for rejected/outdated/inactive state, 503 if signing keys are absent.
- **Validation / DB:** Reloads assessment, agent and policy; verifies current version, persists permit plus an `authorized` transaction intent and event in one transaction.
- **Security / integration:** Private key is never persisted or returned. Permit is not on-chain verified or enforced.

#### 13. List Sentinel rules
- **Method / URL:** `GET /api/sentinel/rules`
- **Purpose / auth:** Return active deterministic rule catalog; Bearer required.
- **Path/query/body:** None.
- **Success:** 200 envelope with rule id, name, description, severity, enabled.
- **Errors / statuses:** 200, 401.
- **Validation / DB:** Static configured rule list; no database writes.
- **Security / integration:** Describes current backend rules only.

#### 14. Get assessment
- **Method / URL:** `GET /api/sentinel/assessments/:assessmentId`
- **Purpose / auth:** Retrieve an owner’s previous assessment; Bearer required.
- **Path:** `assessmentId` UUID. **Query/body:** None.
- **Success:** 200 envelope with decision, details, reasons, score and timestamp.
- **Errors / statuses:** 200, 400, 401, 404.
- **Validation / DB:** Reads assessment and verifies associated agent ownership.
- **Security / integration:** Does not create or alter a permit.

### D. Transactions

#### 15. Prepare transaction intent
- **Method / URL:** `POST /api/transactions/prepare`
- **Purpose / auth:** Validate permit and persist a local transfer intent; Bearer required.
- **Body:** `{"permitId":"<uuid>","sender":"SENDER","recipient":"RECIPIENT","mint":"MINT","amount":"500"}`.
- **Success:** 201, status `prepared_pending_solana_integration`, `blockchainTransactionBuilt:false`, and transfer details.
- **Errors / statuses:** 201, 400, 401, 404, 409 for expired/revoked/consumed/mismatched permit, inactive agent/policy, or invalid signature.
- **Validation / DB:** Verifies exact canonical details, expiry, version, signature/hash; atomically consumes permit, stores transaction intent and event.
- **Security / integration:** No serialized transaction, instruction, signature, submission, or confirmation is fabricated.

#### 16. Submit transaction
- **Method / URL:** `POST /api/transactions/submit`
- **Purpose / auth:** Broadcast a signed Solana v2 transaction and record confirmation; Bearer required.
- **Body:** `{"transactionId":"<uuid>","signedTransaction":"<base64>"}`; transaction UUID, non-empty signed payload max 100,000 chars.
- **Success:** 200 with `transactionId`, `status` (`submitted` or `confirmed`), `signature`, `slot`, and `confirmedAt`.
- **Errors / statuses:** 400 invalid schema, 401 unauthenticated, 404 unknown transaction, 409 not submittable, 502 `SOLANA_SEND_FAILED` or `SOLANA_TRANSACTION_FAILED`, 503 `SOLANA_NOT_CONFIGURED` / legacy flow.
- **Validation / DB:** Verifies ownership and `flowVersion=2`; sends the raw transaction, stores the signature, polls for confirmation, then marks the permit consumed and writes a `transaction.confirmed` event.
- **Security / integration:** The backend never signs the transfer authority's key; the client signs and supplies the wire transaction.

#### 17. List transaction intents
- **Method / URL:** `GET /api/transactions`
- **Purpose / auth:** List persisted owner transaction records; Bearer required.
- **Query:** `page`, `limit`, optional UUID `agentId`, optional `status`.
- **Success:** 200 paginated transaction array.
- **Errors / statuses:** 200, 400, 401, 404 for non-owned agent filter.
- **Validation / DB:** Owner-scoped DB query/count; newest first.
- **Security / integration:** Lists backend intents and recorded transaction rows only.

#### 18. Get transaction by signature
- **Method / URL:** `GET /api/transactions/:signature`
- **Purpose / auth:** Look up a persisted transaction signature; Bearer required.
- **Path:** Base58-like signature of 32–100 chars. **Query/body:** None.
- **Success:** 200 with local record and `blockchainEvidence` status.
- **Errors / statuses:** 400 invalid signature; 401; 404 if no matching locally stored signature or not owned.
- **Validation / DB:** Searches records by signature and verifies agent ownership.
- **Security / integration:** Prepared intents have no signature; only actual recorded evidence can indicate confirmation.

### E. Policy preview

#### 19. Run policy preview
- **Method / URL:** `POST /api/simulation/run`
- **Purpose / auth:** Evaluate a hypothetical transfer against a selected policy; Bearer required.
- **Body:** Sentinel transfer fields plus UUID `policyId`.
- **Success:** 201 with `hypothetical:true`, deterministic decision, reasons, and `blockchainExecution:"not_performed"`.
- **Errors / statuses:** 201, 400, 401, 404 if agent/policy is unavailable.
- **Validation / DB:** Verifies agent/policy ownership and association; persists input and result.
- **Security / integration:** Product preview only; not an automated test and never submits a transaction.

#### 20. List policy previews
- **Method / URL:** `GET /api/simulation/events`
- **Purpose / auth:** Retrieve saved hypothetical previews; Bearer required.
- **Query:** `page`, `limit`, optional UUID `agentId`. **Path/body:** None.
- **Success:** 200 paginated preview records.
- **Errors / statuses:** 200, 400, 401, 404 for non-owned agent filter.
- **Validation / DB:** Reads persistent owner-scoped records/count.
- **Security / integration:** Responses retain hypothetical/no-chain labeling.

### F. Security monitoring

#### 21. List security events
- **Method / URL:** `GET /api/security/events`
- **Purpose / auth:** Retrieve newest owner events; Bearer required.
- **Query:** `page`, `limit`, optional `eventType`, `severity=info|low|medium|high|critical`, UUID `agentId`.
- **Path/body:** None.
- **Success:** 200 paginated event array.
- **Errors / statuses:** 200, 400, 401, 404 for non-owned agent.
- **Validation / DB:** Filtered database query/count.
- **Security / integration:** Events with no owner-associated agent are not disclosed.

#### 22. Get security event
- **Method / URL:** `GET /api/security/events/:eventId`
- **Purpose / auth:** Retrieve one associated event; Bearer required.
- **Path:** `eventId` UUID. **Query/body:** None.
- **Success:** 200 with event metadata and timestamps.
- **Errors / statuses:** 200, 400, 401, 404.
- **Validation / DB:** Resolves ownership through agent or associated transaction.
- **Security / integration:** Missing and non-owned events both return 404.

#### 23. Security overview
- **Method / URL:** `GET /api/security/overview`
- **Purpose / auth:** Return DB-derived dashboard counts; Bearer required.
- **Path/query/body:** None.
- **Success:** 200 with total/active/disabled agents and policies, transaction intents, authorized intents, rejected evaluations, confirmed transactions, and event counts by severity.
- **Errors / statuses:** 200, 401, 500.
- **Validation / DB:** Aggregate queries over authenticated owner’s data.
- **Security / integration:** Prepared intents are not counted as successful; only recorded `confirmed` rows count as confirmed.

#### 24. Agent security history
- **Method / URL:** `GET /api/security/agents/:agentId/events`
- **Purpose / auth:** Chronological security history for one owned agent; Bearer required.
- **Path:** `agentId` UUID. **Query:** `page`, `limit`.
- **Body:** None.
- **Success:** 200 paginated event array, oldest first.
- **Errors / statuses:** 200, 400, 401, 404.
- **Validation / DB:** Verifies agent ownership, then reads associated records/count.
- **Security / integration:** Cross-owner agent IDs are not disclosed.

### G. Integrations and system

#### 25. Integration availability
- **Method / URL:** `GET /api/integrations`
- **Purpose / auth:** Report current integration state; Bearer required.
- **Path/query/body:** None.
- **Success:** 200 with database connected, Solana not configured (and whether a URL is set), Gemini not configured or configured-but-unused, MCP available (`apps/mcp-server`, 7 tools).
- **Errors / statuses:** 200, 401.
- **Validation / DB:** Database state is reported; no external integrations are contacted.
- **Security / integration:** Configuration values/secrets are not returned.

#### 26. Solana status
- **Method / URL:** `GET /api/integrations/solana/status`
- **Purpose / auth:** Report Solana integration availability; Bearer required.
- **Path/query/body:** None.
- **Success:** 200 `{"status":"not_configured","endpointConfigured":false,"rpcHealthChecked":false}` (endpointConfigured reflects configuration only).
- **Errors / statuses:** 200, 401.
- **Validation / DB:** No database mutation or RPC request.
- **Security / integration:** A configured URL is not described as connected.

#### 27. MCP status
- **Method / URL:** `GET /api/integrations/mcp/status`
- **Purpose / auth:** Report MCP implementation state; Bearer required.
- **Path/query/body:** None.
- **Success:** 200 `{"status":"available","server":"@lilia/mcp-server","transport":"stdio","tools":[...]}`.
- **Errors / statuses:** 200, 401.
- **Validation / DB:** No database mutation.
- **Security / integration:** The server (`apps/mcp-server`) is a stdio JSON-RPC process that proxies this API with the same bearer key.

#### 28. Health
- **Method / URL:** `GET /api/health`
- **Purpose / auth:** Public API/database liveness.
- **Path/query/body:** None. No authorization required.
- **Success:** 200 with API status, version, uptime, database state, and current timestamp; 503 with degraded status if SQLite query fails.
- **Errors / statuses:** 200 or 503.
- **Validation / DB:** Executes `SELECT 1`; does not expose environment variables or credentials.
- **Security / integration:** Only basic health details are returned.

### H. Solana v2 (Phase 3)

These endpoints require `SOLANA_RPC_URL`; they return 503 `SOLANA_NOT_CONFIGURED` otherwise. The on-chain admin endpoints additionally require `LILIA_ADMIN_KEYPAIR_PATH` or `LILIA_ADMIN_KEYPAIR`.

#### 29. Issue a Permit v2
- **Method / URL:** `POST /api/v2/sentinel/authorize`
- **Purpose / auth:** Sign a canonical 308-byte Permit v2 for an approved assessment; Bearer required.
- **Body:** `{"assessmentId":"<uuid>","sourceTokenAccount":"<optional>","destinationTokenAccount":"<optional>","expiresInSlots":300}`. Token accounts default to the transfer authority/recipient ATAs.
- **Success:** 201 with `permitVersion:2`, `sequence`, `agentRegistryPda`, `policyPda`, `policyVersion`, `transferAuthority`, source/destination accounts, `mint`, `mintDecimals`, raw `amount`, `expiresAtSlot`, hex `canonicalMessage`, base64url `signature`, `signerPublicKey`, `permitHash`, and `transactionId`.
- **Errors / statuses:** 201, 400, 401, 404, 409 for `AGENT_NOT_ON_CHAIN`, `AGENT_IDENTITY_MISSING`, `POLICY_NOT_PUBLISHED`, `POLICY_VERSION_DRIFT`, `AMOUNT_EXCEEDS_POLICY`, or `MINT_NOT_ALLOWED`; 503 when Solana or signing is unconfigured.
- **Validation / DB:** Reads the on-chain `AgentRegistry.next_authorization_sequence` (not the local mirror), verifies mint decimals and policy limits, signs the canonical message, stores the permit/transaction intent, and mirrors the next sequence.
- **Security / integration:** The sequence is consumed atomically on-chain by the transfer hook; a failed transfer rolls it back.

#### 30. Prepare a v2 transfer transaction
- **Method / URL:** `POST /api/transactions/prepare-v2`
- **Purpose / auth:** Build the Ed25519 precompile + Token-2022 transfer transaction; Bearer required.
- **Body:** `{"permitId":"<uuid>","sender":"<transfer authority>","recipient":"<destination owner>","mint":"<mint>","amount":"100.5"}`.
- **Success:** 201 with `transactionId`, `status:"prepared"`, `blockchainTransactionBuilt:true`, `blockhash`, `lastValidBlockHeight`, base64 unsigned `transaction`, and permit metadata.
- **Errors / statuses:** 201, 400, 401, 404, 409 for version/expiry/sequence/detail mismatch or an unavailable intent; 503 when Solana is unconfigured.
- **Validation / DB:** Re-verifies the canonical message hash and Sentinel signature, checks slot expiry and policy version, rebuilds the permit bytes and refuses if they differ, then stores the blockhash window.
- **Security / integration:** The transaction must be signed by the transfer authority and fee payer; the API does not hold that key.

#### 31. Record a client submission
- **Method / URL:** `POST /api/v2/transactions/record-submission`
- **Purpose / auth:** Record a signature the client broadcast itself; Bearer required.
- **Body:** `{"permitId":"<uuid>","transactionSignature":"<base58>"}`.
- **Success:** 200 with `transactionId`, `status:"confirmed"`, `signature`, `slot`, `confirmedAt`.
- **Errors / statuses:** 200, 400, 401, 404 (`PERMIT_NOT_FOUND`, `TRANSACTION_NOT_FOUND`), 409 (`PERMIT_ALREADY_CONSUMED`), 502 `SOLANA_TRANSACTION_FAILED`.
- **Validation / DB:** Fetches the transaction from RPC, rejects on-chain errors, marks the permit consumed and the transaction confirmed, and records a blockchain event. Idempotent for an already-confirmed signature.
- **Security / integration:** A signature is only accepted when it is visible on the configured cluster and belongs to the permit's transaction intent.

#### 32. Register an agent on-chain
- **Method / URL:** `POST /api/agents/:agentId/register-on-chain`
- **Purpose / auth:** Create the `AgentRegistry` PDA; Bearer required.
- **Body:** `{"transferAuthority":"<base58>","agentIdentityKey":"<base58>"}`.
- **Success:** 201 with the updated agent including `onChainRegistryPda` and `registrationTxSignature`.
- **Errors / statuses:** 201, 400, 401, 404, 409 `AGENT_ALREADY_REGISTERED`, 503 when Solana/admin keys are unconfigured.
- **Validation / DB:** Derives the PDA from the transfer authority, sends `register_agent` with the admin key, stores the PDA/signature, and resets the sequence mirror to `0`.
- **Security / integration:** The admin key must be the on-chain `upgrade_authority`.

#### 33. Toggle an agent on-chain
- **Method / URL:** `POST /api/agents/:agentId/status-on-chain`
- **Purpose / auth:** Enable/disable the on-chain registry; Bearer required.
- **Body:** `{"isActive":false}`.
- **Success:** 200 with the updated agent.
- **Errors / statuses:** 200, 400, 401, 404, 409 `AGENT_NOT_ON_CHAIN`, 503.
- **Validation / DB:** Sends `set_agent_status`, updates the local status, and records a blockchain event.

#### 34. Publish a policy on-chain
- **Method / URL:** `POST /api/policies/:policyId/publish-on-chain`
- **Purpose / auth:** Create or update the on-chain `Policy` PDA; Bearer required.
- **Body:** `{"mintDecimals":6}`.
- **Success:** 200 with the updated policy including `onChainPolicyPda`, `onChainPolicyVersion`, and `publishTxSignature`.
- **Errors / statuses:** 200, 400, 401, 404, 409 `POLICY_VERSION_DRIFT`, `POLICY_EXPIRED`, `AGENT_NOT_ON_CHAIN`, 503.
- **Validation / DB:** Converts the decimal cap to raw units, maps `expiresAt` to a slot, and requires each backend revision to be published in order so the on-chain version matches the permit version.
- **Security / integration:** Only the admin key can create/update policies; version drift fails closed.

#### 35. Solana status
- **Method / URL:** `GET /api/solana/status`
- **Purpose / auth:** Report configuration and current slot; Bearer required.
- **Success:** 200 `{"configured":true,"programId":"...","rpcUrl":"...","commitment":"confirmed","sentinelPublicKey":"...","adminConfigured":true,"latestSlot":123}`; `latestSlot` and `sentinelPublicKey` are `null` when unavailable.
- **Errors / statuses:** 200, 401.
- **Validation / DB:** Reads RPC slot only when configured; does not expose private keys.

#### 36. Sentinel administration
- **Method / URL:** `POST /api/solana/sentinel/initialize`, `POST /api/solana/sentinel/rotate`
- **Purpose / auth:** Initialize or rotate the on-chain `SentinelAuthority`; Bearer + admin keypair required.
- **Body:** `{"publicKey":"<base58>"}` or `{"newPublicKey":"<base58>"}`.
- **Success:** 201/200 with `signature` and the sentinel PDA.
- **Errors / statuses:** 200, 201, 400, 401, 503.
- **Validation / DB:** Sends the corresponding Anchor instruction and writes an audit event.
- **Security / integration:** Must be signed by the configured `upgrade_authority`.

## Permit format and transaction lifecycle

The backend signs a compact UTF-8 JSON string using Ed25519. The exact canonical field order is:

```json
{"domain":"lilia.authorization.v1","version":1,"agentId":"...","agentPublicKey":"...","policyId":"...","policyVersion":1,"sender":"...","recipient":"...","mint":"...","amount":"...","expiresAt":"...","nonce":"..."}
```

Serialization is `JSON.stringify` over an object inserted in precisely the order shown; there is no whitespace, Unicode normalization, or key sorting. Amount is the original validated decimal string. `expiresAt` is UTC ISO-8601. `nonce` is a UUID. The `signature` is base64url-encoded Ed25519 over the UTF-8 bytes; `permitHash` is lowercase hex SHA-256 of those same bytes. This server issues backend authorization only; an Anchor program must independently implement and verify this exact message before any on-chain enforcement is claimed.

Database lifecycle (v1 flow): evaluation creates an assessment; authorization creates an `issued` permit and `authorized` transaction intent atomically; successful local preparation changes that same intent to `prepared` and consumes the permit. Disabling an agent or updating/deactivating its policy revokes issued permits and rejects unprepared authorized intents. The v1 path never contacts a cluster; the v2 path is described above and does submit, confirm, and record real signatures.

## Honest integration limits

- **Solana:** the program, Permit v2 codec, and v2 API flows are implemented. They remain **inactive until `SOLANA_RPC_URL` and the key configuration are set**; without configuration the endpoints return 503 `SOLANA_NOT_CONFIGURED`. They have been exercised end-to-end on a local validator (deployment, mint, four live transfer scenarios, 18/18 acceptance checks). Devnet deployment is pending a funded keypair because the public faucets are closed or require GitHub authentication. See `docs/PHASE_3_ACCEPTANCE_REPORT.md`.
- **Gemini:** optional key is read only for truthful integration reporting; deterministic rules are the only evaluator and cannot be overridden.
- **MCP:** implemented as `apps/mcp-server` (`@lilia/mcp-server`, stdio transport, 7 tools over the REST API).

## Manual PowerShell workflow

Run these commands from the repository root in one PowerShell session after `bun run db:migrate` and `bun run dev` in a separate terminal. The commands make live HTTP requests; IDs are extracted from actual responses. A second owner is not modeled in this single-owner MVP.

```powershell
$base = 'http://localhost:4000/api'
$keyLine = Get-Content .env | Where-Object { $_ -match '^LILIA_API_KEY=' } | Select-Object -First 1
$key = $keyLine.Substring('LILIA_API_KEY='.Length)
$headers = @{ Authorization = "Bearer $key"; 'Content-Type' = 'application/json' }

# 1. Health (public)
Invoke-RestMethod "$base/health"

# 2. Protected request without credentials (expect 401)
try { Invoke-RestMethod "$base/agents" } catch { $_.Exception.Response.StatusCode }

# 3. Register Agent Alpha
$agentBody = @{ name='Agent Alpha'; description='Autonomous payment agent'; publicKey='AGENT_PUBLIC_KEY'; metadata=@{} } | ConvertTo-Json
$agent = (Invoke-RestMethod "$base/agents/register" -Method Post -Headers $headers -Body $agentBody).data
$agentId = $agent.id

# 4–5. Retrieve and list agents
Invoke-RestMethod "$base/agents/$agentId" -Headers $headers
Invoke-RestMethod "$base/agents" -Headers $headers

# 6–7. Create and retrieve a policy
$policyBody = @{ agentId=$agentId; name='Default Spending Policy'; maxTransferAmount='1000'; allowedRecipients=@(); blockedRecipients=@(); allowedMint=$null; expiresAt=$null } | ConvertTo-Json
$policy = (Invoke-RestMethod "$base/policies" -Method Post -Headers $headers -Body $policyBody).data
$policyId = $policy.id
Invoke-RestMethod "$base/policies/$policyId" -Headers $headers

# 8. Valid evaluation
$validBody = @{ agentId=$agentId; recipient='RECIPIENT_1'; mint='TOKEN_MINT_1'; amount='500'; context=@{ purpose='Payment' } } | ConvertTo-Json
$valid = (Invoke-RestMethod "$base/sentinel/evaluate" -Method Post -Headers $headers -Body $validBody).data

# 9. Above-limit evaluation (expected decision=rejected)
$largeBody = @{ agentId=$agentId; recipient='RECIPIENT_1'; mint='TOKEN_MINT_1'; amount='1001'; context=@{} } | ConvertTo-Json
$large = (Invoke-RestMethod "$base/sentinel/evaluate" -Method Post -Headers $headers -Body $largeBody).data
$large.decision

# 10. Retrieve assessment
Invoke-RestMethod "$base/sentinel/assessments/$($valid.id)" -Headers $headers

# 11. Issue signed permit (requires configured Ed25519 keys)
$permit = (Invoke-RestMethod "$base/sentinel/authorize" -Method Post -Headers $headers -Body (@{ assessmentId=$valid.id } | ConvertTo-Json)).data

# 12. Prepare exactly matching local transaction intent
$prepareBody = @{ permitId=$permit.id; sender=$agent.publicKey; recipient='RECIPIENT_1'; mint='TOKEN_MINT_1'; amount='500' } | ConvertTo-Json
$prepared = (Invoke-RestMethod "$base/transactions/prepare" -Method Post -Headers $headers -Body $prepareBody).data
$prepared.status

# 13. Altered details must fail (use a fresh assessment/permit if testing after consuming the first)
$fresh = (Invoke-RestMethod "$base/sentinel/evaluate" -Method Post -Headers $headers -Body $validBody).data
$freshPermit = (Invoke-RestMethod "$base/sentinel/authorize" -Method Post -Headers $headers -Body (@{ assessmentId=$fresh.id } | ConvertTo-Json)).data
$tampered = @{ permitId=$freshPermit.id; sender=$agent.publicKey; recipient='OTHER_RECIPIENT'; mint='TOKEN_MINT_1'; amount='500' } | ConvertTo-Json
try { Invoke-RestMethod "$base/transactions/prepare" -Method Post -Headers $headers -Body $tampered } catch { $_.Exception.Response.StatusCode }

# 14–18. Transactions, policy preview, previews, security events and metrics
Invoke-RestMethod "$base/transactions" -Headers $headers
$previewBody = @{ agentId=$agentId; policyId=$policyId; recipient='RECIPIENT_1'; mint='TOKEN_MINT_1'; amount='75'; context=@{ purpose='Preview' } } | ConvertTo-Json
Invoke-RestMethod "$base/simulation/run" -Method Post -Headers $headers -Body $previewBody
Invoke-RestMethod "$base/simulation/events" -Headers $headers
Invoke-RestMethod "$base/security/events" -Headers $headers
Invoke-RestMethod "$base/security/overview" -Headers $headers

# 19–20. Disable agent; new authorization is rejected (use a prior assessment if available)
Invoke-RestMethod "$base/agents/$agentId/disable" -Method Post -Headers $headers -Body '{}'
try { Invoke-RestMethod "$base/sentinel/authorize" -Method Post -Headers $headers -Body (@{ assessmentId=$valid.id } | ConvertTo-Json) } catch { $_.Exception.Response.StatusCode }

# 21. Integration status
Invoke-RestMethod "$base/integrations" -Headers $headers
Invoke-RestMethod "$base/integrations/solana/status" -Headers $headers
Invoke-RestMethod "$base/integrations/mcp/status" -Headers $headers

# 22. Valid-shaped submit request must return 503, not pretend to submit
$submitBody = @{ transactionId=$prepared.transactionId; signedTransaction='not-submitted-in-this-phase' } | ConvertTo-Json
try { Invoke-RestMethod "$base/transactions/submit" -Method Post -Headers $headers -Body $submitBody } catch { $_.Exception.Response.StatusCode }
```

After verification, `bun run db:inspect` reports persisted table counts. These commands exercise the running backend; preview results are not evidence of blockchain execution.

## Live runtime verification results

The following results were observed by sending HTTP requests to the running local API on 2026-11-07. The completed workflow made **34 HTTP requests**; all returned the expected status or decision. These are actual API responses, not simulated test-runner results.

| Endpoint coverage | Observed result |
|---|---|
| `GET /api/health` | HTTP 200; database reported connected and API status `ok`. |
| Protected `GET /api/agents` without a Bearer key | HTTP 401. |
| Agent registration, retrieval, listing, metadata update, and disable | Registration HTTP 201; reads and updates HTTP 200. Disable returned `disabled`. |
| Policy create, retrieval, listing, update, and deactivation | Create HTTP 201; reads/updates/deactivation HTTP 200. Deactivation returned `isActive: false`. |
| Sentinel rules and assessment retrieval | HTTP 200. |
| Sentinel valid and over-limit evaluation | Both HTTP 201; the valid amount was approved and the amount above the configured maximum was rejected. |
| Authorization and matching transaction preparation | Authorization and preparation HTTP 201. Preparation returned `prepared_pending_solana_integration`; it did not build or submit a blockchain transaction. |
| Preparation with altered recipient | HTTP 409; mismatched transfer details were rejected. |
| Authorization after disabling the agent | HTTP 409; new authorization was rejected. |
| Transaction list and lookup for an unrecorded signature | List HTTP 200; unknown signature HTTP 404. |
| Policy preview, preview history, security event list/detail/history, and security overview | HTTP 201 for preview creation; HTTP 200 for reads. The overview reported authorized transaction intents. |
| Integration list, Solana status, and MCP status | HTTP 200; Solana was not configured/health-checked and MCP reported available. |
| Valid-shaped `POST /api/transactions/submit` | HTTP 503 with `SOLANA_INTEGRATION_NOT_CONFIGURED`; no submission was made. |

Database verification also confirmed that `bun run db:migrate` could be rerun without reapplying or corrupting the initial migration. The subsequent `bun run db:inspect` reported persisted records: 6 agents, 4 policies, 12 risk assessments, 8 permits, 5 transaction records, 4 simulations, 45 security events, and 1 migration record. Counts include records created during repeated manual verification runs and are not a clean-database fixture.

The runtime checks above were manual HTTP verification; no automated test framework or `tests/` directory was used. They do not verify Solana execution, blockchain confirmation, or Gemini behavior. MCP behavior is verified separately via stdio JSON-RPC against `apps/mcp-server`.

---

## Blockchain Integration Notes (Phase 2)

### Permit Version Selection

The backend will support two permit versions:

**Version 1.0 (Current):**
- Backend-only authorization
- JSON serialization
- Decimal amount format
- ISO-8601 timestamp expiry
- Compatible with current API

**Version 2.0 (Solana Integration):**
- On-chain enforcement via Token-2022 Transfer Hook
- Binary serialization (308 bytes fixed)
- Base unit amounts with explicit mint decimals
- Slot-based expiry
- Requires Solana RPC connection

**API Changes (Future):**

The `POST /api/sentinel/authorize` endpoint will accept an optional `version` parameter:

```json
{
  "assessmentId": "uuid",
  "version": 2  // Optional, defaults to 1
}
```

When `version: 2` is requested:
1. Backend fetches mint decimals from Solana RPC
2. Converts amount to base units
3. Calculates expiry slot
4. Generates 32-byte hex nonce
5. Derives on-chain PDAs (agent registry, policy)
6. Serializes permit to binary format (308 bytes)
7. Signs binary message with Ed25519
8. Returns permit with base64-encoded binary payload

### Mint Decimal Handling

**Current (v1.0):**
```json
{
  "amount": "500.123456",
  "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
}
```

**Future (v2.0):**
```json
{
  "amount": "500123456",  // Base units
  "mintDecimals": 6,      // USDC has 6 decimals
  "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
}
```

**Conversion logic:**
```typescript
// Decimal → Base Units
const baseUnits = toBaseUnits("500.123456", 6);  // "500123456"

// Base Units → Decimal (for display)
const decimal = fromBaseUnits("500123456", 6);  // "500.123456"
```

**Validation:**
- Mint decimals fetched from on-chain mint account
- Fractional precision cannot exceed mint decimals
- Amounts must fit in u64 (0 to 18,446,744,073,709,551,615)
- Zero amounts rejected for transfers

### Slot-Based Expiry Calculation

**Current (v1.0):**
```json
{
  "expiresAt": "2026-11-07T08:33:23.751Z"  // ISO-8601 timestamp
}
```

**Future (v2.0):**
```json
{
  "expiresAt": "2026-11-07T08:33:23.751Z",  // Backend display
  "expiresAtSlot": "250000750"              // On-chain validation
}
```

**Calculation:**
```typescript
const currentSlot = await connection.getSlot();
const ttlSeconds = 300;  // 5 minutes
const slotsToAdd = Math.floor((ttlSeconds * 1000) / 400);  // ~750 slots
const expiresAtSlot = currentSlot + slotsToAdd;
```

**Note:** Slot timing averages ~400ms but varies with network conditions. Backend timestamp and slot-based expiry may diverge slightly.

### Token Account vs. Wallet Address

**Current (v1.0) - Simplified Model:**
```json
{
  "sender": "AGENT_PUBLIC_KEY",
  "recipient": "RECIPIENT_ADDRESS"
}
```

**Future (v2.0) - Solana Model:**
```json
{
  "transferAuthority": "DelegateWallet123...",       // Wallet with signing authority
  "sourceTokenAccount": "SourceTokenAcc456...",      // SPL token account (PDA)
  "destinationTokenAccount": "DestTokenAcc789...",   // SPL token account (PDA)
  "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
}
```

**Relationship:**
- `transferAuthority`: Wallet that signs the transfer transaction
- `sourceTokenAccount`: Derived from `mint + owner`, holds tokens
- `destinationTokenAccount`: Derived from `mint + owner`, receives tokens
- These are three distinct addresses

**Token Account Derivation:**
```typescript
import { getAssociatedTokenAddress } from '@solana/spl-token';

const sourceTokenAccount = await getAssociatedTokenAddress(
  mint,
  sourceOwner
);
```

### Transaction Status Lifecycle

**Current (v1.0):**
```
authorized → prepared → [submitted returns 503]
```

**Future (v2.0):**
```
authorized → prepared → submitted → confirmed
```

**Status Descriptions:**

| Status | Description | v1.0 | v2.0 |
|--------|-------------|------|------|
| `authorized` | Permit issued, transaction intent created | ✅ | ✅ |
| `prepared` | Permit consumed, ready for submission | ✅ | ✅ |
| `submitted` | Transaction sent to Solana RPC | ❌ | ✅ |
| `confirmed` | Transaction confirmed on-chain | ❌ | ✅ |

**New fields in transaction response (v2.0):**
```json
{
  "transactionId": "uuid",
  "status": "confirmed",
  "transactionSignature": "5K7Gm...",  // Actual Solana signature (base58)
  "confirmedAtSlot": "250000750",
  "blockchainEvidence": "confirmation_recorded"
}
```

### Environment Variables (Phase 2)

**Additional variables for Solana integration:**

| Variable | Required | Purpose |
|----------|----------|---------|
| `SOLANA_RPC_URL` | Yes (v2.0) | Solana RPC endpoint (Devnet/Mainnet) |
| `SOLANA_RPC_COMMITMENT` | No | Commitment level (default: `confirmed`) |
| `LILIA_PROGRAM_ID` | Yes (v2.0) | Lilia Anchor program ID (base58) |
| `SOLANA_MINT_CACHE_TTL` | No | Mint info cache duration (default: 3600s) |

**Example configuration:**
```env
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_RPC_COMMITMENT=confirmed
LILIA_PROGRAM_ID=LiLia11111111111111111111111111111111111111
```

### Client Transaction Building (Phase 2)

The backend issues permits, but **clients build and submit transactions**. The backend does not submit transactions directly.

**Client responsibilities:**
1. Request permit from backend (`POST /api/sentinel/authorize`)
2. Construct Ed25519 verification instruction
3. Construct Token-2022 transfer instruction
4. Resolve extra accounts from ExtraAccountMetaList
5. Submit transaction to Solana RPC
6. Poll for confirmation
7. Optionally notify backend of confirmation

**Required client libraries:**
```json
{
  "@solana/web3.js": "^1.95.0",
  "@solana/spl-token": "^0.4.0"
}
```

**Example client flow:**
```typescript
// 1. Get permit from backend
const permit = await fetch(`${backendUrl}/api/sentinel/authorize`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${apiKey}` },
  body: JSON.stringify({ assessmentId: assessmentId })
}).then(res => res.json());

// 2. Build transaction with Ed25519 + Transfer instructions
const transaction = await buildTransaction(connection, permit, ...);

// 3. Submit to Solana
const signature = await sendAndConfirmTransaction(connection, transaction, [payer, authority]);

// 4. Optionally notify backend
await fetch(`${backendUrl}/api/transactions/${signature}/confirm`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${apiKey}` },
  body: JSON.stringify({ signature, slot: confirmedSlot })
});
```

### On-Chain Validation (Phase 2)

When a transaction is submitted with a v2.0 permit:

1. **Ed25519 Precompile** validates Sentinel signature
2. **Token-2022** processes transfer instruction
3. **Transfer Hook** (Lilia Anchor program) validates:
   - Ed25519 instruction exists at index 0
   - Sentinel public key matches configuration
   - Permit fields match transfer parameters
   - Permit not expired (slot-based check)
   - Permit sequence equals `AgentRegistry.next_authorization_sequence`
4. **Transfer Hook** increments the sequence counter (consumes the permit)
5. **Token-2022** completes transfer (if hook returns Ok)

**Validation failures:**
- `PermitExpired`: Current slot > expires_at_slot
- `InvalidSequence`: permit sequence is not the current on-chain sequence (replay or pre-minted)
- `AmountMismatch`: Transfer amount ≠ permit amount
- `SourceMismatch`: Source account ≠ permit source
- `DestinationMismatch`: Destination ≠ permit destination
- `MintMismatch`: Mint ≠ permit mint
- `InvalidVerificationProgram`: Ed25519 instruction missing or wrong

### API Compatibility

**Backward Compatibility:**

Phase 2 maintains full compatibility with Phase 1:
- All existing v1.0 endpoints unchanged
- Permit v1.0 continues to work for backend-only authorization
- No breaking changes to request/response formats
- `POST /api/transactions/submit` still returns 503 (clients submit directly)

**Gradual Migration:**

1. Deploy Phase 2 backend with v2.0 support
2. Clients can request v1.0 or v2.0 permits
3. v2.0 permits enable on-chain enforcement
4. v1.0 permits continue backend-only authorization
5. Eventually deprecate v1.0 after migration period

### Documentation References

**Complete specifications:**
- [PERMIT_SPECIFICATION.md](./PERMIT_SPECIFICATION.md) - Permit v1.0 and v2.0 formats
- [PERMIT_V2_BINARY_FORMAT.md](./docs/PERMIT_V2_BINARY_FORMAT.md) - Binary serialization spec
- [BLOCKCHAIN_INTEGRATION_SPEC.md](./docs/BLOCKCHAIN_INTEGRATION_SPEC.md) - End-to-end integration
- [ONCHAIN_ACCOUNT_SPEC.md](./docs/ONCHAIN_ACCOUNT_SPEC.md) - PDA derivations and account layouts
- [TRANSFER_HOOK_SECURITY_MODEL.md](./docs/TRANSFER_HOOK_SECURITY_MODEL.md) - Security model and threat analysis

---

**API Version:** 1.0 (Current) / 2.0 (In Development)  
**Last Updated:** November 7, 2026  
**Phase 2 Status:** Specification Complete, Implementation Pending
