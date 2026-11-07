# Lilia Transfer Hook Security Model

**Version:** 2.0  
**Last Updated:** November 7, 2026  
**Status:** Specification Complete

---

## Table of Contents

1. [Overview](#overview)
2. [Transfer Hook Execution Model](#transfer-hook-execution-model)
3. [Trust Boundaries](#trust-boundaries)
4. [Threat Model](#threat-model)
5. [Security Properties](#security-properties)
6. [Attack Vectors and Mitigations](#attack-vectors-and-mitigations)
7. [Validation Checklist](#validation-checklist)
8. [Testing Strategy](#testing-strategy)
9. [Audit Recommendations](#audit-recommendations)

---

## Overview

This document defines the security model for Lilia's Token-2022 Transfer Hook implementation. The Transfer Hook enforces authorization policies on token transfers by validating cryptographically signed permits from the Sentinel backend.

**Security Objectives:**

1. **Authorization Enforcement:** Only transfers authorized by Sentinel backend are allowed
2. **Replay Prevention:** Each permit can only be used once
3. **Integrity Preservation:** Transfer details must exactly match permit
4. **Expiry Enforcement:** Expired permits must be rejected
5. **Policy Compliance:** Transfers must comply with current on-chain policy (if present)

**Non-Goals:**

- ❌ Preventing valid transfer authority from executing permitted transfers
- ❌ Protecting against compromised Sentinel private key (trusted component)
- ❌ Preventing DOS attacks on Solana network (out of scope)

---

## Transfer Hook Execution Model

### What is a Transfer Hook?

A Transfer Hook is a program that Token-2022 **invokes during** a token transfer. The hook validates the transfer and either allows it to proceed or rejects it.

**Critical Understanding:**

```
Token-2022 Transfer Process:
1. Client submits transfer instruction
2. Token-2022 processes instruction
3. Token-2022 invokes Transfer Hook (if configured on mint)
4. Hook validates transfer
   └─> If valid: Hook returns Ok(()) → Transfer completes
   └─> If invalid: Hook returns Err(...) → Transfer fails
```

### What the Hook Does

✅ **The Transfer Hook:**
- Is invoked **BY** Token-2022 during a transfer
- Validates the transfer against a Sentinel-signed permit
- Checks permit signature (via Ed25519 precompile)
- Validates transfer parameters match permit
- Consumes nonce to prevent replay
- Returns Ok() to allow or Err() to reject

❌ **The Transfer Hook Does NOT:**
- Initiate transfers
- Call `token::transfer()` recursively
- Have signing authority over token accounts
- Move tokens directly
- Control Token-2022's execution

### Execution Context

**When Hook Executes:**
- After Token-2022 validates accounts
- Before Token-2022 moves tokens
- With read access to TransferHook account state
- With CPI capability (limited by Token-2022)

**What Hook Can Access:**
- ✅ Source token account (read-only)
- ✅ Destination token account (read-only)
- ✅ Mint account (read-only)
- ✅ Transfer authority (read-only)
- ✅ Extra accounts (specified in ExtraAccountMetaList)
- ✅ Instructions Sysvar (for Ed25519 introspection)
- ❌ Cannot access arbitrary accounts
- ❌ Cannot invoke Token-2022 recursively

---

## Trust Boundaries

### Trusted Components

**1. Sentinel Backend**

**Trust Assumption:** Sentinel private key is secure and backend policy evaluation is correct.

**Justification:**
- Backend is under operator control
- Private key stored in secure environment
- Policy evaluation is deterministic and auditable

**If Compromised:**
- Attacker can issue arbitrary permits
- All transfers signed by compromised key would be valid
- **Mitigation:** Key rotation mechanism, multi-signature requirement (future)

**2. Solana Validator Network**

**Trust Assumption:** Validators correctly execute Solana runtime and Token-2022 program.

**Justification:**
- Solana consensus provides Byzantine fault tolerance
- Token-2022 is audited and widely deployed

**If Compromised:**
- Fundamental blockchain security failure
- Outside scope of Lilia protocol

**3. Ed25519 Precompile**

**Trust Assumption:** Ed25519 precompile correctly verifies signatures.

**Justification:**
- Built into Solana runtime
- Standard Ed25519 implementation
- Widely used and tested

**If Compromised:**
- Signature verification fails
- Outside scope of Lilia protocol

### Untrusted Components

**1. Clients**

**Trust Assumption:** Clients are adversarial and may attempt to bypass authorization.

**Security Measures:**
- All transfer parameters validated on-chain
- Cannot forge Sentinel signatures
- Cannot reuse permits (nonce consumption)
- Cannot substitute accounts (on-chain validation)

**2. Token Account Owners**

**Trust Assumption:** Token account owners control their accounts and may attempt unauthorized transfers.

**Security Measures:**
- Transfer Hook validates permit regardless of signer
- Source account owner must have obtained valid permit
- Cannot bypass hook (enforced by Token-2022)

**3. Third-Party Programs**

**Trust Assumption:** Other programs may attempt to invoke transfers through CPI.

**Security Measures:**
- Transfer Hook validates all transfers
- CPI callers must provide valid permit
- No special privileges for CPI callers

---

## Threat Model

### Attacker Capabilities

**What an attacker CAN do:**
- ✅ Submit arbitrary transactions to Solana
- ✅ Control their own token accounts
- ✅ Observe all on-chain data (transactions, accounts, permits)
- ✅ Request evaluations from backend
- ✅ Attempt to reuse permits
- ✅ Attempt to modify transfer parameters
- ✅ Attempt instruction injection attacks
- ✅ Attempt account substitution attacks

**What an attacker CANNOT do:**
- ❌ Forge Sentinel signatures (without private key)
- ❌ Modify other users' token accounts (without their keys)
- ❌ Bypass Transfer Hook (enforced by Token-2022)
- ❌ Replay consumed permits (on-chain enforcement)
- ❌ Modify on-chain accounts they don't own

### Attack Goals

**Attacker Objectives:**
1. Execute unauthorized transfer (no valid permit)
2. Replay a previously used permit
3. Modify transfer amount beyond permitted
4. Substitute recipient account
5. Use expired permit
6. Bypass policy restrictions

---

## Security Properties

### Property 1: Authorization Requirement

**Statement:** Every transfer MUST be authorized by a valid Sentinel-signed permit.

**Enforcement:**
```rust
// Transfer Hook validates Ed25519 signature
let ed25519_ix = load_instruction_at_checked(0, &instructions_sysvar)?;
require_keys_eq!(ed25519_ix.program_id, ED25519_PROGRAM_ID, ErrorCode::InvalidProgram);

// Parse and validate Sentinel public key
let ed25519_data = parse_ed25519_ix_data(&ed25519_ix.data)?;
require!(
    ed25519_data.public_key == sentinel_authority.public_key.to_bytes(),
    ErrorCode::UnauthorizedSigner
);
```

**Verification:**
- Ed25519 precompile has already verified signature
- Hook validates Sentinel public key matches configuration
- Unsigned transfers fail at Ed25519 verification
- Wrong signer fails at public key check

### Property 2: Replay Prevention

**Statement:** Each permit can only be used once.

**Enforcement:**
```rust
// Authorization PDA derived from unique nonce
#[account(
    init,  // CRITICAL: init prevents replay
    payer = authority,
    space = AuthorizationRecord::LEN,
    seeds = [b"authorization", &permit.nonce],
    bump
)]
pub authorization: Account<'info, AuthorizationRecord>,
```

**Verification:**
- First use: PDA does not exist → `init` succeeds
- Replay: PDA exists → `init` fails with `AccountAlreadyInitialized`
- Nonce is 32 bytes random (2^256 collision resistance)

### Property 3: Parameter Integrity

**Statement:** Transfer parameters MUST exactly match permit.

**Enforcement:**
```rust
// Validate every critical parameter
require_keys_eq!(permit.source_token_account, source.key(), ErrorCode::SourceMismatch);
require_keys_eq!(permit.destination_token_account, destination.key(), ErrorCode::DestinationMismatch);
require_keys_eq!(permit.mint, mint.key(), ErrorCode::MintMismatch);
require_eq!(permit.amount, amount, ErrorCode::AmountMismatch);
require_eq!(permit.mint_decimals, mint.decimals, ErrorCode::DecimalsMismatch);
```

**Verification:**
- All addresses compared as Pubkeys
- Amount compared as u64
- Decimals validated against on-chain mint
- Any mismatch causes transaction failure

### Property 4: Expiry Enforcement

**Statement:** Expired permits MUST be rejected.

**Enforcement:**
```rust
let clock = Clock::get()?;
require!(
    clock.slot <= permit.expires_at_slot,
    ErrorCode::PermitExpired
);
```

**Verification:**
- Slot-based expiry (deterministic)
- Uses blockchain clock (cannot be manipulated by client)
- Comparison is strict (expires_at_slot + 1 is expired)

### Property 5: Policy Compliance

**Statement:** Transfers MUST comply with on-chain policy (if present).

**Enforcement:**
```rust
if let Some(policy) = &ctx.accounts.policy {
    require!(policy.is_active, ErrorCode::PolicyInactive);
    require_eq!(policy.policy_version, permit.policy_version, ErrorCode::PolicyVersionMismatch);
    require!(permit.amount <= policy.max_transfer_amount, ErrorCode::AmountExceedsPolicy);
    
    if let Some(allowed_mint) = policy.allowed_mint {
        require_keys_eq!(permit.mint, allowed_mint, ErrorCode::MintNotAllowed);
    }
}
```

**Verification:**
- Policy status checked (must be active)
- Policy version must match permit
- Amount must not exceed maximum
- Mint must match allowed mint (if specified)

---

## Attack Vectors and Mitigations

### Attack 1: Signature Forgery

**Attack:** Attacker attempts to create permit without Sentinel private key.

**Vector:**
```typescript
// Attacker creates fake permit
const fakePermit = {
  amount: "1000000",
  recipient: attackerAccount,
  // ... other fields
};

// Attacker signs with their own key (not Sentinel)
const fakeSignature = sign(fakePermit, attackerPrivateKey);
```

**Mitigation:**
```rust
// Hook validates Sentinel public key
require!(
    ed25519_data.public_key == sentinel_authority.public_key.to_bytes(),
    ErrorCode::UnauthorizedSigner
);
```

**Result:** ✅ Attack fails - wrong public key detected

### Attack 2: Permit Replay

**Attack:** Attacker reuses a valid permit multiple times.

**Vector:**
```typescript
// First use: success
await submitTransfer(validPermit);

// Attempt replay
await submitTransfer(validPermit);  // Same nonce
```

**Mitigation:**
```rust
// Authorization PDA created on first use
#[account(
    init,  // Fails if PDA already exists
    seeds = [b"authorization", &permit.nonce],
    bump
)]
pub authorization: Account<'info, AuthorizationRecord>,
```

**Result:** ✅ Attack fails - `AccountAlreadyInitialized` error

### Attack 3: Amount Manipulation

**Attack:** Attacker modifies transfer amount after getting permit.

**Vector:**
```typescript
// Backend issues permit for 100 tokens
const permit = await getPermit({ amount: "100000000" });

// Attacker transfers 1000 tokens instead
await submitTransfer(permit, amount: 1000000000);
```

**Mitigation:**
```rust
// Hook validates exact amount
require_eq!(
    permit.amount,
    amount,
    ErrorCode::AmountMismatch
);
```

**Result:** ✅ Attack fails - amount mismatch detected

### Attack 4: Recipient Substitution

**Attack:** Attacker changes recipient after getting permit.

**Vector:**
```typescript
// Backend issues permit for legitimate recipient
const permit = await getPermit({ recipient: legitimateAccount });

// Attacker substitutes their account
await submitTransfer(permit, destination: attackerAccount);
```

**Mitigation:**
```rust
// Hook validates exact destination
require_keys_eq!(
    permit.destination_token_account,
    destination.key(),
    ErrorCode::DestinationMismatch
);
```

**Result:** ✅ Attack fails - destination mismatch detected

### Attack 5: Instruction Injection

**Attack:** Attacker inserts malicious instructions between Ed25519 verify and transfer.

**Vector:**
```typescript
const transaction = new Transaction();
transaction.add(ed25519VerifyIx);
transaction.add(maliciousInstruction);  // Injected
transaction.add(transferIx);
```

**Mitigation:**
```rust
// Hook loads Ed25519 instruction at specific index
let ed25519_ix = load_instruction_at_checked(
    0,  // Must be instruction 0 (first)
    &instructions_sysvar
)?;

// Transfer must be instruction 1 (second)
// Any additional instructions break indexing
```

**Result:** ✅ Attack fails - Ed25519 instruction not at expected index

### Attack 6: Account Substitution

**Attack:** Attacker provides different accounts than specified in permit.

**Vector:**
```typescript
// Permit specifies victim's source account
const permit = getPermit({ source: victimAccount });

// Attacker substitutes their own account
await submitTransfer(permit, source: attackerAccount);
```

**Mitigation:**
```rust
// Hook validates all account addresses
require_keys_eq!(permit.source_token_account, source.key(), ErrorCode::SourceMismatch);
require_keys_eq!(permit.destination_token_account, destination.key(), ErrorCode::DestinationMismatch);
require_keys_eq!(permit.mint, mint.key(), ErrorCode::MintMismatch);
```

**Result:** ✅ Attack fails - source account mismatch detected

### Attack 7: Expiry Bypass

**Attack:** Attacker uses expired permit by manipulating time.

**Vector:**
```typescript
// Permit expires at slot 250000000
// Current slot is 250000100

// Attacker attempts to use expired permit
await submitTransfer(expiredPermit);
```

**Mitigation:**
```rust
// Hook uses on-chain clock (cannot be manipulated)
let clock = Clock::get()?;
require!(
    clock.slot <= permit.expires_at_slot,
    ErrorCode::PermitExpired
);
```

**Result:** ✅ Attack fails - permit expired

### Attack 8: Policy Version Downgrade

**Attack:** Attacker uses permit from old policy version.

**Vector:**
```typescript
// Policy updated from v1 to v2 (stricter limits)
// Attacker saved old permit from v1

await submitTransfer(oldPermit);  // policy_version = 1
```

**Mitigation:**
```rust
// Hook validates current policy version
require_eq!(
    policy.policy_version,
    permit.policy_version,
    ErrorCode::PolicyVersionMismatch
);
```

**Result:** ✅ Attack fails - policy version mismatch

### Attack 9: Ed25519 Instruction Omission

**Attack:** Attacker omits Ed25519 verification instruction entirely.

**Vector:**
```typescript
const transaction = new Transaction();
// No Ed25519 instruction
transaction.add(transferIx);
```

**Mitigation:**
```rust
// Hook requires Ed25519 instruction
let ed25519_ix = load_instruction_at_checked(0, &instructions_sysvar)?;

// If instruction 0 doesn't exist or is not Ed25519, this fails
require_keys_eq!(
    ed25519_ix.program_id,
    ED25519_PROGRAM_ID,
    ErrorCode::InvalidProgram
);
```

**Result:** ✅ Attack fails - Ed25519 instruction missing

### Attack 10: Nonce Prediction

**Attack:** Attacker predicts future nonces to pre-create authorization PDAs.

**Vector:**
```rust
// Attacker tries to guess nonce
let predicted_nonce = [0u8; 32];  // All zeros

// Pre-create authorization PDA
create_authorization_pda(predicted_nonce);
```

**Mitigation:**
- Nonces are 32-byte cryptographically random values
- Collision probability: 1 in 2^256 ≈ negligible
- Even if predicted, PDA creation requires rent payment
- Backend never reuses nonces

**Result:** ✅ Attack infeasible - nonce space is 2^256

---

## Validation Checklist

### Pre-Transaction Validation (Client)

- [ ] Permit obtained from legitimate Sentinel backend
- [ ] Permit not expired (check `expiresAt` timestamp)
- [ ] Transfer parameters match permit exactly
- [ ] Ed25519 instruction constructed correctly
- [ ] Transfer instruction constructed correctly
- [ ] Instruction ordering: Ed25519 first, transfer second
- [ ] Extra accounts resolved from ExtraAccountMetaList

### On-Chain Validation (Transfer Hook)

**1. Ed25519 Instruction Validation**
- [ ] Ed25519 instruction exists at index 0
- [ ] Program ID is `Ed25519SigVerify111111111111111111111111111`
- [ ] Public key matches Sentinel authority
- [ ] Instruction data parsed successfully

**2. Permit Deserialization**
- [ ] Message bytes extracted from Ed25519 instruction
- [ ] Permit deserialized successfully (308 bytes)
- [ ] Domain equals `"lilia.authorization.v2"`
- [ ] Version equals `2`

**3. Expiry Validation**
- [ ] Current slot obtained from Clock sysvar
- [ ] Current slot <= expires_at_slot

**4. Transfer Parameter Validation**
- [ ] Source token account matches permit
- [ ] Destination token account matches permit
- [ ] Mint matches permit
- [ ] Amount matches permit exactly
- [ ] Mint decimals match on-chain mint

**5. Policy Validation (if present)**
- [ ] Policy is active
- [ ] Policy version matches permit
- [ ] Amount <= max transfer amount
- [ ] Mint matches allowed mint (if specified)

**6. Nonce Consumption**
- [ ] Authorization PDA derived correctly
- [ ] PDA initialization succeeds (not already initialized)
- [ ] Authorization record populated with nonce, agent, slot

**7. Event Emission**
- [ ] TransferAuthorized event emitted
- [ ] Event contains all relevant transfer details

### Post-Transaction Validation (Backend)

- [ ] Transaction confirmed on-chain
- [ ] Transaction logs parsed successfully
- [ ] TransferAuthorized event found
- [ ] Database updated with confirmation
- [ ] Transaction signature recorded

---

## Testing Strategy

### Unit Tests

**Test Categories:**

1. **Permit Deserialization**
   - Valid permit deserializes correctly
   - Invalid domain rejected
   - Invalid version rejected
   - Malformed binary rejected

2. **Ed25519 Instruction Parsing**
   - Valid Ed25519 instruction parsed
   - Wrong program ID rejected
   - Invalid offsets rejected
   - Malformed data rejected

3. **Parameter Validation**
   - Exact match succeeds
   - Source mismatch rejected
   - Destination mismatch rejected
   - Mint mismatch rejected
   - Amount mismatch rejected
   - Decimals mismatch rejected

4. **Expiry Validation**
   - Valid slot accepted
   - Expired slot rejected
   - Boundary conditions tested

5. **Nonce Consumption**
   - First use succeeds
   - Replay attempt fails
   - Different nonce succeeds

### Integration Tests

**Test Scenarios:**

1. **Happy Path**
   - Request evaluation → approve
   - Request authorization → receive permit
   - Build transaction → submit
   - Transfer succeeds
   - Authorization consumed

2. **Replay Prevention**
   - Use permit once → success
   - Attempt reuse → failure

3. **Amount Manipulation**
   - Get permit for 100 tokens
   - Attempt transfer of 1000 tokens
   - Transfer rejected

4. **Recipient Substitution**
   - Get permit for recipient A
   - Attempt transfer to recipient B
   - Transfer rejected

5. **Expiry Enforcement**
   - Get permit with 5-minute expiry
   - Wait until expired
   - Attempt transfer → rejected

6. **Policy Update**
   - Get permit under policy v1
   - Update policy to v2
   - Attempt transfer with old permit
   - Transfer rejected

7. **Instruction Injection**
   - Construct transaction with extra instructions
   - Transfer rejected

### Adversarial Tests

**Attack Simulations:**

1. **Forgery Attempt**
   - Create permit without Sentinel key
   - Sign with attacker key
   - Submit → rejected

2. **Replay Attack**
   - Capture valid permit
   - Use multiple times
   - Only first succeeds

3. **Parameter Tampering**
   - Modify amount, recipient, source
   - Submit → rejected

4. **Instruction Reordering**
   - Put transfer before Ed25519
   - Submit → rejected

5. **Account Substitution**
   - Use permit for account A
   - Submit with account B
   - Transfer rejected

### Performance Tests

**Metrics to Measure:**

- Authorization PDA creation cost
- Transfer Hook execution compute units
- Transaction size overhead
- Confirmation latency
- Cleanup bot efficiency

---

## Audit Recommendations

### Pre-Audit Preparation

**Code Quality:**
- [ ] All security-critical code documented
- [ ] Invariants specified in comments
- [ ] Error codes have descriptive messages
- [ ] No TODOs or FIXMEs in security code

**Testing:**
- [ ] 100% test coverage of security paths
- [ ] All attack vectors tested
- [ ] Fuzzing tests for deserialization
- [ ] Integration tests on Devnet

**Documentation:**
- [ ] All threat models documented
- [ ] Security properties specified
- [ ] Validation checklist complete
- [ ] Attack mitigations explained

### Audit Focus Areas

**Critical Components:**

1. **Ed25519 Instruction Introspection**
   - Verify correct instruction index
   - Verify program ID validation
   - Verify public key validation
   - Verify message extraction

2. **Permit Deserialization**
   - Verify binary format parsing
   - Verify field validation
   - Verify no buffer overflows
   - Verify no integer overflows

3. **Nonce Consumption**
   - Verify PDA derivation
   - Verify init constraint
   - Verify atomicity
   - Verify no bypass possible

4. **Parameter Validation**
   - Verify all fields checked
   - Verify no TOCTOU issues
   - Verify no substitution attacks
   - Verify exact comparisons

5. **Authority Model**
   - Verify Sentinel public key update mechanism
   - Verify only authorized updates
   - Verify no privilege escalation

### Known Limitations

**Documented Trade-offs:**

1. **Trusted Sentinel:** Backend private key must be secured
2. **Slot Timing:** Expiry based on ~400ms average (not guaranteed)
3. **Storage Costs:** Per-transfer authorization PDAs (mitigated by cleanup)
4. **MVP Scope:** On-chain policy validation optional (backend-only mode)

### Post-Audit Actions

- [ ] Address all critical findings
- [ ] Address all high findings
- [ ] Document accepted risks
- [ ] Update security model
- [ ] Retest after fixes
- [ ] Publish audit report

---

## Security Checklist Summary

### Implementation Checklist

✅ **Cryptography:**
- [ ] Ed25519 signature verification via precompile
- [ ] Sentinel public key validated
- [ ] Binary format correctly parsed
- [ ] No signature malleability

✅ **Replay Prevention:**
- [ ] Nonce PDA derivation correct
- [ ] Init constraint prevents replay
- [ ] Nonce is cryptographically random
- [ ] No nonce reuse by backend

✅ **Validation:**
- [ ] All transfer parameters validated
- [ ] Exact comparisons (no ranges)
- [ ] Slot-based expiry enforced
- [ ] Policy version checked

✅ **Access Control:**
- [ ] Sentinel authority updatable only by authorized user
- [ ] No unauthorized account modifications
- [ ] Proper PDA ownership

✅ **Error Handling:**
- [ ] All error paths tested
- [ ] No information leakage in errors
- [ ] Graceful failure modes

✅ **Testing:**
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Adversarial tests pass
- [ ] Devnet testing complete

---

**Document Version:** 2.0  
**Last Updated:** November 7, 2026  
**Status:** Specification Complete  
**Next Steps:** Implement Transfer Hook with security checklist validation
