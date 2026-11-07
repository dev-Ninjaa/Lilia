# Lilia Authorization Permit Specification

**Version:** 2.0 (Proposed) / 1.0 (Implemented)  
**Last Updated:** November 7, 2026  
**Status:** v1.0 production (backend-only), v2.0 specification complete (awaiting implementation)

---

## Table of Contents

1. [Overview](#overview)
2. [Version 1.0 - Backend Authorization](#version-10---backend-authorization)
3. [Version 2.0 - Solana Token-2022 Integration](#version-20---solana-token-2022-integration)
4. [Migration Strategy](#migration-strategy)
5. [Security Considerations](#security-considerations)
6. [References](#references)

---

## Overview

Lilia authorization permits are cryptographically signed messages that authorize specific Token-2022 transfers on Solana. The Sentinel backend signs permits using Ed25519, and the on-chain Transfer Hook validates these signatures before allowing transfers to complete.

**Key Principles:**

1. **One permit authorizes exactly one transfer** - no reusable or multi-transfer permits
2. **Permits bind all critical transfer parameters** - amount, accounts, mint, policy, expiry
3. **Backend signatures are verified on-chain** - via Ed25519 precompile instruction
4. **Nonces prevent replay attacks** - each permit can only be consumed once
5. **Expiry is slot-based** - deterministic on-chain validation without timestamps

**Architecture:**

```
┌─────────────┐                    ┌─────────────┐                    ┌─────────────┐
│   Client    │                    │   Sentinel  │                    │   Solana    │
│             │                    │   Backend   │                    │  Transfer   │
│             │                    │             │                    │    Hook     │
└─────────────┘                    └─────────────┘                    └─────────────┘
      │                                   │                                   │
      │  1. Request evaluation            │                                   │
      ├──────────────────────────────────>│                                   │
      │                                   │                                   │
      │  2. Policy check + risk           │                                   │
      │     assessment                    │                                   │
      │                                   │                                   │
      │  3. Issue signed permit           │                                   │
      │<──────────────────────────────────┤                                   │
      │                                   │                                   │
      │  4. Build Ed25519 verify ix       │                                   │
      │                                   │                                   │
      │  5. Build transfer ix with        │                                   │
      │     Token-2022 hook               │                                   │
      │                                   │                                   │
      │  6. Submit transaction            │                                   │
      ├───────────────────────────────────────────────────────────────────────>│
      │                                   │                                   │
      │                                   │  7. Token-2022 invokes hook       │
      │                                   │                                   │
      │                                   │  8. Hook validates Ed25519 ix     │
      │                                   │                                   │
      │                                   │  9. Hook validates permit fields  │
      │                                   │                                   │
      │                                   │ 10. Hook consumes nonce PDA       │
      │                                   │                                   │
      │                                   │ 11. Transfer succeeds or fails    │
      │                                   │                                   │
      │ 12. Confirmation                  │                                   │
      │<───────────────────────────────────────────────────────────────────────┤
      │                                   │                                   │
```

---

## Version 1.0 - Backend Authorization

### Purpose

Version 1.0 provides **backend-only authorization** for the pre-Solana MVP. It establishes:
- Cryptographic permit signing with Ed25519
- Policy evaluation and enforcement
- Audit trail and security logging
- Transaction intent lifecycle

**Limitation:** v1.0 is **NOT compatible** with Solana Token-2022 transfers due to simplified address model.

### Field Definitions

| Field | Type | Description | Validation |
|-------|------|-------------|------------|
| `domain` | string | Protocol identifier | Must be `"lilia.authorization.v1"` |
| `version` | number | Permit format version | Must be `1` |
| `agentId` | string | Backend agent UUID | Valid UUID v4 |
| `agentPublicKey` | string | Agent identity key | 1-128 chars |
| `policyId` | string | Backend policy UUID | Valid UUID v4 |
| `policyVersion` | number | Policy version at authorization | Positive integer ≥ 1 |
| `sender` | string | Transfer sender address | Derived from `agentPublicKey` |
| `recipient` | string | Transfer recipient address | 1-128 chars |
| `mint` | string | Token mint address | 1-128 chars |
| `amount` | string | Transfer amount (decimal) | Regex: `^(0\|[1-9]\d*)(\.\d{1,18})?$` |
| `expiresAt` | string | Expiry timestamp | ISO-8601 UTC with milliseconds |
| `nonce` | string | Replay prevention identifier | UUID v4 |

### Canonical Serialization (v1.0)

The permit payload MUST be serialized as compact JSON with **exact field ordering**:

```typescript
function canonicalPermitV1(payload: PermitPayloadV1): string {
  return JSON.stringify({
    domain: payload.domain,
    version: payload.version,
    agentId: payload.agentId,
    agentPublicKey: payload.agentPublicKey,
    policyId: payload.policyId,
    policyVersion: payload.policyVersion,
    sender: payload.sender,
    recipient: payload.recipient,
    mint: payload.mint,
    amount: payload.amount,
    expiresAt: payload.expiresAt,
    nonce: payload.nonce,
  });
}
```

**Serialization Rules:**
1. Use `JSON.stringify()` with NO whitespace or formatting
2. Fields MUST appear in the exact order shown
3. No additional fields allowed
4. UTF-8 encoding required
5. Amount preserves exact decimal string representation

**Example canonical string:**
```json
{"domain":"lilia.authorization.v1","version":1,"agentId":"14414925-4284-4be6-82ab-911ba754976d","agentPublicKey":"AUDIT_AGENT_KEY_2026","policyId":"b2002ed6-821a-4fc9-85e3-6415262a6ab6","policyVersion":1,"sender":"AUDIT_AGENT_KEY_2026","recipient":"TEST_RECIPIENT_1","mint":"TEST_MINT","amount":"500","expiresAt":"2026-11-07T08:28:23.751Z","nonce":"aaa6960f-9b47-4e22-a105-39b46b687051"}
```

### Signature Algorithm (v1.0)

**Algorithm:** Ed25519 (EdDSA on Curve25519)

**Signing Process:**

```typescript
import { createPrivateKey, sign } from 'node:crypto';

function signPermitV1(canonicalPayload: string, privatePEM: string): string {
  const message = Buffer.from(canonicalPayload, "utf8");
  const privateKey = createPrivateKey(privatePEM);
  
  const signature = sign(
    null,  // No digest - Ed25519 signs message directly
    message,
    privateKey
  );
  
  return signature.toString("base64url");  // 86 characters
}
```

**Hash Calculation:**

```typescript
import { createHash } from 'node:crypto';

function hashPermit(canonicalPayload: string): string {
  return createHash("sha256")
    .update(canonicalPayload, "utf8")
    .digest("hex");  // Lowercase hexadecimal, 64 characters
}
```

### Verification Requirements (v1.0)

Backend verification MUST perform the following checks in order:

1. ✅ Parse stored `signedPayload` as JSON
2. ✅ Recompute hash: `SHA-256(signedPayload)` equals stored `permitHash`
3. ✅ Verify Ed25519 signature:
   ```typescript
   const valid = verify(
     null,
     Buffer.from(signedPayload, "utf8"),
     createPublicKey(signerPublicKey),
     Buffer.from(signature, "base64url")
   );
   ```
4. ✅ Check expiry: `Date.parse(permit.expiresAt) > Date.now()`
5. ✅ Verify `policyVersion` matches current policy
6. ✅ Validate all transfer details match exactly
7. ✅ Check `permit.status === "issued"` (not consumed/revoked/expired)
8. ✅ Verify agent status is "active"
9. ✅ Verify policy is active and not expired
10. ✅ Atomically consume permit (set status to "consumed")

### Limitations (v1.0)

The v1.0 format has the following limitations preventing Solana integration:

1. **Address Conflation:**
   - `agentPublicKey` used as `sender`
   - No distinction between wallet address and token account
   - No transfer authority field

2. **Amount Format:**
   - Decimal string without mint decimals information
   - Cannot convert to base units without external mint lookup
   - Comparison assumes 18 decimals (incorrect for most Solana tokens)

3. **Expiry Mechanism:**
   - ISO-8601 timestamp (wall-clock time)
   - Cannot be validated deterministically on-chain
   - Solana uses slot numbers, not timestamps

4. **Nonce Format:**
   - UUID string (36 characters)
   - Inefficient for on-chain storage
   - Better to use fixed 32-byte format

---

## Version 2.0 - Solana Token-2022 Integration

### Purpose

Version 2.0 enables **on-chain enforcement** via Solana Token-2022 Transfer Hook. Key improvements:

1. **Distinguishes account types:** Wallet vs. token account vs. mint
2. **Base unit amounts:** Integer amounts with explicit mint decimals
3. **Slot-based expiry:** Deterministic on-chain validation
4. **Fixed-width nonce:** Efficient on-chain storage and PDA derivation
5. **Transfer Hook compatible:** All fields validate against actual SPL transfer

### Field Definitions (v2.0)

| Field | Type | Description | On-Chain Type | Validation |
|-------|------|-------------|---------------|------------|
| `domain` | string | Protocol identifier | `String` | Must be `"lilia.authorization.v2"` |
| `version` | number | Permit format version | `u8` | Must be `2` |
| `agentRegistryPda` | string | On-chain agent registry PDA | `Pubkey` | Base58, 32-44 chars |
| `agentPublicKey` | string | Agent identity key | `Pubkey` | Base58, 32-44 chars |
| `policyPda` | string | On-chain policy PDA | `Pubkey` | Base58, 32-44 chars |
| `policyVersion` | number | Policy version | `u32` | Positive integer ≥ 1 |
| `transferAuthority` | string | Wallet with transfer authority | `Pubkey` | Base58, 32-44 chars |
| `sourceTokenAccount` | string | Source SPL token account | `Pubkey` | Base58, 32-44 chars |
| `destinationTokenAccount` | string | Destination SPL token account | `Pubkey` | Base58, 32-44 chars |
| `mint` | string | Token mint address | `Pubkey` | Base58, 32-44 chars |
| `mintDecimals` | number | Token decimal places | `u8` | 0-18 |
| `amount` | string | Amount in base units | `u64` | Decimal string of u64 |
| `expiresAtSlot` | string | Expiry slot number | `u64` | Decimal string of u64 |
| `nonce` | string | Replay prevention (32-byte hex) | `[u8; 32]` | Hex string, 64 chars |

### Critical Distinctions (v2.0)

**Agent Identity vs. Transfer Authority:**
- `agentPublicKey`: Backend identity, links to policy
- `transferAuthority`: Wallet that signs the transfer transaction
- These MAY be different (delegate authority pattern)

**Token Account vs. Wallet:**
- `sourceTokenAccount`: SPL token account (PDA derived from mint + owner)
- `destinationTokenAccount`: SPL token account (PDA derived from mint + owner)
- `transferAuthority`: Wallet address (NOT a token account)
- `mint`: Token mint address

**Example relationships:**
```
transferAuthority = DelegateWallet123...
sourceTokenAccount = DeriveTokenAccount(mint, AgentWallet456...)
destinationTokenAccount = DeriveTokenAccount(mint, RecipientWallet789...)
mint = EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v (USDC)
```

### Amount Conversion (v2.0)

**Conversion from decimal to base units:**

```typescript
function toBaseUnits(decimal: string, mintDecimals: number): string {
  // Validate input
  if (!/^(0|[1-9]\d*)(\.\d+)?$/.test(decimal)) {
    throw new Error("Invalid decimal format");
  }
  
  if (mintDecimals < 0 || mintDecimals > 18) {
    throw new Error("Mint decimals must be 0-18");
  }
  
  const [whole, fraction = ""] = decimal.split(".");
  
  // CRITICAL: Reject fractional precision exceeding mint decimals
  if (fraction.length > mintDecimals) {
    throw new Error(
      `Amount has ${fraction.length} decimal places, ` +
      `but mint only supports ${mintDecimals}`
    );
  }
  
  // Pad fraction to mint decimals
  const paddedFraction = fraction.padEnd(mintDecimals, "0");
  
  // Calculate base units
  const baseUnits = BigInt(whole) * (10n ** BigInt(mintDecimals)) + BigInt(paddedFraction);
  
  // CRITICAL: Reject overflow beyond u64::MAX
  const MAX_U64 = 18446744073709551615n;
  if (baseUnits > MAX_U64) {
    throw new Error("Amount exceeds u64::MAX");
  }
  
  // CRITICAL: Reject zero if transfer requires positive amount
  if (baseUnits === 0n) {
    throw new Error("Transfer amount must be positive");
  }
  
  return baseUnits.toString();
}
```

**Examples:**

```typescript
// USDC (6 decimals): "500.123456" → "500123456"
toBaseUnits("500.123456", 6);  // "500123456"

// SOL (9 decimals): "1.5" → "1500000000"
toBaseUnits("1.5", 9);  // "1500000000"

// Custom token (0 decimals): "100" → "100"
toBaseUnits("100", 0);  // "100"

// ERROR: Too much precision
toBaseUnits("0.1234567", 6);  // Throws: 7 decimals > 6

// ERROR: Overflow
toBaseUnits("999999999999999999999", 6);  // Throws: exceeds u64::MAX
```

**Obtaining mint decimals:**

```typescript
import { getMint, getAccount } from '@solana/spl-token';
import { Connection, PublicKey } from '@solana/web3.js';

async function getMintDecimals(
  connection: Connection,
  mintAddress: string
): Promise<number> {
  const mint = new PublicKey(mintAddress);
  const mintInfo = await getMint(connection, mint);
  return mintInfo.decimals;
}
```

**CRITICAL:** Always obtain mint decimals from the actual on-chain mint account. Never accept mint decimals from untrusted client input without verification.

### Expiry Conversion (v2.0)

**Conversion from TTL seconds to expiry slot:**

```typescript
import { Connection } from '@solana/web3.js';

async function calculateExpirySlot(
  connection: Connection,
  ttlSeconds: number
): Promise<string> {
  // Get current slot
  const currentSlot = await connection.getSlot('confirmed');
  
  // Solana average: ~400ms per slot
  // WARNING: This is an ESTIMATE and may vary
  const AVERAGE_SLOT_TIME_MS = 400;
  
  const slotsToAdd = Math.floor((ttlSeconds * 1000) / AVERAGE_SLOT_TIME_MS);
  const expirySlot = currentSlot + slotsToAdd;
  
  return expirySlot.toString();
}
```

**Example:**

```typescript
// 5 minutes = 300 seconds
// 300,000 ms / 400 ms per slot = 750 slots
const ttl = 300;  // 5 minutes
const expirySlot = await calculateExpirySlot(connection, ttl);
// If current slot is 250000000, expiry is 250000750
```

**On-chain validation:**

```rust
let clock = Clock::get()?;
require!(
    clock.slot <= permit.expires_at_slot,
    ErrorCode::PermitExpired
);
```

**CRITICAL:** Do NOT attempt to calculate an exact wall-clock expiry time from slots. Slot timing varies with network conditions, epoch boundaries, and validator performance.

### Nonce Format (v2.0)

**Generate 32-byte nonce:**

```typescript
import { randomBytes } from 'node:crypto';

function generateNonce(): string {
  const bytes = randomBytes(32);
  return bytes.toString('hex');  // 64 hex characters
}

// Example: "a3f5e9c2d8b1f4a7e6c3d9b2f1a8e5c4d7b3f6a9e2c8d1b5f4a7e3c9d6b2f8a5c1"
```

**Convert UUID to 32-byte hex (migration):**

```typescript
function uuidToNonce(uuid: string): string {
  // Remove hyphens from UUID
  const hex = uuid.replace(/-/g, '');  // 32 hex chars
  
  // Pad to 64 hex chars (32 bytes)
  return hex.padEnd(64, '0');
}

// Example:
// UUID: "aaa6960f-9b47-4e22-a105-39b46b687051"
// Nonce: "aaa6960f9b474e22a10539b46b687051000000000000000000000000000000"
```

**On-chain PDA derivation:**

```rust
// Convert hex string to byte array
let nonce_bytes = hex::decode(permit.nonce)
    .map_err(|_| ErrorCode::InvalidNonce)?;

// Derive authorization PDA
let (authorization_pda, bump) = Pubkey::find_program_address(
    &[b"authorization", &nonce_bytes],
    program_id
);
```

### Canonical Serialization (v2.0)

**IMPORTANT:** Version 2.0 uses **binary serialization** for on-chain verification, NOT JSON.

See `docs/PERMIT_V2_BINARY_FORMAT.md` for complete binary format specification including:
- Exact byte layout
- Field offsets
- Encoding rules (little-endian u64, 32-byte pubkeys, etc.)
- Domain separator
- Test vectors

**TypeScript signing (will use binary format):**

```typescript
// Placeholder - actual implementation in PERMIT_V2_BINARY_FORMAT.md
function canonicalPermitV2(payload: PermitPayloadV2): Buffer {
  // Binary serialization to be defined in binary format spec
  throw new Error("See PERMIT_V2_BINARY_FORMAT.md for implementation");
}
```

**Backend issuance (updated):**

```typescript
async function issuePermitV2(
  connection: Connection,
  input: {
    agentId: string;
    agentPublicKey: string;
    policyId: string;
    policyVersion: number;
    transferAuthority: string;
    sourceTokenAccount: string;
    destinationTokenAccount: string;
    mint: string;
    amountDecimal: string;
    ttlSeconds: number;
  }
): Promise<PermitV2> {
  // 1. Lookup mint decimals from chain
  const mintDecimals = await getMintDecimals(connection, input.mint);
  
  // 2. Convert amount to base units
  const amountBaseUnits = toBaseUnits(input.amountDecimal, mintDecimals);
  
  // 3. Calculate expiry slot
  const expiresAtSlot = await calculateExpirySlot(connection, input.ttlSeconds);
  
  // 4. Generate nonce
  const nonce = generateNonce();
  
  // 5. Derive PDAs
  const agentRegistryPda = deriveAgentPda(input.agentId);
  const policyPda = derivePolicyPda(input.policyId);
  
  // 6. Construct payload
  const payload: PermitPayloadV2 = {
    domain: "lilia.authorization.v2",
    version: 2,
    agentRegistryPda,
    agentPublicKey: input.agentPublicKey,
    policyPda,
    policyVersion: input.policyVersion,
    transferAuthority: input.transferAuthority,
    sourceTokenAccount: input.sourceTokenAccount,
    destinationTokenAccount: input.destinationTokenAccount,
    mint: input.mint,
    mintDecimals,
    amount: amountBaseUnits,
    expiresAtSlot,
    nonce,
  };
  
  // 7. Binary serialization (see PERMIT_V2_BINARY_FORMAT.md)
  const canonicalBytes = canonicalPermitV2(payload);
  
  // 8. Sign
  const signature = signBinary(canonicalBytes, privateKey);
  
  return { payload, signature };
}
```

### On-Chain Verification Architecture (v2.0)

**CRITICAL:** The Transfer Hook does **NOT** directly verify Ed25519 signatures. Instead, it uses **instruction introspection** to validate a pre-computed Ed25519 verification.

**Correct Flow:**

1. **Client** constructs Ed25519 verification instruction using Solana's Ed25519 precompile program
2. **Client** includes this instruction in the transaction **before** the transfer instruction
3. **Token-2022** invokes the Transfer Hook during the transfer
4. **Transfer Hook** inspects the Instructions Sysvar
5. **Transfer Hook** validates the Ed25519 verification instruction

**Ed25519 Precompile Instruction Construction:**

```typescript
import { 
  Ed25519Program, 
  Transaction, 
  TransactionInstruction 
} from '@solana/web3.js';

function createEd25519VerifyInstruction(
  publicKey: Buffer,  // 32 bytes
  message: Buffer,    // Canonical permit bytes
  signature: Buffer   // 64 bytes
): TransactionInstruction {
  return Ed25519Program.createInstructionWithPublicKey({
    publicKey,
    message,
    signature,
  });
}
```

**Transaction Instruction Ordering:**

```typescript
const transaction = new Transaction();

// Instruction 0: Ed25519 verification (precompute)
transaction.add(createEd25519VerifyInstruction(
  sentinelPublicKey,
  permitCanonicalBytes,
  permitSignature
));

// Instruction 1: Token-2022 transfer with hook
transaction.add(createTransferCheckedWithTransferHookInstruction(
  sourceTokenAccount,
  mint,
  destinationTokenAccount,
  authority,
  amount,
  decimals,
  // Extra accounts for Transfer Hook...
));
```

**Transfer Hook Validation (Anchor pseudo-code):**

```rust
use solana_program::sysvar::instructions::{
    load_instruction_at_checked,
    ID as INSTRUCTIONS_SYSVAR_ID,
};

pub fn execute(ctx: Context<TransferHookExecute>, amount: u64) -> Result<()> {
    // 1. Load the Ed25519 verification instruction (previous instruction)
    let ed25519_ix = load_instruction_at_checked(
        0,  // Instruction index (relative to transfer instruction)
        &ctx.accounts.instructions_sysvar.to_account_info(),
    )?;
    
    // 2. Verify it's the Ed25519 precompile program
    require_keys_eq!(
        ed25519_ix.program_id,
        ED25519_PROGRAM_ID,
        ErrorCode::InvalidVerificationProgram
    );
    
    // 3. Parse Ed25519 instruction data
    let ed25519_data = parse_ed25519_instruction_data(&ed25519_ix.data)?;
    
    // 4. Verify Sentinel public key
    require!(
        ed25519_data.public_key == ctx.accounts.sentinel_authority.key().to_bytes(),
        ErrorCode::InvalidSentinelKey
    );
    
    // 5. Parse permit from message
    let permit = PermitData::deserialize_from_bytes(&ed25519_data.message)?;
    
    // 6. Validate permit domain and version
    require!(
        permit.domain == "lilia.authorization.v2",
        ErrorCode::InvalidPermitDomain
    );
    require_eq!(permit.version, 2, ErrorCode::InvalidPermitVersion);
    
    // 7. Check expiry
    let clock = Clock::get()?;
    require!(
        clock.slot <= permit.expires_at_slot,
        ErrorCode::PermitExpired
    );
    
    // 8. Validate transfer fields against permit
    require_keys_eq!(
        ctx.accounts.source_token_account.key(),
        Pubkey::from(permit.source_token_account),
        ErrorCode::SourceAccountMismatch
    );
    require_keys_eq!(
        ctx.accounts.destination_token_account.key(),
        Pubkey::from(permit.destination_token_account),
        ErrorCode::DestinationAccountMismatch
    );
    require_keys_eq!(
        ctx.accounts.mint.key(),
        Pubkey::from(permit.mint),
        ErrorCode::MintMismatch
    );
    require_eq!(
        permit.amount,
        amount,
        ErrorCode::AmountMismatch
    );
    require_eq!(
        permit.mint_decimals,
        ctx.accounts.mint.decimals,
        ErrorCode::DecimalsMismatch
    );
    
    // 9. Validate on-chain policy (if present)
    let policy = &ctx.accounts.policy;
    require_eq!(
        policy.policy_version,
        permit.policy_version,
        ErrorCode::PolicyVersionMismatch
    );
    require!(policy.is_active, ErrorCode::PolicyInactive);
    
    // 10. Check and consume nonce
    let authorization_pda = &ctx.accounts.authorization;
    require!(
        authorization_pda.nonce == permit.nonce,
        ErrorCode::NonceMismatch
    );
    // PDA existence check prevents replay
    
    // 11. Emit event
    emit!(TransferAuthorized {
        nonce: permit.nonce,
        agent: permit.agent_public_key,
        amount: permit.amount,
        slot: clock.slot,
    });
    
    Ok(())
}
```

**CRITICAL:** The Ed25519 precompile has **already verified** the signature by the time the Transfer Hook executes. The hook only needs to:
1. Verify the Ed25519 instruction exists and has the correct program ID
2. Verify the Sentinel public key is correct
3. Parse the permit message
4. Validate permit fields against the actual transfer

### Replay Prevention (v2.0)

**Strategy:** Use deterministic PDA-based authorization records.

**PDA Derivation:**

```rust
let nonce_bytes = hex::decode(&permit.nonce)?;

let (authorization_pda, bump) = Pubkey::find_program_address(
    &[b"authorization", &nonce_bytes],
    &program_id
);
```

**Authorization Record Account:**

```rust
#[account]
pub struct AuthorizationRecord {
    pub nonce: [u8; 32],
    pub agent: Pubkey,
    pub consumed_at_slot: u64,
    pub bump: u8,
}

impl AuthorizationRecord {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 1;  // discriminator + fields
}
```

**Creation (during transfer hook execution):**

```rust
#[derive(Accounts)]
pub struct TransferHookExecute<'info> {
    // ... other accounts ...
    
    #[account(
        init,
        payer = authority,
        space = AuthorizationRecord::LEN,
        seeds = [b"authorization", permit.nonce.as_ref()],
        bump
    )]
    pub authorization: Account<'info, AuthorizationRecord>,
}

// In execute function:
authorization.set_inner(AuthorizationRecord {
    nonce: permit.nonce,
    agent: permit.agent_public_key,
    consumed_at_slot: clock.slot,
    bump,
});
```

**Replay Prevention Logic:**

1. **First use:** PDA does not exist → `init` succeeds → transfer allowed
2. **Replay attempt:** PDA exists → `init` fails → transfer rejected
3. **Cleanup:** Authorization PDAs can be closed after expiry to reclaim rent

**Cleanup Instruction:**

```rust
pub fn close_authorization(ctx: Context<CloseAuthorization>) -> Result<()> {
    let clock = Clock::get()?;
    let auth = &ctx.accounts.authorization;
    
    // Only allow cleanup after reasonable time (e.g., 1 hour = ~9000 slots)
    require!(
        clock.slot > auth.consumed_at_slot + 9000,
        ErrorCode::AuthorizationTooRecent
    );
    
    // Close account and reclaim rent
    Ok(())
}
```

---

## Migration Strategy

### Parallel Support (Recommended)

Support both v1.0 (backend-only) and v2.0 (on-chain) permits during transition period.

**Backend Implementation:**

```typescript
async function issuePermit(
  connection: Connection | null,
  input: PermitIssuanceInput
): Promise<Permit> {
  // Check version preference
  if (input.version === 2 || input.enableOnChain) {
    // V2: Requires Solana RPC connection
    if (!connection) {
      throw new Error("Solana connection required for v2 permits");
    }
    return issuePermitV2(connection, input);
  } else {
    // V1: Backend-only authorization
    return issuePermitV1(input);
  }
}
```

**Verification Routing:**

```typescript
async function verifyPermit(permit: Permit): Promise<void> {
  const payload = JSON.parse(permit.signedPayload);
  
  switch (payload.version) {
    case 1:
      return verifyPermitV1(permit);
    case 2:
      return verifyPermitV2(permit);
    default:
      throw new Error(`Unsupported permit version: ${payload.version}`);
  }
}
```

**Migration Timeline:**

1. **Phase 1 (Current):** v1.0 only (backend authorization)
2. **Phase 2:** Add v2.0 support, v1.0 remains default
3. **Phase 3:** Deploy Anchor program, test v2.0 on Devnet
4. **Phase 4:** v2.0 becomes default, v1.0 maintained for compatibility
5. **Phase 5:** v1.0 deprecated, remove after migration period

### Breaking Changes (v1 → v2)

**Schema Changes:**

| v1.0 Field | v2.0 Equivalent | Change |
|------------|-----------------|--------|
| `domain` | `domain` | Changed to `"lilia.authorization.v2"` |
| `version` | `version` | Changed from `1` to `2` |
| `agentId` | `agentRegistryPda` | Backend UUID → On-chain PDA |
| `agentPublicKey` | `agentPublicKey` | Same field, clarified meaning |
| `policyId` | `policyPda` | Backend UUID → On-chain PDA |
| `policyVersion` | `policyVersion` | Same |
| `sender` | `sourceTokenAccount` + `transferAuthority` | Split into two fields |
| `recipient` | `destinationTokenAccount` | Renamed, same concept |
| `mint` | `mint` | Same |
| `amount` | `amount` + `mintDecimals` | Decimal → Base units |
| `expiresAt` | `expiresAtSlot` | Timestamp → Slot number |
| `nonce` | `nonce` | UUID string → 32-byte hex |

**Serialization Changes:**
- v1.0: JSON with specific field order
- v2.0: Binary with fixed byte layout (see PERMIT_V2_BINARY_FORMAT.md)

**Signature Changes:**
- v1.0: Ed25519 over UTF-8 JSON string
- v2.0: Ed25519 over binary message

**Verification Changes:**
- v1.0: Backend verifies directly with Node.js crypto
- v2.0: Ed25519 precompile verifies, Transfer Hook validates fields

---

## Security Considerations

### Cryptographic Security

✅ **Ed25519 Provides 128-bit Security**
- Collision resistance: 2^128 operations
- Signature forgery: 2^128 operations
- Public key recovery: Not possible

✅ **Deterministic Serialization Prevents Malleability**
- Exact field order enforced
- No whitespace or formatting variations
- Binary format (v2) eliminates JSON parsing ambiguities

✅ **Private Key Protection**
- Never stored in database
- Never transmitted over network
- Never logged or exposed in errors
- Validated against public key at startup

### Replay Prevention

✅ **Nonce Uniqueness**
- v1.0: UUID v4 (122 bits of randomness)
- v2.0: 32-byte random (256 bits)
- Cryptographically unique with negligible collision probability

✅ **Database Unique Constraint (v1.0)**
- `permit_hash` column has UNIQUE constraint
- Prevents duplicate permits at backend level

✅ **PDA-based Consumption (v2.0)**
- Authorization PDA derived from nonce
- PDA existence = nonce consumed
- Atomic initialization prevents race conditions
- Cannot replay after PDA creation

### Time-Based Security

⚠️ **v1.0 Timestamp Expiry**
- Relies on backend system clock
- Clock skew could affect expiry accuracy
- Not deterministic across systems
- Sufficient for backend-only authorization

✅ **v2.0 Slot-Based Expiry**
- Deterministic on-chain validation
- No clock synchronization required
- Slot number monotonically increases
- Better security model for blockchain

### Amount Precision

⚠️ **v1.0 Decimal Representation**
- String format prevents floating-point errors
- Backend comparison uses integer arithmetic
- Assumes 18 decimals (incorrect for most tokens)
- Sufficient for backend policy checks

✅ **v2.0 Base Unit Representation**
- Integer amounts (u64) eliminate precision issues
- Explicit mint decimals field
- Validated against actual mint configuration
- Exact on-chain comparison

### Policy Enforcement

✅ **Policy Version Binding**
- Policy version embedded in signed permit
- Backend verifies current policy version matches
- On-chain validates policy version (v2.0)
- Policy updates invalidate old permits

✅ **Atomic Policy Changes**
- Policy updates increment version atomically
- All issued permits for old version revoked
- New permits reflect updated policy
- No race conditions between update and issuance

### Transfer Hook Security

⚠️ **v2.0 Instruction Introspection Risks**
- Must validate Ed25519 instruction program ID
- Must validate Sentinel public key
- Must validate instruction index (correct order)
- Incorrect validation allows forgery

⚠️ **v2.0 Account Validation Risks**
- Must validate all PDAs match permit
- Must validate token accounts match transfer
- Must validate mint and decimals match
- Missing checks allow unauthorized transfers

✅ **v2.0 Mitigation Strategies**
- Comprehensive validation in Transfer Hook
- Test against malicious instruction ordering
- Test against account substitution attacks
- Audit Anchor program before deployment

---

## References

### Specifications

- **Ed25519:** [RFC 8032 - Edwards-Curve Digital Signature Algorithm](https://www.rfc-editor.org/rfc/rfc8032)
- **Solana Ed25519 Program:** [Ed25519 Precompile Documentation](https://docs.solana.com/developing/runtime-facilities/programs#ed25519-program)
- **SPL Token-2022:** [Token-2022 Program](https://spl.solana.com/token-2022)
- **Transfer Hook Extension:** [Transfer Hook Interface](https://spl.solana.com/token-2022/extensions#transfer-hook)

### Implementation Resources

- **Anchor Framework:** [Anchor Book](https://www.anchor-lang.com/)
- **Instructions Sysvar:** [Solana Program Documentation](https://docs.rs/solana-program/latest/solana_program/sysvar/instructions/)
- **SPL Token Rust:** [@solana/spl-token](https://docs.rs/spl-token/latest/spl_token/)
- **Web3.js:** [@solana/web3.js Documentation](https://solana-labs.github.io/solana-web3.js/)

### Related Documentation

- **Binary Format:** [PERMIT_V2_BINARY_FORMAT.md](./docs/PERMIT_V2_BINARY_FORMAT.md)
- **Integration Spec:** [BLOCKCHAIN_INTEGRATION_SPEC.md](./docs/BLOCKCHAIN_INTEGRATION_SPEC.md)
- **Account Spec:** [ONCHAIN_ACCOUNT_SPEC.md](./docs/ONCHAIN_ACCOUNT_SPEC.md)
- **Security Model:** [TRANSFER_HOOK_SECURITY_MODEL.md](./docs/TRANSFER_HOOK_SECURITY_MODEL.md)

---

**Document Version:** 2.0  
**Last Updated:** November 7, 2026  
**Status:** Specification complete, awaiting implementation  
**Next Steps:** Implement binary serialization format (PERMIT_V2_BINARY_FORMAT.md)
