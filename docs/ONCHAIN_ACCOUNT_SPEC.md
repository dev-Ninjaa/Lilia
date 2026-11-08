# Lilia On-Chain Account Specification

**Version:** 2.0  
**Last Updated:** November 7, 2026  
**Status:** Specification Complete

---

## Table of Contents

1. [Overview](#overview)
2. [PDA Derivation Strategy](#pda-derivation-strategy)
3. [Account Catalog](#account-catalog)
4. [SentinelAuthority Account](#sentinelauthority-account)
5. [AgentRegistry Account](#agentregistry-account)
6. [Policy Account](#policy-account)
7. [Replay Protection: Sequence Counter](#replay-protection-sequence-counter)
8. [ExtraAccountMetaList Account](#extraaccountmetalist-account)
9. [Account Initialization](#account-initialization)
10. [Account Closure and Rent Reclamation](#account-closure-and-rent-reclamation)
11. [Storage Cost Analysis](#storage-cost-analysis)

---

## Overview

This document specifies all on-chain account structures for the Lilia Transfer Hook program. Each account type is defined with:
- Exact PDA seed derivation
- Complete field layout with types and sizes
- Initialization requirements
- Authority and access control
- Closure and cleanup procedures

**Design Principles:**

1. **Deterministic PDAs:** All accounts use deterministic seed-based derivation
2. **Minimal Storage:** Store only data required for on-chain validation
3. **Explicit Sizes:** All account sizes calculated upfront (no dynamic allocation)
4. **Rent Optimization:** Accounts sized precisely to minimize rent costs
5. **No Per-Transfer Accounts:** Replay protection is a counter, so nothing is created per transfer

---

## PDA Derivation Strategy

### Seed Components

Lilia uses the following seed types:

1. **Static Literals:** Fixed byte strings (e.g., `b"sentinel"`)
2. **Backend UUIDs:** UTF-8 encoded UUID strings from backend database
3. **Solana Pubkeys:** 32-byte public key addresses
4. **Nonces:** 32-byte random values from permits

### Standard PDA Pattern

```rust
let (pda, bump) = Pubkey::find_program_address(
    &[seed1, seed2, ...],
    program_id
);
```

**TypeScript:**
```typescript
import { PublicKey } from '@solana/web3.js';

const [pda, bump] = PublicKey.findProgramAddressSync(
  [seed1, seed2, ...],
  programId
);
```

### Canonical Seed Encoding

| Seed Type | Encoding | Example |
|-----------|----------|---------|
| Static string | UTF-8 bytes | `Buffer.from("sentinel")` |
| UUID | UTF-8 bytes | `Buffer.from("14414925-4284-4be6-82ab-911ba754976d")` |
| Pubkey | Raw 32 bytes | `pubkey.toBuffer()` |
| Nonce | Hex decoded | `Buffer.from(nonceHex, 'hex')` (32 bytes) |

---

## Account Catalog

### Summary Table

| Account | PDA Seeds | Size (bytes) | Rent (SOL)* | Closeable | Purpose |
|---------|-----------|--------------|-------------|-----------|---------|
| `SentinelAuthority` | `[b"sentinel"]` | 73 | 0.00063 | No | Sentinel public key configuration |
| `AgentRegistry` | `[b"agent", transfer_authority]` | 138 | 0.00112 | Yes | Agent identity, liveness, and sequence counter |
| `Policy` | `[b"policy", transfer_authority]` | 142 | 0.00115 | Yes | On-chain policy data |
| `ExtraAccountMetaList` | `[b"extra-account-metas", mint]` | Variable | Variable | No | Transfer Hook extra accounts |

*Rent estimates based on 0.00000348 SOL per byte (subject to change)

There is **no `AuthorizationRecord` account**. Replay prevention uses the
`next_authorization_sequence` counter inside `AgentRegistry`, so no per-transfer
account is created and no rent is consumed.

### MVP vs. Full Implementation

**MVP (Minimum Viable Product):**
- ✅ Required: `SentinelAuthority`, `AgentRegistry`, `Policy`, `ExtraAccountMetaList`
- ✅ `AgentRegistry` is also the replay guard

**Full Implementation:**
- ✅ All accounts
- ✅ On-chain policy validation
- ✅ On-chain agent registry

**Recommendation:** The implemented program ships the full set; there is no
account-less intermediate mode because the sequence counter lives in
`AgentRegistry`.

---

## SentinelAuthority Account

### Purpose

Stores the Sentinel backend's Ed25519 public key. The Transfer Hook validates that permits are signed by this authority.

### PDA Derivation

**Seeds:** `[b"sentinel"]`

**Rust:**
```rust
pub fn get_sentinel_authority_address(program_id: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[b"sentinel"], program_id)
}
```

**TypeScript:**
```typescript
function getSentinelAuthorityAddress(programId: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("sentinel")],
    programId
  );
}
```

### Account Layout

```rust
#[account]
pub struct SentinelAuthority {
    /// Sentinel backend's Ed25519 public key (32 bytes)
    pub public_key: Pubkey,
    
    /// Protocol upgrade authority (32 bytes)
    pub upgrade_authority: Pubkey,
    
    /// Bump seed for PDA derivation (1 byte)
    pub bump: u8,
}

impl SentinelAuthority {
    pub const LEN: usize = 8 + 32 + 32 + 1;  // 73 bytes
    // 8 bytes: Anchor discriminator
    // 32 bytes: public_key
    // 32 bytes: upgrade_authority
    // 1 byte: bump
}
```

**Memory Layout:**

| Offset | Size | Field | Type | Description |
|--------|------|-------|------|-------------|
| 0-7 | 8 | discriminator | `[u8; 8]` | Anchor account discriminator |
| 8-39 | 32 | public_key | `Pubkey` | Sentinel Ed25519 public key |
| 40-71 | 32 | upgrade_authority | `Pubkey` | Authority to update configuration |
| 72 | 1 | bump | `u8` | PDA bump seed |
| **73** | **—** | **Total** | **—** | **Fixed size** |

### Initialization

**Instruction:** `initialize_sentinel_authority`

```rust
pub fn initialize_sentinel_authority(
    ctx: Context<InitializeSentinelAuthority>,
    public_key: Pubkey,
) -> Result<()> {
    let authority = &mut ctx.accounts.sentinel_authority;
    authority.public_key = public_key;
    authority.upgrade_authority = ctx.accounts.upgrade_authority.key();
    authority.bump = ctx.bumps.sentinel_authority;
    
    Ok(())
}

#[derive(Accounts)]
pub struct InitializeSentinelAuthority<'info> {
    #[account(
        init,
        payer = payer,
        space = SentinelAuthority::LEN,
        seeds = [b"sentinel"],
        bump
    )]
    pub sentinel_authority: Account<'info, SentinelAuthority>,
    
    /// Upgrade authority (typically program deploy authority)
    pub upgrade_authority: Signer<'info>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}
```

**Client Invocation:**

```typescript
const initIx = await program.methods
  .initializeSentinelAuthority(sentinelPublicKey)
  .accounts({
    sentinelAuthority: sentinelAuthorityPda,
    upgradeAuthority: upgradeAuthority.publicKey,
    payer: payer.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .instruction();
```

### Updates

**Instruction:** `update_sentinel_public_key`

```rust
pub fn update_sentinel_public_key(
    ctx: Context<UpdateSentinelAuthority>,
    new_public_key: Pubkey,
) -> Result<()> {
    let authority = &mut ctx.accounts.sentinel_authority;
    authority.public_key = new_public_key;
    
    emit!(SentinelKeyUpdated {
        old_key: authority.public_key,
        new_key: new_public_key,
        slot: Clock::get()?.slot,
    });
    
    Ok(())
}

#[derive(Accounts)]
pub struct UpdateSentinelAuthority<'info> {
    #[account(
        mut,
        seeds = [b"sentinel"],
        bump = sentinel_authority.bump,
        has_one = upgrade_authority
    )]
    pub sentinel_authority: Account<'info, SentinelAuthority>,
    
    pub upgrade_authority: Signer<'info>,
}
```

### Access Control

- **Initialization:** One-time, requires payer + upgrade authority signature
- **Updates:** Requires upgrade authority signature
- **Reads:** Anyone (no restrictions)

---

## AgentRegistry Account

### Purpose

Stores per-agent on-chain state: identity, the wallet allowed to sign transfers,
liveness, and the replay-guard sequence counter. There is exactly one registry
per transfer authority.

### PDA Derivation

**Seeds:** `[b"agent", transfer_authority]`

**Example:**
```
transfer_authority = 7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU
seeds = [b"agent", transfer_authority.to_bytes()]
```

**Rust:**
```rust
Pubkey::find_program_address(
    &[AGENT_SEED, transfer_authority.as_ref()],
    program_id
)
```

**TypeScript:**
```typescript
PublicKey.findProgramAddressSync(
  [Buffer.from("agent"), transferAuthority.toBuffer()],
  programId
);
```

### Account Layout

```rust
#[account]
pub struct AgentRegistry {
    /// 16-byte backend identifier (first 16 bytes of the agent UUID)
    pub agent_id: [u8; 16],
    /// Backend agent identity key bound into the permit
    pub agent_identity_key: Pubkey,
    /// Wallet allowed to sign transfers for this agent
    pub transfer_authority: Pubkey,
    /// Backend owner that registered the agent
    pub owner: Pubkey,
    /// Whether the agent may currently transfer
    pub is_active: bool,
    /// Next sequence value a permit must carry
    pub next_authorization_sequence: u64,
    /// Slot at which the agent was registered
    pub registered_slot: u64,
    /// PDA bump
    pub bump: u8,
}

impl AgentRegistry {
    pub const LEN: usize = 8 + 16 + 32 + 32 + 32 + 1 + 8 + 8 + 1; // 138
}
```

**Memory Layout:**

| Offset | Size | Field | Type |
|--------|------|-------|------|
| 0-7 | 8 | discriminator | `[u8; 8]` |
| 8-23 | 16 | agent_id | `[u8; 16]` |
| 24-55 | 32 | agent_identity_key | `Pubkey` |
| 56-87 | 32 | transfer_authority | `Pubkey` |
| 88-119 | 32 | owner | `Pubkey` |
| 120 | 1 | is_active | `bool` |
| 121-128 | 8 | next_authorization_sequence | `u64` |
| 129-136 | 8 | registered_slot | `u64` |
| 137 | 1 | bump | `u8` |
| **138** | **—** | **Total** | **—** |

### Initialization

Only the Sentinel's `upgrade_authority` may register an agent. The counter
starts at `0`.

```rust
pub fn handler(
    ctx: Context<RegisterAgent>,
    agent_id: [u8; 16],
    agent_identity_key: Pubkey,
) -> Result<()> {
    let registry = &mut ctx.accounts.agent_registry;
    registry.agent_id = agent_id;
    registry.agent_identity_key = agent_identity_key;
    registry.transfer_authority = ctx.accounts.transfer_authority.key();
    registry.owner = ctx.accounts.upgrade_authority.key();
    registry.is_active = true;
    registry.next_authorization_sequence = 0;
    registry.registered_slot = Clock::get()?.slot;
    registry.bump = ctx.bumps.agent_registry;
    Ok(())
}

#[derive(Accounts)]
pub struct RegisterAgent<'info> {
    #[account(
        init,
        payer = upgrade_authority,
        space = AgentRegistry::LEN,
        seeds = [AGENT_SEED, transfer_authority.key().as_ref()],
        bump
    )]
    pub agent_registry: Account<'info, AgentRegistry>,

    /// CHECK: used as a seed and stored in the registry
    pub transfer_authority: UncheckedAccount<'info>,

    #[account(
        seeds = [SENTINEL_SEED],
        bump = sentinel_authority.bump,
        has_one = upgrade_authority
    )]
    pub sentinel_authority: Account<'info, SentinelAuthority>,

    #[account(mut)]
    pub upgrade_authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}
```

### Status Updates

```rust
pub fn set_agent_status(ctx: Context<SetAgentStatus>, is_active: bool) -> Result<()> {
    ctx.accounts.agent_registry.is_active = is_active;
    Ok(())
}
```

A disabled agent fails the hook with `AgentDisabled`.

---

## Policy Account

### Purpose

Holds the active on-chain policy for one transfer authority: the cap, allowed
mint, expiry, liveness, and the monotonic version bound into permits. There is
exactly one policy per transfer authority, replaced in place with an incremented
version.

### PDA Derivation

**Seeds:** `[b"policy", transfer_authority]`

**TypeScript:**
```typescript
PublicKey.findProgramAddressSync(
  [Buffer.from("policy"), transferAuthority.toBuffer()],
  programId
);
```

### Account Layout

```rust
#[account]
pub struct Policy {
    pub policy_id: [u8; 16],
    pub agent_registry: Pubkey,
    pub owner: Pubkey,
    pub max_transfer_amount: u64,
    pub allowed_mint: Pubkey,      // Pubkey::default() = any mint
    pub is_active: bool,
    pub policy_version: u32,
    pub expires_at_slot: u64,      // 0 = no expiry
    pub bump: u8,
}

impl Policy {
    pub const LEN: usize = 8 + 16 + 32 + 32 + 8 + 32 + 1 + 4 + 8 + 1; // 142
}
```

**Memory Layout:**

| Offset | Size | Field | Type |
|--------|------|-------|------|
| 0-7 | 8 | discriminator | `[u8; 8]` |
| 8-23 | 16 | policy_id | `[u8; 16]` |
| 24-55 | 32 | agent_registry | `Pubkey` |
| 56-87 | 32 | owner | `Pubkey` |
| 88-95 | 8 | max_transfer_amount | `u64` |
| 96-127 | 32 | allowed_mint | `Pubkey` |
| 128 | 1 | is_active | `bool` |
| 129-132 | 4 | policy_version | `u32` |
| 133-140 | 8 | expires_at_slot | `u64` |
| 141 | 1 | bump | `u8` |
| **142** | **—** | **Total** | **—** |

### Initialization

```rust
pub fn handler(
    ctx: Context<CreatePolicy>,
    policy_id: [u8; 16],
    max_transfer_amount: u64,
    allowed_mint: Pubkey,
    expires_at_slot: u64,
) -> Result<()> {
    let policy = &mut ctx.accounts.policy;
    policy.policy_id = policy_id;
    policy.agent_registry = ctx.accounts.agent_registry.key();
    policy.owner = ctx.accounts.upgrade_authority.key();
    policy.max_transfer_amount = max_transfer_amount;
    policy.allowed_mint = allowed_mint;
    policy.is_active = true;
    policy.policy_version = 1;
    policy.expires_at_slot = expires_at_slot;
    policy.bump = ctx.bumps.policy;
    Ok(())
}
```

### Updates

`update_policy` requires the new version to be exactly the stored version plus
one, so a permit can never be replayed against an older policy.

```rust
require_eq!(
    new_version,
    policy.policy_version.checked_add(1).ok_or(LiliaError::PolicyVersionMismatch)?,
    LiliaError::PolicyVersionMismatch
);
```

---

## Replay Protection: Sequence Counter

### Purpose

Permit replay is prevented by a monotonic counter stored in `AgentRegistry`
(`next_authorization_sequence`). There is **no per-transfer account**, so the
guard consumes no extra rent and leaves nothing to clean up.

### Binding

The permit nonce is `sequence (u64 little-endian) || entropy (24 bytes)`.
`PermitDataV2::sequence()` reads the first 8 bytes; the backend takes the value
from the on-chain counter, never from local state.

### Enforcement

```rust
let registry = &mut ctx.accounts.agent_registry;

require!(
    permit.sequence() == registry.next_authorization_sequence,
    LiliaError::InvalidSequence
);

registry.next_authorization_sequence = registry
    .next_authorization_sequence
    .checked_add(1)
    .ok_or(LiliaError::SequenceOverflow)?;
```

### Guarantees

1. **First use:** sequence equals the counter -> accepted, counter incremented.
2. **Replay:** sequence is now below the counter -> `InvalidSequence`.
3. **Pre-minted permit:** sequence above the counter -> `InvalidSequence`.
4. **Atomicity:** the increment is part of the transfer transaction; a failed
   transfer reverts it, so a failed attempt does not consume the sequence.
5. **Concurrency:** the second of two transactions carrying the same sequence
   observes the incremented counter and fails.

`AgentRegistry` is supplied as a **writable** extra account by
`ExtraAccountMetaList`, which is what lets the hook persist the increment.

### Resetting the Counter

Re-registering an agent (closing and recreating its `AgentRegistry`) resets the
counter to `0`. Backend mirrors are advisory only; issuance always reads the
on-chain value.

---

## ExtraAccountMetaList Account

### Purpose

Stores metadata for extra accounts required by the Transfer Hook. Token-2022 uses this to resolve PDAs and additional accounts during transfer execution.

### PDA Derivation

**Seeds:** `[b"extra-account-metas", mint.as_ref()]`

**Rust:**
```rust
pub fn get_extra_account_meta_list_address(
    mint: &Pubkey,
    program_id: &Pubkey
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[b"extra-account-metas", mint.as_ref()],
        program_id
    )
}
```

### Account Layout

**Note:** This account uses the SPL Transfer Hook Interface's `ExtraAccountMetaList` structure, not a custom Anchor account.

```rust
use spl_transfer_hook_interface::instruction::ExecuteInstruction;
use spl_tlv_account_resolution::state::ExtraAccountMetaList;

// Variable size based on number of extra accounts
// Size = 4 (prefix) + 4 (count) + (count * 35) bytes
```

**For Lilia (4 extra accounts):**
- Sentinel authority PDA (`["sentinel"]`, read-only)
- AgentRegistry PDA (`["agent", transfer_authority]`, writable)
- Policy PDA (`["policy", transfer_authority]`, read-only)
- Instructions sysvar

**Size calculation:**
```
size = 4 + 4 + (4 * 35) = 148 bytes
```

### Initialization

**One-time setup per mint:**

The program builds the list itself; caller-supplied metas are ignored so a mint
authority cannot redirect the hook to attacker-controlled accounts.

```rust
use spl_tlv_account_resolution::{account::ExtraAccountMeta, seeds::Seed};

pub fn canonical_extra_account_metas() -> Result<Vec<ExtraAccountMeta>> {
    Ok(vec![
        // 5. SentinelAuthority PDA, read-only
        ExtraAccountMeta::new_with_seeds(
            &[Seed::Literal { bytes: SENTINEL_SEED.to_vec() }],
            false,
            false,
        )?,
        // 6. AgentRegistry PDA, writable (sequence increment)
        ExtraAccountMeta::new_with_seeds(
            &[
                Seed::Literal { bytes: AGENT_SEED.to_vec() },
                Seed::AccountKey { index: 3 }, // transfer authority
            ],
            false,
            true,
        )?,
        // 7. Policy PDA, read-only
        ExtraAccountMeta::new_with_seeds(
            &[
                Seed::Literal { bytes: POLICY_SEED.to_vec() },
                Seed::AccountKey { index: 3 },
            ],
            false,
            false,
        )?,
        // 8. Instructions sysvar for Ed25519 introspection
        ExtraAccountMeta::new_with_pubkey(
            &solana_sdk_ids::sysvar::instructions::ID,
            false,
            false,
        )?,
    ])
}
```

Account index `3` of the hook instruction is the source owner/delegate, which is
the transfer authority, so both dynamic PDAs are derived from it. Only the mint
authority may initialize the list, and the account is sized with
`ExtraAccountMetaList::size_of(4)`.

---

## Account Initialization

### Initialization Order

**Program Deployment:**

1. Deploy Anchor program to Solana
2. Initialize `SentinelAuthority` (one-time, global)

**Per-Mint Setup:**

3. Initialize `ExtraAccountMetaList` for each protected mint

**Per-Agent Setup:**

4. Register `AgentRegistry` for each agent (also creates the sequence counter)
5. Create `Policy` for each policy

**Per-Transfer:**

6. No account is created; the hook increments `next_authorization_sequence`

### Initialization Costs

| Account | Size | Rent (SOL)* | One-Time? |
|---------|------|-------------|-----------|
| `SentinelAuthority` | 73 bytes | 0.00063 | Yes (global) |
| `ExtraAccountMetaList` | 148 bytes | 0.00119 | Per mint |
| `AgentRegistry` | 138 bytes | 0.00112 | Per agent |
| `Policy` | 142 bytes | 0.00115 | Per policy |

*Based on 0.00000348 SOL/byte (subject to change)

### Who Pays?

| Account | Payer | Reason |
|---------|-------|--------|
| `SentinelAuthority` | Program deployer | One-time setup |
| `ExtraAccountMetaList` | Mint creator/protocol | Per-mint setup |
| `AgentRegistry` | Agent owner | Agent registration |
| `Policy` | Policy owner | Policy creation |

---

## Account Closure and Rent Reclamation

### Closeable Accounts

The implemented program does **not** expose close instructions. `AgentRegistry`
and `Policy` persist for the life of the agent; disabling an agent or
deactivating a policy does not reclaim rent. Adding a close path would require a
new instruction plus a grace period, and is deliberately out of scope for this
phase.

| Account | Closeable? | Notes |
|---------|------------|-------|
| `SentinelAuthority` | No | Global, one-time |
| `ExtraAccountMetaList` | No | Per mint |
| `AgentRegistry` | No (not implemented) | Persists; holds the sequence counter |
| `Policy` | No (not implemented) | Updated in place with a new version |

### Rent Reclamation Economics

**No per-transfer accounts:** because replay protection is a counter inside
`AgentRegistry`, there is no growth in account count, no rent stream to reclaim,
and no cleanup bot to run.

---

## Storage Cost Analysis

*Rent based on ~0.00000348 SOL/byte.*

### Single Agent

**One-time costs:**
- `SentinelAuthority` (73 B): 0.00063 SOL
- `ExtraAccountMetaList` (~148 B): 0.00119 SOL
- `AgentRegistry` (138 B): 0.00112 SOL
- `Policy` (142 B): 0.00115 SOL
- **Total:** ~0.00409 SOL

**Per transfer:** zero account growth. The only state change is the `u64`
sequence counter inside `AgentRegistry`.

### 100 Agents

**Setup costs:**
- Sentinel authority: 0.00063 SOL
- Extra account meta: 0.00119 SOL
- 100 agent registries: 100 × 0.00112 = 0.112 SOL
- 100 policies: 100 × 0.00115 = 0.115 SOL
- **Total:** ~0.229 SOL

**Per transfer:** zero additional rent.

### Optimization Strategies

1. **Lazy Registration:** Only register agents on-chain when they need to
   transfer.
2. **Shared mint:** One `ExtraAccountMetaList` serves every agent using that
   mint.
3. **No cleanup:** There are no per-transfer accounts to close, so no bot and no
   ongoing rent stream.

---

**Document Version:** 2.1  
**Last Updated:** November 8, 2026  
**Status:** Implemented and verified locally (build + unit tests); not yet deployed  
**Next Steps:** Deploy to Devnet and initialize the mint, extra account metas, agents, and policies
