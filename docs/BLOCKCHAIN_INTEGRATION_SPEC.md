# Lilia Blockchain Integration Specification

**Version:** 2.0  
**Last Updated:** November 7, 2026  
**Status:** Specification Complete

---

## Table of Contents

1. [Overview](#overview)
2. [System Architecture](#system-architecture)
3. [Component Responsibilities](#component-responsibilities)
4. [Complete Transaction Lifecycle](#complete-transaction-lifecycle)
5. [Transaction Instruction Ordering](#transaction-instruction-ordering)
6. [Ed25519 Precompile Integration](#ed25519-precompile-integration)
7. [Extra Account Resolution](#extra-account-resolution)
8. [Error Handling and Retry Logic](#error-handling-and-retry-logic)
9. [Confirmation and Finality](#confirmation-and-finality)
10. [Security Considerations](#security-considerations)

---

## Overview

This document specifies the complete integration between the Lilia backend, client applications, and Solana blockchain for enforcing authorization permits via Token-2022 Transfer Hooks.

**Key Integration Points:**

1. **Backend → Client:** Issues signed permits via REST API
2. **Client → Solana:** Constructs and submits transactions with Ed25519 precompile
3. **Solana → Transfer Hook:** Token-2022 invokes Lilia's Transfer Hook during transfer
4. **Transfer Hook → Backend:** Event logs enable backend to track on-chain confirmations

**Design Principles:**

- **Separation of Concerns:** Backend signs, client builds transactions, Anchor program validates
- **Minimal Trust:** Backend cannot directly execute transfers (requires client + on-chain validation)
- **Deterministic Validation:** All policy checks performed both backend and on-chain
- **Atomic Authorization:** Nonce consumption prevents replay attacks

---

## System Architecture

### Component Diagram

```
┌────────────────────────────────────────────────────────────────────┐
│                         Lilia Ecosystem                            │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌─────────────┐         ┌──────────────┐        ┌─────────────┐ │
│  │   Client    │         │   Sentinel   │        │   Solana    │ │
│  │ Application │◄────────┤   Backend    │        │  Blockchain │ │
│  │             │  Permit │              │        │             │ │
│  │  (Web/CLI)  │         │  (REST API)  │        │ (Validator) │ │
│  └──────┬──────┘         └──────────────┘        └──────┬──────┘ │
│         │                                                │         │
│         │  HTTP                                Transaction         │
│         │  Request                              Submission         │
│         │                                                │         │
│         ▼                                                ▼         │
│  ┌──────────────────────────────────────────────────────────────┐ │
│  │              Solana Transaction Pipeline                      │ │
│  ├──────────────────────────────────────────────────────────────┤ │
│  │                                                               │ │
│  │  1. Ed25519 Verify Instruction (Precompile)                  │ │
│  │     └─ Validates Sentinel signature                          │ │
│  │                                                               │ │
│  │  2. Transfer Instruction (Token-2022)                        │ │
│  │     └─ Invokes Transfer Hook                                 │ │
│  │                                                               │ │
│  │  3. Transfer Hook Execution (Lilia Anchor Program)           │ │
│  │     ├─ Introspects Ed25519 instruction                       │ │
│  │     ├─ Validates permit fields                               │ │
│  │     ├─ Checks on-chain policy                                │ │
│  │     ├─ Consumes sequence counter                            │ │
│  │     └─ Allows or rejects transfer                            │ │
│  │                                                               │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
1. Agent requests evaluation
   └─> Backend: POST /api/sentinel/evaluate
       └─> Response: { decision: "approved", assessmentId: "..." }

2. Agent requests authorization
   └─> Backend: POST /api/sentinel/authorize
       └─> Response: { permitId, signature, signedPayload, ... }

3. Client constructs transaction
   ├─> Build Ed25519 verify instruction
   ├─> Build Token-2022 transfer instruction
   └─> Resolve extra accounts for Transfer Hook

4. Client submits transaction
   └─> Solana RPC: sendTransaction()
       └─> Returns transaction signature

5. Token-2022 processes transfer
   └─> Invokes Lilia Transfer Hook
       ├─> Hook validates permit
       ├─> Hook checks + increments the sequence counter
       └─> Transfer succeeds or fails

6. Client confirms transaction
   └─> Solana RPC: getTransaction()
       └─> Returns confirmed transaction

7. Backend records confirmation
   └─> Update transaction status to 'confirmed'
   └─> Record on-chain signature
```

---

## Component Responsibilities

### 1. Sentinel Backend

**Responsibilities:**

- ✅ Agent and policy management
- ✅ Risk assessment and policy evaluation
- ✅ Permit signing with Ed25519
- ✅ Transaction intent recording
- ✅ Security event logging
- ❌ **NOT RESPONSIBLE:** Building Solana transactions
- ❌ **NOT RESPONSIBLE:** Submitting transactions to RPC
- ❌ **NOT RESPONSIBLE:** Querying blockchain state

**API Endpoints:**

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/sentinel/evaluate` | POST | Evaluate proposed transfer |
| `/api/sentinel/authorize` | POST | Issue signed permit |
| `/api/transactions/prepare` | POST | Validate permit (v1.0 only) |
| `/api/transactions` | GET | List transaction intents |
| `/api/transactions/:signature` | GET | Get transaction by signature |

**Required Environment Variables:**

```env
LILIA_SIGNING_PRIVATE_KEY=<Ed25519 private key PEM>
LILIA_SIGNING_PUBLIC_KEY=<Ed25519 public key PEM>
SOLANA_RPC_URL=<optional, for mint decimal lookup>
```

**Optional Enhancements:**

- Mint decimal caching (reduces RPC calls)
- Slot monitoring for expiry calculation
- Transaction confirmation polling
- Event indexing from blockchain logs

### 2. Client Application

**Responsibilities:**

- ✅ Request permits from backend
- ✅ Construct Ed25519 verification instruction
- ✅ Construct Token-2022 transfer instruction
- ✅ Resolve extra accounts for Transfer Hook
- ✅ Submit transaction to Solana RPC
- ✅ Poll for confirmation
- ✅ Handle errors and retries
- ❌ **NOT RESPONSIBLE:** Signing permits (only backend can sign)
- ❌ **NOT RESPONSIBLE:** Policy evaluation (backend responsibility)

**Required Libraries:**

```json
{
  "@solana/web3.js": "^1.95.0",
  "@solana/spl-token": "^0.4.0"
}
```

**Configuration:**

```typescript
interface ClientConfig {
  backendUrl: string;           // Sentinel API base URL
  backendApiKey: string;         // Bearer token
  rpcUrl: string;                // Solana RPC endpoint
  programId: string;             // Lilia Anchor program ID
  commitment?: Commitment;       // Default: 'confirmed'
}
```

### 3. Lilia Anchor Program (Transfer Hook)

**Responsibilities:**

- ✅ Validate Ed25519 verification instruction
- ✅ Parse and validate permit from message
- ✅ Check permit expiry (slot-based)
- ✅ Validate transfer fields against permit
- ✅ Validate on-chain policy
- ✅ Enforce and increment the per-agent sequence counter (replay guard)
- ✅ Emit transfer authorized event
- ❌ **NOT RESPONSIBLE:** Issuing permits (backend responsibility)
- ❌ **NOT RESPONSIBLE:** Executing transfers (Token-2022 responsibility)

**Program Accounts:**

| Account | Type | Purpose |
|---------|------|---------|
| `SentinelAuthority` | PDA | Stores Sentinel public key configuration |
| `AgentRegistry` | PDA | Agent identity, liveness, and `next_authorization_sequence` |
| `Policy` | PDA | On-chain policy data |
| `ExtraAccountMetaList` | PDA | Transfer Hook extra account metadata |

There is no `AuthorizationRecord` PDA; the sequence counter inside
`AgentRegistry` is the replay guard.

**Entry Points:**

| Instruction | Purpose |
|-------------|---------|
| `initialize_sentinel_authority` | Initialize Sentinel authority |
| `update_sentinel_authority` | Rotate the Sentinel key |
| `register_agent` | Create `AgentRegistry` (sequence starts at 0) |
| `set_agent_status` | Enable/disable an agent |
| `create_policy` / `update_policy` | Publish a policy revision |
| `initialize_extra_account_meta_list` | Install the mint's extra accounts |
| `execute` | Transfer Hook execution (called by Token-2022) |

---

## Complete Transaction Lifecycle

### Phase 1: Policy Evaluation

**Actor:** Client Application  
**Endpoint:** `POST /api/sentinel/evaluate`

```typescript
const evaluation = await fetch(`${backendUrl}/api/sentinel/evaluate`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    agentId: "uuid",
    recipient: "DestinationTokenAccount...",
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    amount: "500.123456",  // Decimal format
    context: { purpose: "Payment for services" }
  })
});

const { decision, assessmentId } = await evaluation.json();

if (decision !== "approved") {
  throw new Error("Transfer rejected by policy");
}
```

**Backend Processing:**

1. Validates agent ownership and active status
2. Loads applicable policy
3. Evaluates transfer against policy rules
4. Records assessment in database
5. Returns decision (approved/rejected)

### Phase 2: Authorization (Permit Issuance)

**Actor:** Client Application  
**Endpoint:** `POST /api/sentinel/authorize`

```typescript
const authorization = await fetch(`${backendUrl}/api/sentinel/authorize`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    assessmentId: assessmentId
  })
});

const permit = await authorization.json();
// {
//   id: "permit-uuid",
//   signedPayload: "binary canonical permit",
//   signature: "base64url Ed25519 signature",
//   signerPublicKey: "Sentinel public key",
//   permitHash: "sha256 hash",
//   expiresAt: "ISO-8601 timestamp",
//   status: "issued"
// }
```

**Backend Processing:**

1. Reloads assessment and verifies it's approved
2. Verifies agent and policy are still active
3. Verifies policy version matches assessment
4. Fetches mint decimals from RPC (v2.0)
5. Converts amount to base units (v2.0)
6. Calculates expiry slot (v2.0)
7. Serializes permit to binary format
8. Signs with Ed25519 private key
9. Stores permit and transaction intent atomically
10. Returns permit with signature

### Phase 3: Transaction Construction

**Actor:** Client Application  
**Libraries:** `@solana/web3.js`, `@solana/spl-token`

```typescript
import {
  Connection,
  Transaction,
  PublicKey,
  Ed25519Program,
} from '@solana/web3.js';
import {
  createTransferCheckedWithTransferHookInstruction,
  getExtraAccountMetaAddress,
  resolveExtraAccountMeta,
} from '@solana/spl-token';

async function buildTransaction(
  connection: Connection,
  permit: Permit,
  transferAuthority: PublicKey,
  sourceTokenAccount: PublicKey,
  destinationTokenAccount: PublicKey,
  mint: PublicKey,
  amount: bigint,
  decimals: number
): Promise<Transaction> {
  const transaction = new Transaction();
  
  // Step 1: Deserialize permit payload
  const permitPayload = deserializePermitV2(permit.signedPayload);
  
  // Step 2: Create Ed25519 verification instruction
  const sentinelPublicKey = new PublicKey(permit.signerPublicKey);
  const permitBytes = Buffer.from(permit.signedPayload, 'base64');
  const signatureBytes = Buffer.from(permit.signature, 'base64url');
  
  const ed25519Instruction = Ed25519Program.createInstructionWithPublicKey({
    publicKey: sentinelPublicKey.toBytes(),
    message: permitBytes,
    signature: signatureBytes,
  });
  
  transaction.add(ed25519Instruction);
  
  // Step 3: Resolve extra accounts for Transfer Hook
  const extraAccountMetaListPda = getExtraAccountMetaAddress(
    mint,
    programId
  );
  
  const extraAccountMetas = await resolveExtraAccountMeta(
    connection,
    extraAccountMetaListPda,
    [sourceTokenAccount, mint, destinationTokenAccount, transferAuthority]
  );
  
  // Step 4: Create transfer instruction
  const transferInstruction = createTransferCheckedWithTransferHookInstruction(
    sourceTokenAccount,
    mint,
    destinationTokenAccount,
    transferAuthority,
    amount,
    decimals,
    [], // No additional signers
    'confirmed',
    programId  // Transfer Hook program ID
  );
  
  transaction.add(transferInstruction);
  
  return transaction;
}
```

**Critical Details:**

1. **Ed25519 instruction MUST be first** in the transaction
2. **Transfer instruction MUST be second**
3. Extra accounts MUST be resolved from on-chain ExtraAccountMetaList
4. Amount MUST be in base units (not decimal)
5. Decimals MUST match mint configuration

### Phase 4: Transaction Submission

**Actor:** Client Application

```typescript
import { sendAndConfirmTransaction } from '@solana/web3.js';

async function submitTransaction(
  connection: Connection,
  transaction: Transaction,
  payer: Keypair,
  transferAuthority: Keypair
): Promise<string> {
  // Sign transaction
  transaction.feePayer = payer.publicKey;
  transaction.recentBlockhash = (
    await connection.getLatestBlockhash('finalized')
  ).blockhash;
  
  transaction.sign(payer, transferAuthority);
  
  // Submit and wait for confirmation
  const signature = await sendAndConfirmTransaction(
    connection,
    transaction,
    [payer, transferAuthority],
    {
      commitment: 'confirmed',
      preflightCommitment: 'processed',
    }
  );
  
  return signature;
}
```

**Error Handling:**

```typescript
try {
  const signature = await submitTransaction(/*...*/);
  console.log(`Transaction confirmed: ${signature}`);
} catch (error) {
  if (error instanceof SendTransactionError) {
    // Parse transaction error
    const logs = error.logs || [];
    
    if (logs.some(log => log.includes('PermitExpired'))) {
      console.error('Permit expired, request new permit');
    } else if (logs.some(log => log.includes('InvalidSequence'))) {
      console.error('Permit already consumed (replay attempt)');
    } else if (logs.some(log => log.includes('AmountMismatch'))) {
      console.error('Transfer amount does not match permit');
    } else {
      console.error('Transaction failed:', logs.join('\n'));
    }
  }
  throw error;
}
```

### Phase 5: On-Chain Validation (Transfer Hook)

**Actor:** Lilia Anchor Program (invoked by Token-2022)

**Execution Flow:**

```rust
pub fn execute(ctx: Context<TransferHookExecute>, amount: u64) -> Result<()> {
    // 1. Load Ed25519 instruction from Instructions Sysvar
    let ed25519_ix = load_instruction_at_checked(
        0,  // Previous instruction
        &ctx.accounts.instructions_sysvar.to_account_info(),
    )?;
    
    // 2. Validate Ed25519 program ID
    require_keys_eq!(
        ed25519_ix.program_id,
        ED25519_PROGRAM_ID,
        ErrorCode::InvalidVerificationProgram
    );
    
    // 3. Parse Ed25519 instruction data
    let ed25519_data = parse_ed25519_ix_data(&ed25519_ix.data)?;
    
    // 4. Validate Sentinel public key
    require!(
        ed25519_data.public_key == ctx.accounts.sentinel_authority.public_key.to_bytes(),
        ErrorCode::UnauthorizedSigner
    );
    
    // 5. Deserialize permit from message
    let permit = PermitDataV2::deserialize_from_bytes(&ed25519_data.message)?;
    
    // 6. Validate permit fields
    require_eq!(permit.domain, DOMAIN_V2, ErrorCode::InvalidDomain);
    require_eq!(permit.version, 2, ErrorCode::InvalidVersion);
    
    // 7. Check expiry
    let clock = Clock::get()?;
    require!(
        clock.slot <= permit.expires_at_slot,
        ErrorCode::PermitExpired
    );
    
    // 8. Validate transfer matches permit
    require_keys_eq!(
        permit.source_token_account,
        ctx.accounts.source.key(),
        ErrorCode::SourceMismatch
    );
    require_keys_eq!(
        permit.destination_token_account,
        ctx.accounts.destination.key(),
        ErrorCode::DestinationMismatch
    );
    require_keys_eq!(
        permit.mint,
        ctx.accounts.mint.key(),
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
    
    // 9. Validate on-chain policy
    let policy = &ctx.accounts.policy;
    require!(policy.is_active, ErrorCode::PolicyInactive);
    require_eq!(
        policy.policy_version,
        permit.policy_version,
        ErrorCode::PolicyVersionMismatch
    );
    require!(
        amount <= policy.max_transfer_amount,
        ErrorCode::AmountExceedsPolicy
    );
    require!(
        policy.allowed_mint == Pubkey::default() || policy.allowed_mint == permit.mint,
        ErrorCode::MintNotAllowed
    );

    // 10. Consume the sequence (replay guard)
    let registry = &mut ctx.accounts.agent_registry;
    require!(
        permit.sequence() == registry.next_authorization_sequence,
        ErrorCode::InvalidSequence
    );
    registry.next_authorization_sequence = registry
        .next_authorization_sequence
        .checked_add(1)
        .ok_or(ErrorCode::SequenceOverflow)?;
    
    // 11. Emit event
    emit!(TransferAuthorized {
        nonce: permit.nonce,
        agent: permit.agent_public_key,
        source: permit.source_token_account,
        destination: permit.destination_token_account,
        mint: permit.mint,
        amount: permit.amount,
        slot: clock.slot,
    });
    
    Ok(())
}
```

**Transfer Hook Accounts Context:**

```rust
#[derive(Accounts)]
pub struct Execute<'info> {
    #[account(token::mint = mint, token::token_program = TOKEN_2022_PROGRAM_ID)]
    pub source_account: Box<InterfaceAccount<'info, TokenAccount>>,

    #[account(mint::token_program = TOKEN_2022_PROGRAM_ID)]
    pub mint: Box<InterfaceAccount<'info, Mint>>,

    #[account(token::mint = mint, token::token_program = TOKEN_2022_PROGRAM_ID)]
    pub destination_account: Box<InterfaceAccount<'info, TokenAccount>>,

    /// CHECK: Token-2022 already verified this account authorized the transfer.
    pub owner_delegate: UncheckedAccount<'info>,

    /// CHECK: TLV buffer validated by `ExtraAccountMetaList::check_account_infos`.
    #[account(seeds = [EXTRA_ACCOUNT_METAS_SEED, mint.key().as_ref()], bump)]
    pub extra_metas_account: UncheckedAccount<'info>,

    #[account(seeds = [SENTINEL_SEED], bump = sentinel_authority.bump)]
    pub sentinel_authority: Account<'info, SentinelAuthority>,

    #[account(
        mut,
        seeds = [AGENT_SEED, owner_delegate.key().as_ref()],
        bump = agent_registry.bump
    )]
    pub agent_registry: Account<'info, AgentRegistry>,

    #[account(
        seeds = [POLICY_SEED, owner_delegate.key().as_ref()],
        bump = policy.bump
    )]
    pub policy: Account<'info, Policy>,

    /// CHECK: Instructions sysvar for Ed25519 introspection.
    #[account(address = solana_sdk_ids::sysvar::instructions::ID)]
    pub instructions_sysvar: UncheckedAccount<'info>,
}
```

### Phase 6: Confirmation and Recording

**Actor:** Client Application + Backend

**Client Confirmation:**

```typescript
async function waitForConfirmation(
  connection: Connection,
  signature: string,
  commitment: Commitment = 'confirmed'
): Promise<void> {
  const latestBlockhash = await connection.getLatestBlockhash();
  
  await connection.confirmTransaction({
    signature,
    ...latestBlockhash,
  }, commitment);
}
```

**Backend Recording (Optional Enhancement):**

```typescript
// Client notifies backend of confirmation
await fetch(`${backendUrl}/api/transactions/${signature}/confirm`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    signature: signature,
    slot: confirmedSlot,
  })
});

// Backend updates transaction status
// UPDATE transactions 
// SET status = 'confirmed', 
//     transaction_signature = ?,
//     updated_at = ?
// WHERE permit_id = ?
```

---

## Transaction Instruction Ordering

### Correct Ordering (REQUIRED)

```
Transaction {
  instructions: [
    0: Ed25519Program.createInstructionWithPublicKey(...),
    1: createTransferCheckedWithTransferHookInstruction(...),
  ]
}
```

**Critical Rules:**

1. **Ed25519 MUST be instruction 0** (first)
2. **Transfer MUST be instruction 1** (second)
3. **No other instructions** should be between them
4. Transfer Hook introspects instruction at index `current - 1` = 0

### Incorrect Orderings (WILL FAIL)

❌ **Wrong Order:**
```
instructions: [
  0: createTransferCheckedWithTransferHookInstruction(...),
  1: Ed25519Program.createInstructionWithPublicKey(...),  // TOO LATE
]
```

❌ **Extra Instructions Between:**
```
instructions: [
  0: Ed25519Program.createInstructionWithPublicKey(...),
  1: someOtherInstruction(...),  // BREAKS INTROSPECTION
  2: createTransferCheckedWithTransferHookInstruction(...),
]
```

❌ **Missing Ed25519:**
```
instructions: [
  0: createTransferCheckedWithTransferHookInstruction(...),
  // No Ed25519 verification!
]
```

### Instruction Index Calculation

**Transfer Hook perspective:**

```rust
// Token-2022 invokes Transfer Hook during instruction 1
// Hook looks back 1 instruction to find Ed25519 verify

let current_instruction_index = 1;  // Transfer instruction
let ed25519_instruction_index = current_instruction_index - 1;  // = 0

let ed25519_ix = load_instruction_at_checked(
    ed25519_instruction_index,
    &instructions_sysvar
)?;
```

---

## Ed25519 Precompile Integration

### Ed25519 Program ID

```typescript
import { Ed25519Program } from '@solana/web3.js';

console.log(Ed25519Program.programId.toBase58());
// "Ed25519SigVerify111111111111111111111111111"
```

```rust
use solana_program::ed25519_program;

pub const ED25519_PROGRAM_ID: Pubkey = ed25519_program::ID;
// Ed25519SigVerify111111111111111111111111111
```

### Instruction Data Format

**Ed25519 instruction data layout:**

```
Offset 0-1:   u16 (num_signatures) = 1 (little-endian)
Offset 2-3:   u16 (padding) = 0
Offset 4-5:   u16 (signature_offset) = 112 (little-endian)
Offset 6-7:   u16 (signature_instruction_index) = 65535 (0xFFFF, not used)
Offset 8-9:   u16 (public_key_offset) = 16 (little-endian)
Offset 10-11: u16 (public_key_instruction_index) = 65535 (0xFFFF, not used)
Offset 12-13: u16 (message_data_offset) = 48 (little-endian)
Offset 14-15: u16 (message_data_size) = varies (little-endian)
Offset 16-47: [u8; 32] public_key
Offset 48-...: message_data (variable length)
Offset ...-...: [u8; 64] signature (at signature_offset)
```

### Parsing Ed25519 Instruction (Rust)

```rust
pub fn parse_ed25519_ix_data(data: &[u8]) -> Result<Ed25519InstructionData> {
    require!(data.len() >= 112, ErrorCode::InvalidEd25519Instruction);
    
    let num_signatures = u16::from_le_bytes([data[0], data[1]]);
    require_eq!(num_signatures, 1, ErrorCode::InvalidSignatureCount);
    
    let signature_offset = u16::from_le_bytes([data[4], data[5]]) as usize;
    let public_key_offset = u16::from_le_bytes([data[8], data[9]]) as usize;
    let message_offset = u16::from_le_bytes([data[12], data[13]]) as usize;
    let message_size = u16::from_le_bytes([data[14], data[15]]) as usize;
    
    let public_key: [u8; 32] = data[public_key_offset..public_key_offset + 32]
        .try_into()
        .unwrap();
    
    let message = &data[message_offset..message_offset + message_size];
    
    let signature: [u8; 64] = data[signature_offset..signature_offset + 64]
        .try_into()
        .unwrap();
    
    Ok(Ed25519InstructionData {
        public_key,
        message: message.to_vec(),
        signature,
    })
}
```

---

## Extra Account Resolution

### ExtraAccountMetaList PDA

The Transfer Hook requires extra accounts beyond the standard transfer accounts. These are stored in an ExtraAccountMetaList PDA.

**PDA Derivation:**

```typescript
import { PublicKey } from '@solana/web3.js';

function getExtraAccountMetaAddress(
  mint: PublicKey,
  programId: PublicKey
): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("extra-account-metas"),
      mint.toBuffer(),
    ],
    programId
  );
  return pda;
}
```

```rust
pub fn get_extra_account_meta_address(
    mint: &Pubkey,
    program_id: &Pubkey
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[b"extra-account-metas", mint.as_ref()],
        program_id
    )
}
```

### Initializing ExtraAccountMetaList

**One-time setup per mint:**

The program builds the canonical list itself and ignores caller-supplied metas,
so a mint authority cannot redirect the hook.

```rust
use spl_tlv_account_resolution::{account::ExtraAccountMeta, seeds::Seed};

pub fn canonical_extra_account_metas() -> Result<Vec<ExtraAccountMeta>> {
    Ok(vec![
        // SentinelAuthority PDA, read-only
        ExtraAccountMeta::new_with_seeds(
            &[Seed::Literal { bytes: SENTINEL_SEED.to_vec() }],
            false,
            false,
        )?,
        // AgentRegistry PDA, writable for the sequence increment
        ExtraAccountMeta::new_with_seeds(
            &[
                Seed::Literal { bytes: AGENT_SEED.to_vec() },
                Seed::AccountKey { index: 3 }, // transfer authority
            ],
            false,
            true,
        )?,
        // Policy PDA, read-only
        ExtraAccountMeta::new_with_seeds(
            &[
                Seed::Literal { bytes: POLICY_SEED.to_vec() },
                Seed::AccountKey { index: 3 },
            ],
            false,
            false,
        )?,
        // Instructions sysvar
        ExtraAccountMeta::new_with_pubkey(
            &solana_sdk_ids::sysvar::instructions::ID,
            false,
            false,
        )?,
    ])
}
```

The list is written with
`ExtraAccountMetaList::size_of(4)` and `ExtraAccountMetaList::init::<ExecuteInstruction>`.
Account index `3` in the hook instruction is the source owner/delegate (the
transfer authority), which is why both dynamic PDAs use `Seed::AccountKey`.

### Client Resolution

```typescript
import { resolveExtraAccountMeta } from '@solana/spl-token';

const extraAccounts = await resolveExtraAccountMeta(
  connection,
  extraAccountMetaListPda,
  [sourceTokenAccount, mint, destinationTokenAccount, transferAuthority],
  programId
);

// Returns resolved account addresses including dynamically derived PDAs
```

---

## Error Handling and Retry Logic

### Common Errors

| Error | Cause | Resolution |
|-------|-------|------------|
| `PermitExpired` | Current slot > expires_at_slot | Request new permit |
| `InvalidSequence` | Permit sequence is not the current on-chain sequence | Request a new permit |
| `AmountMismatch` | Transfer amount ≠ permit amount | Check amount conversion |
| `SourceMismatch` | Wrong source token account | Verify account addresses |
| `InvalidVerificationProgram` | Ed25519 ix program ID wrong | Check instruction construction |
| `UnauthorizedSigner` | Sentinel public key mismatch | Update Sentinel configuration |
| `PolicyInactive` | On-chain policy deactivated | Update policy or request new permit |

### Retry Strategy

```typescript
async function submitWithRetry(
  connection: Connection,
  transaction: Transaction,
  signers: Keypair[],
  maxRetries: number = 3
): Promise<string> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Refresh blockhash on retry
      if (attempt > 1) {
        const { blockhash } = await connection.getLatestBlockhash('finalized');
        transaction.recentBlockhash = blockhash;
        transaction.sign(...signers);
      }
      
      const signature = await sendAndConfirmTransaction(
        connection,
        transaction,
        signers,
        { commitment: 'confirmed' }
      );
      
      return signature;
      
    } catch (error) {
      const isLastAttempt = attempt === maxRetries;
      
      // Don't retry on permit errors (need new permit)
      if (error.logs?.some(log => 
        log.includes('PermitExpired') ||
        log.includes('InvalidSequence') ||
        log.includes('AmountMismatch')
      )) {
        throw error;  // Fatal, don't retry
      }
      
      // Retry on network/RPC errors
      if (!isLastAttempt) {
        await sleep(1000 * attempt);  // Exponential backoff
        continue;
      }
      
      throw error;
    }
  }
}
```

---

## Confirmation and Finality

### Commitment Levels

| Commitment | Meaning | Use Case |
|------------|---------|----------|
| `processed` | Transaction processed by a validator | Quick feedback, not final |
| `confirmed` | Transaction confirmed by supermajority | Recommended for most use cases |
| `finalized` | Transaction finalized (rooted) | Maximum security, slower |

**Recommendation:** Use `confirmed` for production transactions.

### Polling for Confirmation

```typescript
async function pollForConfirmation(
  connection: Connection,
  signature: string,
  maxAttempts: number = 30,
  intervalMs: number = 2000
): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    const status = await connection.getSignatureStatus(signature);
    
    if (status.value?.confirmationStatus === 'confirmed' ||
        status.value?.confirmationStatus === 'finalized') {
      return true;
    }
    
    if (status.value?.err) {
      throw new Error(`Transaction failed: ${JSON.stringify(status.value.err)}`);
    }
    
    await sleep(intervalMs);
  }
  
  throw new Error('Transaction confirmation timeout');
}
```

---

## Security Considerations

### 1. Signature Replay Prevention

✅ **Mitigation: Per-agent sequence counter**

- Each permit carries the sequence it was issued for
- The hook requires an exact match with `AgentRegistry.next_authorization_sequence`
- The counter is incremented in the same transaction as the transfer
- A replay or pre-minted permit fails with `InvalidSequence`
- No per-transfer PDA is created, so there is no rent or cleanup

### 2. Instruction Injection Attacks

⚠️ **Risk: Malicious instructions between Ed25519 and transfer**

✅ **Mitigation:**
- Transfer Hook validates instruction index
- Ed25519 instruction MUST be at index 0
- Transfer instruction MUST be at index 1
- Any deviation causes validation failure

### 3. Account Substitution

⚠️ **Risk: Different accounts than permitted**

✅ **Mitigation:**
- Transfer Hook validates ALL account addresses
- Source, destination, mint, authority must match permit
- Token-2022 validates token account ownership
- Mismatched accounts cause transaction failure

### 4. Amount Manipulation

⚠️ **Risk: Transfer different amount than permitted**

✅ **Mitigation:**
- Permit specifies exact base unit amount
- Transfer Hook validates amount equals permit.amount
- Mint decimals validated against on-chain mint
- Any amount mismatch causes transaction failure

### 5. Expiry Bypass

⚠️ **Risk: Use expired permit**

✅ **Mitigation:**
- Slot-based expiry (deterministic)
- Transfer Hook checks Clock.slot <= permit.expires_at_slot
- Expired permits rejected on-chain
- No clock skew issues (uses blockchain clock)

### 6. Policy Version Mismatch

⚠️ **Risk: Use permit from old policy version**

✅ **Mitigation:**
- Policy version embedded in permit
- Backend revokes old permits on policy update
- Transfer Hook validates policy_version matches on-chain policy (if present)
- Outdated permits rejected

---

**Document Version:** 2.0  
**Last Updated:** November 7, 2026  
**Status:** Specification Complete  
**Next Steps:** Implement client transaction builder and Anchor Transfer Hook program
