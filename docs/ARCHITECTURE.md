# Lilia Backend Architecture

**Last Updated:** November 7, 2026  
**Security Audit Status:** ✅ Comprehensive audit completed  
**Permit Specification:** See [PERMIT_SPECIFICATION.md](./PERMIT_SPECIFICATION.md)  
**Security Audit Report:** See [SECURITY_AUDIT.md](./SECURITY_AUDIT.md)

The REST API is a Bun/TypeScript Fastify application implementing secure backend authorization for AI agent token transfers. All protected routes authenticate a single configured owner before input reaches a handler. Handlers validate input with shared Zod schemas and call shared service classes; services use focused repositories or Drizzle queries against persistent SQLite.

## Request Path

```
HTTP Request
  ↓
Authentication Middleware (Bearer token, constant-time comparison)
  ↓
Zod Schema Validation (request body/params/query)
  ↓
Route Handler
  ↓
Service Layer (business logic, ownership checks)
  ↓
Repository/Drizzle ORM
  ↓
SQLite Database (WAL mode, foreign keys enabled)
  ↓
Response Envelope (success/error, metadata, request ID)
```

## Core Components

### Authentication & Authorization

- **Authentication:** Bearer API key with `timingSafeEqual` comparison (constant-time)
- **Owner Identity:** Derived from credential as `'lilia-single-owner'`, never from request data
- **Ownership Isolation:** All queries filter by `ownerId` or verify ownership with `requireOwned(ownerId, id)`
- **Protected Endpoints:** 27 of 28 endpoints require authentication (only `/api/health` is public)
- **Cross-Owner Prevention:** Non-owned resources return 404 (indistinguishable from missing)

### Sentinel Evaluation Service

`EvaluationService` is the shared evaluation boundary:

1. **Loads owned agent** - Verifies ownership and active status
2. **Selects policy** - Explicit `policyId` parameter (optional) or automatic selection (most recently updated active policy)
3. **Invokes `RulesEngine`** - Deterministic policy evaluation using integer arithmetic
4. **Stores risk assessment** - Persists evaluation result with policy version
5. **Records security event** - Audit trail for all evaluations

**Policy Selection (Enhanced in Nov 2026):**
- Accepts optional `policyId` parameter for explicit selection
- Falls back to automatic selection: `ORDER BY updatedAt DESC LIMIT 1`
- Verifies policy ownership, agent association, and active status
- Policy version recorded in assessment for later validation

**Product preview** (simulation) calls the same rules engine without creating permits or transaction records.

### Authorization Service

`AuthorizationService` issues cryptographically signed permits:

1. **Rechecks assessment** - Verifies current agent and policy state
2. **Validates policy version** - Assessment must match current policy version
3. **Creates permit** - `PermitService` signs canonical payload with Ed25519
4. **Atomic creation** - Permit + transaction intent created in single database transaction
5. **Records event** - Security audit trail

**Permit Signing:**
- Ed25519 signature over deterministic JSON serialization
- Private key never stored in database or returned in responses
- 5-minute TTL (300 seconds)
- UUID nonce for replay prevention
- See [PERMIT_SPECIFICATION.md](./PERMIT_SPECIFICATION.md) for complete specification

### Transaction Service

`TransactionService` manages transaction lifecycle:

1. **Preparation** - Validates permit and creates local transaction intent
2. **Verification** - Checks signature, expiry, policy version, transfer details
3. **Atomic consumption** - Permit consumed in database transaction with optimistic locking
4. **Honest status** - Returns `prepared_pending_solana_integration`, never fabricates blockchain evidence

**State Model:**
```
authorized → prepared → [submitted] → [confirmed]
    ↓
rejected (terminal)
```

- `authorized`: Created when permit issued
- `prepared`: Permit consumed, local intent ready
- `submitted`: NOT IMPLEMENTED (Solana RPC required)
- `confirmed`: NOT IMPLEMENTED (blockchain evidence required)
- `rejected`: Agent disabled or policy changed before preparation

### Rules Engine

Deterministic policy evaluation using exact integer arithmetic:

- **Amount comparison:** Converts decimal strings to bigint (10^18 precision)
- **Recipient checks:** Allow/deny list enforcement
- **Mint validation:** Optional mint restriction
- **Policy expiry:** Time-based policy expiration
- **Agent status:** Only active agents can transact
- **No AI override:** Policy failures cannot be overridden

**Risk Scoring:**
- Critical violations: 100 (blocked recipient, inactive agent/policy, expired policy)
- Multiple violations: 55 + (count * 10), capped at 95
- Clean evaluation: 5

## Trust Boundaries

### Authentication Trust Boundary

- ✅ **API key** maps to one fixed owner identity; clients cannot choose an owner
- ✅ **Owner derivation** from authenticated credential only, never from request body/query
- ✅ **Constant-time comparison** prevents timing attacks on API key
- ✅ **Agent and policy reads** scoped to that owner with database-level filtering

### Cryptographic Trust Boundary

- ✅ **API keys and private signing keys** are redacted in logs
- ✅ **SQLite stores** only public keys and signatures, never private key material
- ✅ **Ed25519 key pair** validated at startup (public key matches private key)
- ✅ **Permit signatures** use deterministic canonical serialization
- ✅ **Signature verification** performed before permit consumption

### Backend vs On-Chain Trust Boundary

- ⚠️ **Permits are backend-signed authorization**, not proof of on-chain enforcement
- ⚠️ **Preparation stores local intent only**, not blockchain transaction
- ⚠️ **Submit endpoint** returns 503 (Solana integration not configured)
- ⚠️ **No fabricated blockchain evidence** - transaction signatures always null, confirmed count always 0
- ✅ **Honest status reporting** - all responses clearly indicate backend-only operation

**Future:** Solana building, submission, and confirmation require RPC integration and Anchor program deployment.

### Integration Trust Boundary

- ⚠️ **Gemini API key** reported as configured but not used (deterministic evaluation only)
- ❌ **MCP** is not implemented
- ❌ **Solana RPC** is not configured (no health checks, no transaction building)

## Persistence

### Database Schema

`database/schema/index.ts` defines the Drizzle ORM schema. Key tables:

- **agents:** Agent registry with owner isolation
- **policies:** Spending policies with versioning
- **risk_assessments:** Sentinel evaluation results
- **authorization_permits:** Signed permits with unique hash constraint
- **transactions:** Transaction intents and records
- **security_events:** Audit trail
- **simulations:** Policy preview results

### Database Security

- ✅ **Foreign keys enabled** via `PRAGMA foreign_keys = ON`
- ✅ **WAL mode** enabled for better concurrency
- ✅ **Unique constraint** on `permit_hash` prevents replay attacks
- ✅ **Indexes** on all critical query paths (ownerId, agentId, status, permitHash)
- ✅ **Enum constraints** enforce valid status values
- ✅ **Atomic operations** use database transactions
- ✅ **Optimistic locking** prevents race conditions (WHERE status checks)

### Migration Strategy

Ordered SQL migrations in `database/migrations` are:
- Idempotent (can be run multiple times safely)
- Tracked in `schema_migrations` table
- Never reset or drop application data
- Applied with `bun run db:migrate`

**Current limitation:** Single hardcoded migration (technical debt for multi-migration support).

## Concurrency & Race Condition Prevention

### Permit Consumption

**Problem:** Two concurrent requests could try to prepare the same permit.

**Solution:** Optimistic locking with atomic database transaction:

```typescript
await db.transaction(async (tx) => {
  const consumed = await tx.update(permits)
    .set({ status: "consumed" })
    .where(and(
      eq(permits.id, permitId),
      eq(permits.status, "issued")  // Optimistic lock
    ))
    .returning({ id: permits.id });
    
  if (consumed.length === 0) {
    throw new AppError(409, "PERMIT_UNAVAILABLE");
  }
  
  // Update transaction status...
  // Insert security event...
});
```

Only one request succeeds; others receive 409 Conflict.

### Policy Updates

**Problem:** Policy update during permit consumption.

**Solution:** Policy version embedded in permit and verified at preparation:

```typescript
if (policy.policyVersion !== permitPolicyVersion(permit.signedPayload)) {
  throw new AppError(409, "PERMIT_OUTDATED");
}
```

Policy updates increment version and revoke all issued permits atomically.

## Security Verification (Nov 2026 Audit)

### Audit Summary

- ✅ **0 Critical Issues**
- ✅ **1 High Severity Issue** (documented pre-Solana limitation, acceptable for MVP)
- ✅ **1 Medium Severity Issue** (fixed - policy selection)
- ✅ **5 Low Severity Issues** (all accepted as design decisions for MVP scale)

### Verified Security Properties

- ✅ **Authentication:** All endpoints properly protected
- ✅ **Ownership isolation:** No cross-owner access possible
- ✅ **Cryptographic permits:** Secure Ed25519 signing and verification
- ✅ **Transaction lifecycle:** Honest state management, no fabricated evidence
- ✅ **Database integrity:** Proper constraints, indexes, and atomic operations
- ✅ **Replay prevention:** Unique permit hashes, atomic consumption
- ✅ **Policy enforcement:** Deterministic evaluation, version tracking
- ✅ **Audit trail:** Security events for all state changes

### Runtime Verification

15 manual HTTP verification tests executed on November 7, 2026:
- Authentication, authorization, and ownership checks
- Policy evaluation and enforcement
- Permit issuance and consumption
- Tamper detection and rejection
- Honest integration status reporting

All tests passed. See [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) for detailed results.

## Future Integration Seams

### Solana Integration (Ready for v2.0 Permits)

**Current architecture supports:**
- ✅ Permit version field (can increment 1 → 2)
- ✅ Modular signing service (can support multiple formats)
- ✅ Transaction status model (can add submitted/confirmed)
- ✅ Database schema (supports transaction signatures)

**Required changes for on-chain enforcement:**
1. Add `@solana/web3.js` and Anchor dependencies
2. Implement mint decimal lookup via RPC
3. Update permit format to v2.0 (see PERMIT_SPECIFICATION.md)
4. Add transaction building in `TransactionService.prepare`
5. Implement submission in `TransactionService.submit`
6. Add confirmation polling and status updates
7. Deploy Anchor program with Transfer Hook
8. Register backend signing key on-chain

**Migration strategy:** Support parallel v1 (backend-only) and v2 (on-chain) permits.

### MCP Integration

A future MCP adapter can call the same exported service classes:
- `EvaluationService.evaluate()`
- `AuthorizationService.authorize()`
- `TransactionService.prepare()`
- `PolicyService` for policy management

This avoids reproducing policy logic and maintains security invariants.

## Error Handling

All errors use consistent `AppError` class:
- **Status code:** HTTP status (400, 401, 404, 409, 500, 503)
- **Error code:** Machine-readable code (e.g., "PERMIT_EXPIRED", "AGENT_DISABLED")
- **Message:** Human-readable description
- **Details:** Validation errors (when applicable)

**Envelope format:**
```json
{
  "success": false,
  "error": {
    "code": "PERMIT_DETAILS_MISMATCH",
    "message": "Transfer details do not match the signed permit",
    "details": []
  },
  "meta": {
    "requestId": "req-123",
    "timestamp": "2026-11-07T08:33:23.751Z"
  }
}
```

No stack traces or credentials exposed in error responses.

## Logging & Observability

- **Request IDs:** Every request assigned unique ID (`request.id`)
- **Structured logging:** Fastify logger with configurable level
- **Redaction:** API keys, private keys, and authorization headers redacted
- **Security events:** All state changes recorded in `security_events` table
- **Audit trail:** Complete history of evaluations, authorizations, and transactions

## Development Commands

| Command | Purpose |
|---------|---------|
| `bun run dev` | Run with watch mode |
| `bun run start` | Run production mode |
| `bun run typecheck` | TypeScript validation |
| `bun run lint` | Biome lint check |
| `bun run format` | Format codebase |
| `bun run db:migrate` | Apply migrations |
| `bun run db:inspect` | View table counts |
| `bun run db:generate-key` | Generate Ed25519 key pair |

## Documentation

- [API.md](../API.md) - Complete REST API reference with all 28 endpoints
- [PERMIT_SPECIFICATION.md](./PERMIT_SPECIFICATION.md) - Permit format v1.0 and v2.0 specifications
- [SECURITY_AUDIT.md](./SECURITY_AUDIT.md) - November 2026 comprehensive security audit report
- [README.md](../README.md) - Setup and getting started guide


---

## Blockchain Integration Architecture (Phase 2)

### Overview

Phase 2 extends the Lilia backend to support **on-chain enforcement** of authorization permits via Solana Token-2022 Transfer Hooks. The backend maintains its role as the policy evaluation and permit signing authority, while on-chain validation ensures transfers cannot bypass authorization.

**Key Design Principles:**

1. **Backend Signs, Chain Validates:** Backend issues cryptographic permits; Anchor program validates them on-chain
2. **Client Builds Transactions:** Backend does NOT submit transactions; clients construct and submit them
3. **Backward Compatible:** Permit v1.0 (backend-only) continues working alongside v2.0 (on-chain)
4. **Minimal On-Chain Storage:** Store only data required for validation (MVP mode uses backend signatures only)
5. **Atomic Nonce Consumption:** Authorization PDAs prevent permit replay attacks

### Component Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Lilia Ecosystem                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                   Sentinel Backend (Phase 1)                  │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │  • Policy evaluation                                          │  │
│  │  • Risk assessment                                            │  │
│  │  • Ed25519 permit signing                                     │  │
│  │  • Transaction intent tracking                                │  │
│  │  • Security event logging                                     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                          │                                          │
│                          │ REST API (permits)                       │
│                          ▼                                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                   Client Application (Phase 2)                │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │  • Requests permits from backend                              │  │
│  │  • Builds Ed25519 verification instruction                    │  │
│  │  • Builds Token-2022 transfer instruction                     │  │
│  │  • Resolves extra accounts                                    │  │
│  │  • Submits to Solana RPC                                      │  │
│  │  • Polls for confirmation                                     │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                          │                                          │
│                          │ RPC (transactions)                       │
│                          ▼                                          │
│  ┌──────────────────────────────────────────────────────────────┐  │
│  │                   Solana Blockchain (Phase 2)                 │  │
│  ├──────────────────────────────────────────────────────────────┤  │
│  │                                                                │  │
│  │  1. Ed25519 Precompile verifies Sentinel signature            │  │
│  │  2. Token-2022 processes transfer                             │  │
│  │  3. Transfer Hook validates permit                            │  │
│  │  4. Authorization PDA prevents replay                         │  │
│  │  5. Transfer completes or fails                               │  │
│  │                                                                │  │
│  └──────────────────────────────────────────────────────────────┘  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

### Backend Enhancements

**New Capabilities (Phase 2):**

- ✅ Solana RPC client for mint decimal lookup
- ✅ Slot monitoring for expiry calculation
- ✅ Binary permit serialization (308 bytes)
- ✅ Dual permit version support (v1.0 and v2.0)
- ✅ Amount conversion (decimal → base units)
- ✅ PDA derivation (agent registry, policy, authorization)

**Backend Does NOT:**

- ❌ Build Solana transactions
- ❌ Submit transactions to RPC
- ❌ Manage Solana keypairs (except Sentinel signing key)
- ❌ Poll for confirmations
- ❌ Execute transfers directly

**New Services:**

```typescript
// Solana RPC integration
class SolanaService {
  async getMintDecimals(mint: string): Promise<number>;
  async getCurrentSlot(): Promise<number>;
  async getTransaction(signature: string): Promise<Transaction>;
}

// Permit v2 serialization
class PermitSerializerV2 {
  serialize(payload: PermitPayloadV2): Buffer;
  deserialize(bytes: Buffer): PermitPayloadV2;
}

// PDA derivation
class PDAService {
  deriveAgentRegistry(agentId: string): PublicKey;
  derivePolicy(policyId: string): PublicKey;
  deriveAuthorization(nonce: Buffer): PublicKey;
  deriveExtraAccountMetaList(mint: PublicKey): PublicKey;
}
```

### RPC Client Architecture

**Connection Management:**

```typescript
class SolanaConnectionManager {
  private connection: Connection;
  private commitment: Commitment = 'confirmed';
  
  constructor(rpcUrl: string) {
    this.connection = new Connection(rpcUrl, this.commitment);
  }
  
  async getConnection(): Promise<Connection> {
    return this.connection;
  }
}
```

**Mint Decimal Caching:**

```typescript
class MintDecimalCache {
  private cache: Map<string, { decimals: number; timestamp: number }>;
  private ttl: number = 3600_000; // 1 hour
  
  async get(mint: string): Promise<number | null> {
    const cached = this.cache.get(mint);
    if (cached && Date.now() - cached.timestamp < this.ttl) {
      return cached.decimals;
    }
    return null;
  }
  
  set(mint: string, decimals: number): void {
    this.cache.set(mint, { decimals, timestamp: Date.now() });
  }
}
```

**Slot Monitoring:**

```typescript
class SlotMonitor {
  private currentSlot: number = 0;
  private lastUpdate: number = 0;
  private updateInterval: number = 5000; // 5 seconds
  
  async getCurrentSlot(connection: Connection): Promise<number> {
    const now = Date.now();
    if (now - this.lastUpdate > this.updateInterval) {
      this.currentSlot = await connection.getSlot(this.commitment);
      this.lastUpdate = now;
    }
    return this.currentSlot;
  }
}
```

### Transaction Building Pipeline

**Client Responsibility:**

The backend issues permits but does NOT build or submit transactions. Clients must:

1. **Request Permit:**
   ```typescript
   const permit = await fetch(`${backendUrl}/api/sentinel/authorize`, {
     method: 'POST',
     body: JSON.stringify({ assessmentId, version: 2 })
   });
   ```

2. **Parse Binary Payload:**
   ```typescript
   const permitBytes = Buffer.from(permit.signedPayload, 'base64');
   const permitPayload = deserializePermitV2(permitBytes);
   ```

3. **Build Ed25519 Instruction:**
   ```typescript
   const ed25519Ix = Ed25519Program.createInstructionWithPublicKey({
     publicKey: sentinelPublicKey.toBytes(),
     message: permitBytes,
     signature: Buffer.from(permit.signature, 'base64url'),
   });
   ```

4. **Resolve Extra Accounts:**
   ```typescript
   const extraAccountMetaListPda = getExtraAccountMetaAddress(mint, programId);
   const extraAccounts = await resolveExtraAccountMeta(
     connection,
     extraAccountMetaListPda,
     [source, mint, destination, authority]
   );
   ```

5. **Build Transfer Instruction:**
   ```typescript
   const transferIx = createTransferCheckedWithTransferHookInstruction(
     source,
     mint,
     destination,
     authority,
     amount,
     decimals,
     [],
     'confirmed',
     programId
   );
   ```

6. **Submit Transaction:**
   ```typescript
   const transaction = new Transaction().add(ed25519Ix, transferIx);
   const signature = await sendAndConfirmTransaction(
     connection,
     transaction,
     [payer, authority]
   );
   ```

### Confirmation Polling

**Backend Enhancement (Optional):**

The backend can optionally poll for confirmations to update transaction status:

```typescript
class ConfirmationPoller {
  async pollTransaction(signature: string): Promise<void> {
    const connection = await this.solanaService.getConnection();
    
    // Wait for confirmation
    await connection.confirmTransaction(signature, 'confirmed');
    
    // Fetch transaction details
    const tx = await connection.getTransaction(signature, {
      commitment: 'confirmed',
      maxSupportedTransactionVersion: 0,
    });
    
    if (!tx) {
      throw new Error('Transaction not found');
    }
    
    // Update database
    await this.db.update(transactions)
      .set({
        status: 'confirmed',
        transactionSignature: signature,
        confirmedAtSlot: tx.slot,
        updatedAt: now(),
      })
      .where(eq(transactions.permitId, permitId));
    
    // Log security event
    await this.events.create({
      type: 'transaction.confirmed',
      severity: 'info',
      description: 'Transaction confirmed on-chain',
      metadata: { signature, slot: tx.slot },
    });
  }
}
```

**Client-Driven Update (Alternative):**

Clients can notify backend after confirmation:

```typescript
// Client confirms transaction
const signature = await sendAndConfirmTransaction(...);

// Notify backend
await fetch(`${backendUrl}/api/transactions/${signature}/confirm`, {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${apiKey}` },
  body: JSON.stringify({
    signature,
    slot: confirmedSlot,
  })
});
```

### On-Chain Account Management

**Anchor Program Accounts:**

```rust
// Sentinel authority (global, one-time setup)
#[account]
pub struct SentinelAuthority {
    pub public_key: Pubkey,          // 32 bytes
    pub upgrade_authority: Pubkey,   // 32 bytes
    pub bump: u8,                    // 1 byte
}

// Authorization record (per transfer)
#[account]
pub struct AuthorizationRecord {
    pub nonce: [u8; 32],            // 32 bytes
    pub agent: Pubkey,              // 32 bytes
    pub consumed_at_slot: u64,      // 8 bytes
    pub bump: u8,                   // 1 byte
}

// Agent registry (optional MVP)
#[account]
pub struct AgentRegistry {
    pub agent_id: String,           // 40 bytes (4 + 36)
    pub public_key: Pubkey,         // 32 bytes
    pub owner: Pubkey,              // 32 bytes
    pub status: u8,                 // 1 byte
    pub registered_at_slot: u64,    // 8 bytes
    pub bump: u8,                   // 1 byte
}

// Policy (optional MVP)
#[account]
pub struct Policy {
    pub policy_id: String,                  // 40 bytes
    pub agent_registry: Pubkey,             // 32 bytes
    pub owner: Pubkey,                      // 32 bytes
    pub max_transfer_amount: u64,           // 8 bytes
    pub allowed_mint: Option<Pubkey>,       // 33 bytes
    pub is_active: bool,                    // 1 byte
    pub policy_version: u32,                // 4 bytes
    pub expires_at_slot: u64,               // 8 bytes
    pub bump: u8,                           // 1 byte
}
```

**PDA Derivation:**

```typescript
// Backend derives PDAs when issuing v2 permits
const [agentRegistryPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("agent"), Buffer.from(agentId)],
  programId
);

const [policyPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("policy"), Buffer.from(policyId)],
  programId
);

const [authorizationPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("authorization"), nonceBytes],
  programId
);
```

### Security Model

**Transfer Hook Execution:**

```rust
pub fn execute(ctx: Context<TransferHookExecute>, amount: u64) -> Result<()> {
    // 1. Load Ed25519 instruction (previous instruction in transaction)
    let ed25519_ix = load_instruction_at_checked(0, &instructions_sysvar)?;
    
    // 2. Validate Ed25519 program ID
    require_keys_eq!(ed25519_ix.program_id, ED25519_PROGRAM_ID, ErrorCode::Invalid);
    
    // 3. Parse and validate Sentinel public key
    let ed25519_data = parse_ed25519_ix_data(&ed25519_ix.data)?;
    require!(
        ed25519_data.public_key == sentinel_authority.public_key.to_bytes(),
        ErrorCode::UnauthorizedSigner
    );
    
    // 4. Deserialize permit from message
    let permit = PermitDataV2::deserialize_from_bytes(&ed25519_data.message)?;
    
    // 5. Validate expiry
    let clock = Clock::get()?;
    require!(clock.slot <= permit.expires_at_slot, ErrorCode::PermitExpired);
    
    // 6. Validate transfer parameters
    require_keys_eq!(permit.source_token_account, source.key(), ErrorCode::SourceMismatch);
    require_keys_eq!(permit.destination_token_account, destination.key(), ErrorCode::DestMismatch);
    require_keys_eq!(permit.mint, mint.key(), ErrorCode::MintMismatch);
    require_eq!(permit.amount, amount, ErrorCode::AmountMismatch);
    require_eq!(permit.mint_decimals, mint.decimals, ErrorCode::DecimalsMismatch);
    
    // 7. Validate policy (optional)
    if let Some(policy) = &ctx.accounts.policy {
        require!(policy.is_active, ErrorCode::PolicyInactive);
        require_eq!(policy.policy_version, permit.policy_version, ErrorCode::VersionMismatch);
    }
    
    // 8. Consume nonce (prevents replay)
    let auth = &mut ctx.accounts.authorization;
    auth.nonce = permit.nonce;
    auth.agent = permit.agent_public_key;
    auth.consumed_at_slot = clock.slot;
    auth.bump = ctx.bumps.authorization;
    
    // 9. Emit event
    emit!(TransferAuthorized {
        nonce: permit.nonce,
        agent: permit.agent_public_key,
        amount: permit.amount,
        slot: clock.slot,
    });
    
    Ok(())
}
```

**Security Properties:**

1. ✅ **Authorization:** Only Sentinel-signed permits accepted
2. ✅ **Replay Prevention:** Nonce PDA prevents reuse
3. ✅ **Parameter Integrity:** All fields validated on-chain
4. ✅ **Expiry Enforcement:** Slot-based expiry checked
5. ✅ **Policy Compliance:** On-chain policy validated (optional)

### Error Handling

**Backend Errors:**

```typescript
// Solana RPC errors
if (!connection) {
  throw new AppError(503, 'SOLANA_NOT_CONFIGURED', 'Solana RPC not configured');
}

// Mint lookup failures
try {
  const mintInfo = await getMint(connection, mint);
  return mintInfo.decimals;
} catch (error) {
  throw new AppError(400, 'INVALID_MINT', 'Cannot fetch mint information');
}

// Slot query failures
try {
  const slot = await connection.getSlot();
  return slot;
} catch (error) {
  throw new AppError(503, 'RPC_ERROR', 'Failed to query current slot');
}
```

**On-Chain Errors:**

```rust
#[error_code]
pub enum ErrorCode {
    #[msg("Ed25519 instruction has wrong program ID")]
    InvalidVerificationProgram,
    
    #[msg("Signature not from authorized Sentinel")]
    UnauthorizedSigner,
    
    #[msg("Permit has expired")]
    PermitExpired,
    
    #[msg("Nonce already used (replay attempt)")]
    NonceAlreadyUsed,
    
    #[msg("Source token account mismatch")]
    SourceMismatch,
    
    #[msg("Destination token account mismatch")]
    DestinationMismatch,
    
    #[msg("Mint address mismatch")]
    MintMismatch,
    
    #[msg("Transfer amount mismatch")]
    AmountMismatch,
    
    #[msg("Mint decimals mismatch")]
    DecimalsMismatch,
    
    #[msg("Policy is inactive")]
    PolicyInactive,
    
    #[msg("Policy version mismatch")]
    PolicyVersionMismatch,
}
```

### Deployment Strategy

**Phase 2 Rollout:**

1. **Development:**
   - Implement Solana RPC client
   - Implement permit v2 serialization
   - Add PDA derivation utilities
   - Develop Anchor Transfer Hook program

2. **Testing:**
   - Unit tests for binary serialization
   - Integration tests on Devnet
   - Test permit v1/v2 compatibility
   - Test nonce replay prevention
   - Test all error conditions

3. **Devnet Deployment:**
   - Deploy Anchor program to Devnet
   - Initialize SentinelAuthority
   - Initialize ExtraAccountMetaList for test mint
   - Test end-to-end flow

4. **Mainnet Preparation:**
   - Security audit of Anchor program
   - Load testing on Devnet
   - Documentation review
   - Client library development

5. **Mainnet Deployment:**
   - Deploy Anchor program to Mainnet
   - Initialize SentinelAuthority with production key
   - Initialize ExtraAccountMetaList for production mints
   - Monitor initial transfers
   - Gradual rollout to users

### Future Enhancements

**Post-Phase 2 Features:**

1. **Multi-Signature Authority:**
   - Require M-of-N Sentinel signatures
   - Reduces single point of failure

2. **On-Chain Policy Registry:**
   - Store full policy data on-chain
   - Enable complex policy enforcement

3. **Recipient Allowlist:**
   - Store allowed/blocked recipients on-chain
   - Enforce at Transfer Hook level

4. **Velocity Limits:**
   - Track spending per time period
   - Enforce rate limits on-chain

5. **Emergency Pause:**
   - Global pause mechanism
   - Stop all transfers in emergency

6. **Key Rotation:**
   - Automated Sentinel key rotation
   - Gradual migration to new keys

### Monitoring and Observability

**Metrics to Track:**

- Permit issuance rate (v1 vs v2)
- On-chain transfer success rate
- Authorization PDA creation rate
- Average confirmation time
- RPC call latency
- Mint decimal cache hit rate
- Error rates by type

**Logging Enhancements:**

```typescript
logger.info('Permit v2 issued', {
  permitId: permit.id,
  version: 2,
  agentId: input.agentId,
  mint: input.mint,
  mintDecimals: decimals,
  amountBaseUnits: amountBaseUnits,
  expiresAtSlot: expiresAtSlot,
  nonce: nonce,
});

logger.info('Transaction confirmed', {
  transactionId: tx.id,
  signature: signature,
  slot: confirmedSlot,
  permitId: tx.permitId,
  confirmationTime: Date.now() - tx.createdAt,
});
```

---

**Architecture Version:** 2.0  
**Last Updated:** November 7, 2026  
**Status:** Phase 2 specification complete, implementation pending  
**Next Steps:** Implement Solana RPC client, binary serialization, and Anchor Transfer Hook program
