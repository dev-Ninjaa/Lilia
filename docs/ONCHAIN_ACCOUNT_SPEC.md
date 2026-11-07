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
7. [AuthorizationRecord Account](#authorizationrecord-account)
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
5. **Cleanup Support:** Authorization records closeable after consumption

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
| `AgentRegistry` | `[b"agent", agent_id]` | 114 | 0.00093 | Yes | On-chain agent registry (optional MVP) |
| `Policy` | `[b"policy", policy_id]` | 162 | 0.00130 | Yes | On-chain policy data (optional MVP) |
| `AuthorizationRecord` | `[b"authorization", nonce]` | 81 | 0.00067 | Yes | Nonce consumption tracking |
| `ExtraAccountMetaList` | `[b"extra-account-metas", mint]` | Variable | Variable | No | Transfer Hook extra accounts |

*Rent estimates based on 0.00000348 SOL per byte (subject to change)

### MVP vs. Full Implementation

**MVP (Minimum Viable Product):**
- ✅ Required: `SentinelAuthority`, `AuthorizationRecord`, `ExtraAccountMetaList`
- ⚠️ Optional: `AgentRegistry`, `Policy` (backend signs, on-chain validates signature only)

**Full Implementation:**
- ✅ All accounts
- ✅ On-chain policy validation
- ✅ On-chain agent registry

**Recommendation:** Start with MVP, add on-chain policy validation after proving core functionality.

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

(Optional MVP) Stores on-chain agent registration. Enables on-chain verification of agent identity and status.

### PDA Derivation

**Seeds:** `[b"agent", agent_id.as_bytes()]`

**Example:**
```
agent_id = "14414925-4284-4be6-82ab-911ba754976d"
seeds = [b"agent", b"14414925-4284-4be6-82ab-911ba754976d"]
```

**Rust:**
```rust
pub fn get_agent_registry_address(
    agent_id: &str,
    program_id: &Pubkey
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[b"agent", agent_id.as_bytes()],
        program_id
    )
}
```

**TypeScript:**
```typescript
function getAgentRegistryAddress(
  agentId: string,
  programId: PublicKey
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("agent"), Buffer.from(agentId)],
    programId
  );
}
```

### Account Layout

```rust
#[account]
pub struct AgentRegistry {
    /// Backend agent UUID (36 bytes + 4 length prefix)
    pub agent_id: String,
    
    /// Agent's public key (32 bytes)
    pub public_key: Pubkey,
    
    /// Owner/operator of this agent (32 bytes)
    pub owner: Pubkey,
    
    /// Agent status: 0 = active, 1 = disabled (1 byte)
    pub status: u8,
    
    /// Registration slot (8 bytes)
    pub registered_at_slot: u64,
    
    /// PDA bump seed (1 byte)
    pub bump: u8,
}

impl AgentRegistry {
    pub const LEN: usize = 8 + 40 + 32 + 32 + 1 + 8 + 1;  // 122 bytes
    // 8: discriminator
    // 40: agent_id (4 length + 36 UUID)
    // 32: public_key
    // 32: owner
    // 1: status
    // 8: registered_at_slot
    // 1: bump
    
    pub const STATUS_ACTIVE: u8 = 0;
    pub const STATUS_DISABLED: u8 = 1;
}
```

**Memory Layout:**

| Offset | Size | Field | Type | Description |
|--------|------|-------|------|-------------|
| 0-7 | 8 | discriminator | `[u8; 8]` | Anchor discriminator |
| 8-11 | 4 | agent_id.len | `u32` | String length |
| 12-47 | 36 | agent_id.data | `[u8; 36]` | UUID string bytes |
| 48-79 | 32 | public_key | `Pubkey` | Agent identity key |
| 80-111 | 32 | owner | `Pubkey` | Agent owner |
| 112 | 1 | status | `u8` | 0=active, 1=disabled |
| 113-120 | 8 | registered_at_slot | `u64` | Registration slot |
| 121 | 1 | bump | `u8` | PDA bump |
| **122** | **—** | **Total** | **—** | **Fixed size** |

### Initialization

```rust
pub fn register_agent(
    ctx: Context<RegisterAgent>,
    agent_id: String,
    public_key: Pubkey,
) -> Result<()> {
    require_eq!(agent_id.len(), 36, ErrorCode::InvalidAgentId);
    
    let registry = &mut ctx.accounts.agent_registry;
    registry.agent_id = agent_id;
    registry.public_key = public_key;
    registry.owner = ctx.accounts.owner.key();
    registry.status = AgentRegistry::STATUS_ACTIVE;
    registry.registered_at_slot = Clock::get()?.slot;
    registry.bump = ctx.bumps.agent_registry;
    
    Ok(())
}

#[derive(Accounts)]
#[instruction(agent_id: String)]
pub struct RegisterAgent<'info> {
    #[account(
        init,
        payer = payer,
        space = AgentRegistry::LEN,
        seeds = [b"agent", agent_id.as_bytes()],
        bump
    )]
    pub agent_registry: Account<'info, AgentRegistry>,
    
    pub owner: Signer<'info>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}
```

### Status Updates

```rust
pub fn disable_agent(ctx: Context<UpdateAgentStatus>) -> Result<()> {
    let registry = &mut ctx.accounts.agent_registry;
    registry.status = AgentRegistry::STATUS_DISABLED;
    
    emit!(AgentDisabled {
        agent_id: registry.agent_id.clone(),
        slot: Clock::get()?.slot,
    });
    
    Ok(())
}
```

---

## Policy Account

### Purpose

(Optional MVP) Stores on-chain policy configuration. Enables on-chain policy enforcement without trusting backend signatures alone.

### PDA Derivation

**Seeds:** `[b"policy", policy_id.as_bytes()]`

**Rust:**
```rust
pub fn get_policy_address(
    policy_id: &str,
    program_id: &Pubkey
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[b"policy", policy_id.as_bytes()],
        program_id
    )
}
```

### Account Layout

```rust
#[account]
pub struct Policy {
    /// Backend policy UUID (36 bytes + 4 length)
    pub policy_id: String,
    
    /// Associated agent registry PDA (32 bytes)
    pub agent_registry: Pubkey,
    
    /// Policy owner (32 bytes)
    pub owner: Pubkey,
    
    /// Maximum transfer amount in base units (8 bytes)
    pub max_transfer_amount: u64,
    
    /// Allowed token mint (32 bytes, 0 = any mint)
    pub allowed_mint: Option<Pubkey>,
    
    /// Policy status: 0 = active, 1 = inactive (1 byte)
    pub is_active: bool,
    
    /// Policy version number (4 bytes)
    pub policy_version: u32,
    
    /// Policy expiry slot (8 bytes, 0 = no expiry)
    pub expires_at_slot: u64,
    
    /// PDA bump (1 byte)
    pub bump: u8,
}

impl Policy {
    pub const LEN: usize = 8 + 40 + 32 + 32 + 8 + 33 + 1 + 4 + 8 + 1;  // 167 bytes
    // 8: discriminator
    // 40: policy_id (4 + 36)
    // 32: agent_registry
    // 32: owner
    // 8: max_transfer_amount
    // 33: allowed_mint (1 option tag + 32 pubkey)
    // 1: is_active
    // 4: policy_version
    // 8: expires_at_slot
    // 1: bump
}
```

**Memory Layout:**

| Offset | Size | Field | Type | Description |
|--------|------|-------|------|-------------|
| 0-7 | 8 | discriminator | `[u8; 8]` | Anchor discriminator |
| 8-11 | 4 | policy_id.len | `u32` | String length |
| 12-47 | 36 | policy_id.data | `[u8; 36]` | UUID bytes |
| 48-79 | 32 | agent_registry | `Pubkey` | Associated agent PDA |
| 80-111 | 32 | owner | `Pubkey` | Policy owner |
| 112-119 | 8 | max_transfer_amount | `u64` | Max amount (base units) |
| 120 | 1 | allowed_mint.tag | `u8` | 0=None, 1=Some |
| 121-152 | 32 | allowed_mint.pubkey | `Pubkey` | Mint (if tag=1) |
| 153 | 1 | is_active | `bool` | Active status |
| 154-157 | 4 | policy_version | `u32` | Version number |
| 158-165 | 8 | expires_at_slot | `u64` | Expiry slot (0=never) |
| 166 | 1 | bump | `u8` | PDA bump |
| **167** | **—** | **Total** | **—** | **Fixed size** |

### Initialization

```rust
pub fn create_policy(
    ctx: Context<CreatePolicy>,
    policy_id: String,
    max_transfer_amount: u64,
    allowed_mint: Option<Pubkey>,
    expires_at_slot: u64,
) -> Result<()> {
    require_eq!(policy_id.len(), 36, ErrorCode::InvalidPolicyId);
    require!(max_transfer_amount > 0, ErrorCode::InvalidMaxAmount);
    
    let policy = &mut ctx.accounts.policy;
    policy.policy_id = policy_id;
    policy.agent_registry = ctx.accounts.agent_registry.key();
    policy.owner = ctx.accounts.owner.key();
    policy.max_transfer_amount = max_transfer_amount;
    policy.allowed_mint = allowed_mint;
    policy.is_active = true;
    policy.policy_version = 1;
    policy.expires_at_slot = expires_at_slot;
    policy.bump = ctx.bumps.policy;
    
    Ok(())
}

#[derive(Accounts)]
#[instruction(policy_id: String)]
pub struct CreatePolicy<'info> {
    #[account(
        init,
        payer = payer,
        space = Policy::LEN,
        seeds = [b"policy", policy_id.as_bytes()],
        bump
    )]
    pub policy: Account<'info, Policy>,
    
    /// Associated agent registry
    #[account(
        seeds = [b"agent", agent_registry.agent_id.as_bytes()],
        bump = agent_registry.bump,
        constraint = agent_registry.owner == owner.key() @ ErrorCode::UnauthorizedOwner
    )]
    pub agent_registry: Account<'info, AgentRegistry>,
    
    pub owner: Signer<'info>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}
```

### Updates

```rust
pub fn update_policy(
    ctx: Context<UpdatePolicy>,
    max_transfer_amount: Option<u64>,
    allowed_mint: Option<Option<Pubkey>>,
) -> Result<()> {
    let policy = &mut ctx.accounts.policy;
    
    if let Some(amount) = max_transfer_amount {
        require!(amount > 0, ErrorCode::InvalidMaxAmount);
        policy.max_transfer_amount = amount;
    }
    
    if let Some(mint) = allowed_mint {
        policy.allowed_mint = mint;
    }
    
    policy.policy_version += 1;
    
    Ok(())
}
```

---

## AuthorizationRecord Account

### Purpose

**Critical:** Prevents permit replay attacks by consuming nonces atomically. Once created, the nonce cannot be reused.

### PDA Derivation

**Seeds:** `[b"authorization", nonce_bytes]`

**Example:**
```
nonce = "a3f5e9c2d8b1f4a7e6c3d9b2f1a8e5c4d7b3f6a9e2c8d1b5f4a7e3c9d6b2f8a5c1"
nonce_bytes = hex::decode(nonce) = [0xA3, 0xF5, ..., 0xC1] (32 bytes)
seeds = [b"authorization", nonce_bytes]
```

**Rust:**
```rust
pub fn get_authorization_address(
    nonce: &[u8; 32],
    program_id: &Pubkey
) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[b"authorization", nonce],
        program_id
    )
}
```

**TypeScript:**
```typescript
function getAuthorizationAddress(
  nonceHex: string,
  programId: PublicKey
): [PublicKey, number] {
  const nonceBytes = Buffer.from(nonceHex, 'hex');
  return PublicKey.findProgramAddressSync(
    [Buffer.from("authorization"), nonceBytes],
    programId
  );
}
```

### Account Layout

```rust
#[account]
pub struct AuthorizationRecord {
    /// Nonce value (32 bytes)
    pub nonce: [u8; 32],
    
    /// Agent that consumed this authorization (32 bytes)
    pub agent: Pubkey,
    
    /// Slot when consumed (8 bytes)
    pub consumed_at_slot: u64,
    
    /// PDA bump (1 byte)
    pub bump: u8,
}

impl AuthorizationRecord {
    pub const LEN: usize = 8 + 32 + 32 + 8 + 1;  // 81 bytes
    // 8: discriminator
    // 32: nonce
    // 32: agent
    // 8: consumed_at_slot
    // 1: bump
}
```

**Memory Layout:**

| Offset | Size | Field | Type | Description |
|--------|------|-------|------|-------------|
| 0-7 | 8 | discriminator | `[u8; 8]` | Anchor discriminator |
| 8-39 | 32 | nonce | `[u8; 32]` | Nonce bytes |
| 40-71 | 32 | agent | `Pubkey` | Agent public key |
| 72-79 | 8 | consumed_at_slot | `u64` | Consumption slot |
| 80 | 1 | bump | `u8` | PDA bump |
| **81** | **—** | **Total** | **—** | **Fixed size** |

### Initialization (During Transfer Hook)

**Critical:** The authorization PDA is created **during** the Transfer Hook execution, not beforehand.

```rust
pub fn execute(ctx: Context<TransferHookExecute>, amount: u64) -> Result<()> {
    // ... permit validation ...
    
    // Consume nonce by creating authorization PDA
    let auth = &mut ctx.accounts.authorization;
    auth.nonce = permit.nonce;
    auth.agent = permit.agent_public_key;
    auth.consumed_at_slot = Clock::get()?.slot;
    auth.bump = ctx.bumps.authorization;
    
    Ok(())
}

#[derive(Accounts)]
pub struct TransferHookExecute<'info> {
    // ... other accounts ...
    
    /// Authorization record (nonce consumption)
    /// CRITICAL: init constraint prevents replay
    #[account(
        init,
        payer = authority,
        space = AuthorizationRecord::LEN,
        seeds = [b"authorization", &permit.nonce],
        bump
    )]
    pub authorization: Account<'info, AuthorizationRecord>,
    
    /// CHECK: Token-2022 validates authority
    #[account(mut)]
    pub authority: UncheckedAccount<'info>,
    
    pub system_program: Program<'info, System>,
}
```

**Replay Prevention Logic:**

1. **First use:** PDA does not exist → `init` succeeds → transfer proceeds
2. **Replay attempt:** PDA exists → `init` fails with `AccountAlreadyInitialized` → transfer rejected

### Closure (Rent Reclamation)

After a reasonable time (e.g., 1 hour = ~9,000 slots), authorization records can be closed to reclaim rent.

```rust
pub fn close_authorization(
    ctx: Context<CloseAuthorization>
) -> Result<()> {
    let clock = Clock::get()?;
    let auth = &ctx.accounts.authorization;
    
    // Only allow closure after 9,000 slots (~1 hour)
    require!(
        clock.slot > auth.consumed_at_slot + 9000,
        ErrorCode::AuthorizationTooRecent
    );
    
    // Close account and return rent to recipient
    Ok(())
}

#[derive(Accounts)]
pub struct CloseAuthorization<'info> {
    #[account(
        mut,
        close = rent_recipient,
        seeds = [b"authorization", authorization.nonce.as_ref()],
        bump = authorization.bump
    )]
    pub authorization: Account<'info, AuthorizationRecord>,
    
    /// Receives reclaimed rent
    /// CHECK: Any account can receive rent
    #[account(mut)]
    pub rent_recipient: UncheckedAccount<'info>,
}
```

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
- Sentinel authority PDA
- Authorization record PDA (dynamic from instruction data)
- Instructions Sysvar
- System program

**Size calculation:**
```
size = 4 + 4 + (4 * 35) = 148 bytes
```

### Initialization

**One-time setup per mint:**

```rust
use spl_transfer_hook_interface::instruction::ExecuteInstruction;
use spl_tlv_account_resolution::{account::ExtraAccountMeta, seeds::Seed};

pub fn initialize_extra_account_meta_list(
    ctx: Context<InitializeExtraAccountMetaList>
) -> Result<()> {
    let extra_metas = vec![
        // 1. Sentinel authority (static PDA)
        ExtraAccountMeta::new_with_seeds(
            &[Seed::Literal { bytes: b"sentinel".to_vec() }],
            false,  // is_signer
            false,  // is_writable
        )?,
        
        // 2. Authorization record (dynamic PDA from nonce in instruction)
        ExtraAccountMeta::new_with_seeds(
            &[
                Seed::Literal { bytes: b"authorization".to_vec() },
                Seed::InstructionData {
                    index: 276,  // Nonce offset in permit binary message
                    length: 32,  // Nonce is 32 bytes
                },
            ],
            false,  // is_signer
            true,   // is_writable (for init)
        )?,
        
        // 3. Instructions Sysvar (for Ed25519 introspection)
        ExtraAccountMeta::new_with_pubkey(
            &sysvar::instructions::ID,
            false,  // is_signer
            false,  // is_writable
        )?,
        
        // 4. System program (for authorization PDA init)
        ExtraAccountMeta::new_with_pubkey(
            &system_program::ID,
            false,  // is_signer
            false,  // is_writable
        )?,
    ];
    
    // Calculate required size
    let account_size = ExtraAccountMetaList::size_of(extra_metas.len())?;
    require_eq!(
        ctx.accounts.extra_account_meta_list.data_len(),
        account_size,
        ErrorCode::InvalidAccountSize
    );
    
    // Initialize list
    let mut data = ctx.accounts.extra_account_meta_list.try_borrow_mut_data()?;
    ExtraAccountMetaList::init::<ExecuteInstruction>(&mut data, &extra_metas)?;
    
    Ok(())
}

#[derive(Accounts)]
pub struct InitializeExtraAccountMetaList<'info> {
    /// CHECK: Validated by Token-2022
    pub mint: UncheckedAccount<'info>,
    
    /// ExtraAccountMetaList PDA
    /// CHECK: Initialized with correct size
    #[account(
        mut,
        seeds = [b"extra-account-metas", mint.key().as_ref()],
        bump
    )]
    pub extra_account_meta_list: UncheckedAccount<'info>,
    
    #[account(mut)]
    pub payer: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}
```

---

## Account Initialization

### Initialization Order

**Program Deployment:**

1. Deploy Anchor program to Solana
2. Initialize `SentinelAuthority` (one-time, global)

**Per-Mint Setup:**

3. Initialize `ExtraAccountMetaList` for each protected mint

**Per-Agent Setup (Optional MVP):**

4. Register `AgentRegistry` for each agent
5. Create `Policy` for each policy

**Per-Transfer:**

6. `AuthorizationRecord` created automatically during Transfer Hook execution

### Initialization Costs

| Account | Size | Rent (SOL)* | One-Time? |
|---------|------|-------------|-----------|
| `SentinelAuthority` | 73 bytes | 0.00063 | Yes (global) |
| `ExtraAccountMetaList` | 148 bytes | 0.00119 | Per mint |
| `AgentRegistry` | 122 bytes | 0.00099 | Per agent |
| `Policy` | 167 bytes | 0.00135 | Per policy |
| `AuthorizationRecord` | 81 bytes | 0.00067 | Per transfer |

*Based on 0.00000348 SOL/byte (subject to change)

### Who Pays?

| Account | Payer | Reason |
|---------|-------|--------|
| `SentinelAuthority` | Program deployer | One-time setup |
| `ExtraAccountMetaList` | Mint creator/protocol | Per-mint setup |
| `AgentRegistry` | Agent owner | Agent registration |
| `Policy` | Policy owner | Policy creation |
| `AuthorizationRecord` | Transfer authority | Transfer execution |

---

## Account Closure and Rent Reclamation

### Closeable Accounts

| Account | Closeable? | When? | Rent Recipient |
|---------|------------|-------|----------------|
| `SentinelAuthority` | No | N/A | N/A |
| `ExtraAccountMetaList` | No | N/A | N/A |
| `AgentRegistry` | Yes | After disable + grace period | Owner |
| `Policy` | Yes | After deactivation | Owner |
| `AuthorizationRecord` | Yes | After consumption + 9,000 slots | Transfer authority |

### Closure Instructions

**Close Agent Registry:**

```rust
pub fn close_agent_registry(
    ctx: Context<CloseAgentRegistry>
) -> Result<()> {
    let registry = &ctx.accounts.agent_registry;
    
    require_eq!(
        registry.status,
        AgentRegistry::STATUS_DISABLED,
        ErrorCode::AgentStillActive
    );
    
    let clock = Clock::get()?;
    // Require 7 days (~1,512,000 slots) after disable
    require!(
        clock.slot > registry.registered_at_slot + 1_512_000,
        ErrorCode::GracePeriodNotElapsed
    );
    
    Ok(())
}

#[derive(Accounts)]
pub struct CloseAgentRegistry<'info> {
    #[account(
        mut,
        close = rent_recipient,
        seeds = [b"agent", agent_registry.agent_id.as_bytes()],
        bump = agent_registry.bump,
        has_one = owner
    )]
    pub agent_registry: Account<'info, AgentRegistry>,
    
    pub owner: Signer<'info>,
    
    /// CHECK: Owner receives rent
    #[account(mut)]
    pub rent_recipient: UncheckedAccount<'info>,
}
```

### Rent Reclamation Economics

**Authorization Record Cleanup:**

Assuming 1,000 transfers per day:
- Created: 1,000 × 81 bytes = 81,000 bytes
- Rent: 1,000 × 0.00067 SOL = 0.67 SOL/day
- Closeable after: ~1 hour (9,000 slots)
- Daily reclaim potential: ~0.67 SOL

**Cleanup Strategy:**

1. Run periodic cleanup bot
2. Close authorizations older than 9,000 slots
3. Return rent to treasury or fee payer
4. Frequency: Every hour or daily (cost-benefit trade-off)

---

## Storage Cost Analysis

### MVP Configuration

**One-time costs:**
- Sentinel authority: 0.00063 SOL
- Extra account meta (USDC): 0.00119 SOL
- **Total:** ~0.00182 SOL (~$0.00036 at $0.20/SOL)

**Per-transfer costs:**
- Authorization record: 0.00067 SOL
- Closeable after 1 hour
- **Net cost:** Near-zero if cleanup bot runs

### Full Configuration (100 agents, 100 policies)

**Setup costs:**
- Sentinel authority: 0.00063 SOL
- Extra account meta (USDC): 0.00119 SOL
- 100 agent registries: 100 × 0.00099 = 0.099 SOL
- 100 policies: 100 × 0.00135 = 0.135 SOL
- **Total:** ~0.236 SOL (~$0.047 at $0.20/SOL)

**Per-transfer costs:**
- Authorization record: 0.00067 SOL
- Closeable after 1 hour

### Optimization Strategies

1. **Lazy Registration:** Only register agents on-chain when needed
2. **Backend Policy Mode:** Use MVP mode (backend signs, no on-chain policy)
3. **Aggressive Cleanup:** Run cleanup bot every hour to reclaim rent
4. **Batch Operations:** Group agent/policy registrations to save transaction fees

---

**Document Version:** 2.0  
**Last Updated:** November 7, 2026  
**Status:** Specification Complete  
**Next Steps:** Implement Anchor program accounts and initialization instructions
