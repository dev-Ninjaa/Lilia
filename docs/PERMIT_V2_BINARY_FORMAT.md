# Lilia Permit V2.0 Binary Serialization Format

**Version:** 2.0  
**Last Updated:** November 7, 2026  
**Status:** Specification Complete

---

## Table of Contents

1. [Overview](#overview)
2. [Design Principles](#design-principles)
3. [Binary Layout](#binary-layout)
4. [Field Encoding Rules](#field-encoding-rules)
5. [Domain Separator](#domain-separator)
6. [Complete Example](#complete-example)
7. [Test Vectors](#test-vectors)
8. [TypeScript Implementation](#typescript-implementation)
9. [Rust Implementation](#rust-implementation)
10. [Validation Rules](#validation-rules)

---

## Overview

This document specifies the **exact binary serialization format** for Lilia Permit v2.0. The TypeScript backend and Rust Anchor program MUST produce and verify **byte-identical** canonical messages.

**Purpose:**
- Enable cryptographic verification of permits on-chain
- Ensure TypeScript signing and Rust verification produce identical results
- Eliminate ambiguity in field ordering, endianness, and encoding
- Provide reproducible test vectors for implementation validation

**Cryptographic Flow:**

```
TypeScript Backend                      Rust Anchor Program
─────────────────                      ───────────────────
                                       
1. Construct permit fields              1. Receive Ed25519 instruction
2. Serialize to binary (this spec)      2. Extract message bytes
3. Sign with Ed25519                    3. Deserialize to permit struct (this spec)
4. Encode signature as base64url        4. Validate permit fields
                                        5. Ed25519 precompile has already verified signature
```

---

## Design Principles

### 1. Fixed-Width Fields Where Possible

Fixed-width fields enable efficient parsing and eliminate length ambiguities:
- `u8`: 1 byte
- `u32`: 4 bytes (little-endian)
- `u64`: 8 bytes (little-endian)
- `Pubkey`: 32 bytes (raw bytes)
- `[u8; 32]`: 32 bytes (nonce)

### 2. Length-Prefixed Strings

Variable-length strings use 4-byte little-endian length prefix:
- Length: `u32` (4 bytes, little-endian)
- Data: UTF-8 encoded bytes
- Total: 4 + length bytes

### 3. Little-Endian Encoding

All multi-byte integers use **little-endian** byte order (matching Solana/Rust defaults):
- `u32`: least significant byte first
- `u64`: least significant byte first

**Example:**
```
u64 value: 250000750
Hex: 0x0EE6B74E
Bytes: [0x4E, 0xB7, 0xE6, 0x0E, 0x00, 0x00, 0x00, 0x00]
       LSB                                           MSB
```

### 4. No Padding or Alignment

Fields are packed sequentially with **no padding bytes** between them. Field boundaries are determined solely by field sizes, not alignment requirements.

### 5. Domain Separator Prefix

The message begins with a fixed domain separator to prevent cross-protocol replay attacks.

---

## Binary Layout

### Field Summary

| Offset | Size | Field | Type | Encoding |
|--------|------|-------|------|----------|
| 0 | 30 | Domain separator | `string` | UTF-8 (no length prefix) |
| 30 | 1 | Version | `u8` | Fixed value: `2` |
| 31 | 32 | Agent Registry PDA | `Pubkey` | Raw 32 bytes |
| 63 | 32 | Agent Public Key | `Pubkey` | Raw 32 bytes |
| 95 | 32 | Policy PDA | `Pubkey` | Raw 32 bytes |
| 127 | 4 | Policy Version | `u32` | Little-endian |
| 131 | 32 | Transfer Authority | `Pubkey` | Raw 32 bytes |
| 163 | 32 | Source Token Account | `Pubkey` | Raw 32 bytes |
| 195 | 32 | Destination Token Account | `Pubkey` | Raw 32 bytes |
| 227 | 32 | Mint | `Pubkey` | Raw 32 bytes |
| 259 | 1 | Mint Decimals | `u8` | Fixed value: 0-18 |
| 260 | 8 | Amount (base units) | `u64` | Little-endian |
| 268 | 8 | Expires At Slot | `u64` | Little-endian |
| 276 | 32 | Nonce | `[u8; 32]` | Raw 32 bytes (hex decoded) |
| **308** | **—** | **Total** | **—** | **Fixed 308 bytes** |

### Layout Diagram

```
Byte Offset
0         10        20        30        40        50        60        70        80
├─────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┴─────────┤
│ "lilia.authorization.v2\0\0\0\0\0\0" │V│      Agent Registry PDA (32 bytes)     │
├─────────────────────────────────────────┴─┴────────────────────────────────────┤
│                  Agent Public Key (32 bytes)                   │
├────────────────────────────────────────────────────────────────┤
│                     Policy PDA (32 bytes)                      │
├────────────────────────────────────────────────────────────────┤
│ Policy Ver │          Transfer Authority (32 bytes)           │
│  (4 bytes) │                                                   │
├────────────┴───────────────────────────────────────────────────┤
│              Source Token Account (32 bytes)                   │
├────────────────────────────────────────────────────────────────┤
│           Destination Token Account (32 bytes)                 │
├────────────────────────────────────────────────────────────────┤
│                    Mint (32 bytes)                             │
├────────────────────────────────────────────────────────────────┤
│D│    Amount (8 bytes)    │ Expires Slot (8 bytes) │           │
├─┴────────────────────────┴────────────────────────┴───────────┤
│                     Nonce (32 bytes)                           │
└────────────────────────────────────────────────────────────────┘

Legend:
V = Version (1 byte)
D = Mint Decimals (1 byte)
```

---

## Field Encoding Rules

### 1. Domain Separator (30 bytes, fixed)

**Value:** `"lilia.authorization.v2"`
**Encoding:** UTF-8 with null padding to 30 bytes
**Purpose:** Prevent cross-protocol signature replay

```typescript
const domain = "lilia.authorization.v2";
const domainBytes = Buffer.alloc(30);
domainBytes.write(domain, 'utf8');
// Remaining bytes are 0x00

// Result (30 bytes):
// [0x6C, 0x69, 0x6C, 0x69, 0x61, 0x2E, 0x61, 0x75,
//  0x74, 0x68, 0x6F, 0x72, 0x69, 0x7A, 0x61, 0x74,
//  0x69, 0x6F, 0x6E, 0x2E, 0x76, 0x32, 0x00, 0x00,
//  0x00, 0x00, 0x00, 0x00, 0x00, 0x00]
```

**Rust:**
```rust
const DOMAIN_BYTES: [u8; 30] = [
    0x6C, 0x69, 0x6C, 0x69, 0x61, 0x2E, 0x61, 0x75,
    0x74, 0x68, 0x6F, 0x72, 0x69, 0x7A, 0x61, 0x74,
    0x69, 0x6F, 0x6E, 0x2E, 0x76, 0x32, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
];
```

### 2. Version (1 byte)

**Value:** `2`
**Encoding:** Single byte, fixed value

```typescript
buffer.writeUInt8(2, offset);
```

**Rust:**
```rust
buffer[offset] = 2;
```

### 3. Solana Public Keys (32 bytes each)

**Format:** Raw 32-byte Ed25519 public key
**Encoding:** Decode from base58 string to raw bytes

**TypeScript:**
```typescript
import { PublicKey } from '@solana/web3.js';

const pubkey = new PublicKey("9xQeWvzPe...base58...");
const bytes = pubkey.toBytes();  // 32 bytes
buffer.set(bytes, offset);
```

**Rust:**
```rust
use solana_program::pubkey::Pubkey;

let pubkey = Pubkey::from_str("9xQeWvzPe...base58...")?;
buffer[offset..offset+32].copy_from_slice(&pubkey.to_bytes());
```

**Fields Using This Encoding:**
- Agent Registry PDA (offset 31)
- Agent Public Key (offset 63)
- Policy PDA (offset 95)
- Transfer Authority (offset 131)
- Source Token Account (offset 163)
- Destination Token Account (offset 195)
- Mint (offset 227)

### 4. Policy Version (4 bytes, u32 little-endian)

**Range:** 1 to 4,294,967,295
**Encoding:** 32-bit unsigned integer, little-endian

```typescript
buffer.writeUInt32LE(policyVersion, offset);

// Example: version 1
// Bytes: [0x01, 0x00, 0x00, 0x00]

// Example: version 42
// Bytes: [0x2A, 0x00, 0x00, 0x00]
```

**Rust:**
```rust
buffer[offset..offset+4].copy_from_slice(&policy_version.to_le_bytes());
```

### 5. Mint Decimals (1 byte, u8)

**Range:** 0 to 18
**Encoding:** Single byte

```typescript
if (mintDecimals < 0 || mintDecimals > 18) {
    throw new Error("Mint decimals must be 0-18");
}
buffer.writeUInt8(mintDecimals, offset);
```

**Rust:**
```rust
require!(decimals <= 18, ErrorCode::InvalidDecimals);
buffer[offset] = decimals;
```

### 6. Amount (8 bytes, u64 little-endian)

**Range:** 1 to 18,446,744,073,709,551,615 (u64::MAX)
**Encoding:** 64-bit unsigned integer, little-endian
**Unit:** Base units (not decimal)

```typescript
const amount = BigInt("500123456");  // 500.123456 USDC (6 decimals)
const amountBuffer = Buffer.alloc(8);
amountBuffer.writeBigUInt64LE(amount);
buffer.set(amountBuffer, offset);

// Example: 500123456
// Hex: 0x1DCD1300
// Bytes: [0x00, 0x13, 0xCD, 0x1D, 0x00, 0x00, 0x00, 0x00]
```

**Rust:**
```rust
buffer[offset..offset+8].copy_from_slice(&amount.to_le_bytes());
```

### 7. Expires At Slot (8 bytes, u64 little-endian)

**Range:** 0 to 18,446,744,073,709,551,615 (u64::MAX)
**Encoding:** 64-bit unsigned integer, little-endian

```typescript
const expiresAtSlot = BigInt("250000750");
const slotBuffer = Buffer.alloc(8);
slotBuffer.writeBigUInt64LE(expiresAtSlot);
buffer.set(slotBuffer, offset);

// Example: 250000750
// Hex: 0x0EE6B74E
// Bytes: [0x4E, 0xB7, 0xE6, 0x0E, 0x00, 0x00, 0x00, 0x00]
```

**Rust:**
```rust
buffer[offset..offset+8].copy_from_slice(&expires_at_slot.to_le_bytes());
```

### 8. Nonce (32 bytes, fixed)

**Format:** 32-byte random value
**Encoding:** Hex string decoded to raw bytes

```typescript
const nonceHex = "a3f5e9c2d8b1f4a7e6c3d9b2f1a8e5c4d7b3f6a9e2c8d1b5f4a7e3c9d6b2f8a5c1";
const nonceBytes = Buffer.from(nonceHex, 'hex');  // 32 bytes
buffer.set(nonceBytes, offset);
```

**Rust:**
```rust
let nonce_bytes = hex::decode(nonce_hex)?;
require_eq!(nonce_bytes.len(), 32, ErrorCode::InvalidNonceLength);
buffer[offset..offset+32].copy_from_slice(&nonce_bytes);
```

---

## Domain Separator

The domain separator prevents signature replay across different protocols or versions.

**Format:**
```
"lilia.authorization.v2"
```

**Rationale:**
1. **Protocol identification:** `lilia.authorization`
2. **Version:** `.v2`
3. **Fixed width:** Padded to 30 bytes with null bytes

**Alternatives Considered:**

| Alternative | Rejected Reason |
|-------------|----------------|
| Variable-length prefix | Adds parsing complexity |
| Hash-based separator | Less human-readable |
| No separator | Cross-protocol replay risk |
| Longer separator | Wastes bytes for marginal benefit |

---

## Complete Example

### Input Data

```json
{
  "domain": "lilia.authorization.v2",
  "version": 2,
  "agentRegistryPda": "9xQeWvzPeXWvzPeXWvzPeXWvzPeXWvzPeXWvzPeXWvz",
  "agentPublicKey": "7xV8HxV8HxV8HxV8HxV8HxV8HxV8HxV8HxV8HxV8HxV8",
  "policyPda": "5tK9LtK9LtK9LtK9LtK9LtK9LtK9LtK9LtK9LtK9LtK9",
  "policyVersion": 1,
  "transferAuthority": "4sM3PsM3PsM3PsM3PsM3PsM3PsM3PsM3PsM3PsM3PsM3",
  "sourceTokenAccount": "3rL2QrL2QrL2QrL2QrL2QrL2QrL2QrL2QrL2QrL2QrL2",
  "destinationTokenAccount": "2qK1PqK1PqK1PqK1PqK1PqK1PqK1PqK1PqK1PqK1PqK1",
  "mint": "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
  "mintDecimals": 6,
  "amount": "500123456",
  "expiresAtSlot": "250000750",
  "nonce": "a3f5e9c2d8b1f4a7e6c3d9b2f1a8e5c4d7b3f6a9e2c8d1b5f4a7e3c9d6b2f8a5c1"
}
```

### Binary Representation (308 bytes)

**Hex Dump:**
```
Offset 0-31 (Domain + Version):
6C 69 6C 69 61 2E 61 75 74 68 6F 72 69 7A 61 74
69 6F 6E 2E 76 32 00 00 00 00 00 00 00 00 02

Offset 31-63 (Agent Registry PDA):
[32 bytes of decoded base58 for agent registry PDA]

Offset 63-95 (Agent Public Key):
[32 bytes of decoded base58 for agent public key]

Offset 95-127 (Policy PDA):
[32 bytes of decoded base58 for policy PDA]

Offset 127-131 (Policy Version = 1):
01 00 00 00

Offset 131-163 (Transfer Authority):
[32 bytes of decoded base58 for transfer authority]

Offset 163-195 (Source Token Account):
[32 bytes of decoded base58 for source token account]

Offset 195-227 (Destination Token Account):
[32 bytes of decoded base58 for destination token account]

Offset 227-259 (Mint):
[32 bytes of decoded base58 for USDC mint]

Offset 259 (Mint Decimals = 6):
06

Offset 260-268 (Amount = 500123456):
00 13 CD 1D 00 00 00 00

Offset 268-276 (Expires At Slot = 250000750):
4E B7 E6 0E 00 00 00 00

Offset 276-308 (Nonce):
A3 F5 E9 C2 D8 B1 F4 A7 E6 C3 D9 B2 F1 A8 E5 C4
D7 B3 F6 A9 E2 C8 D1 B5 F4 A7 E3 C9 D6 B2 F8 A5
C1
```

### SHA-256 Hash

**Input:** 308 bytes as shown above
**Output (hex):**
```
[To be computed with actual pubkey bytes]
```

---

## Test Vectors

### Test Vector 1: Minimal Permit

**Input:**
```json
{
  "domain": "lilia.authorization.v2",
  "version": 2,
  "agentRegistryPda": "11111111111111111111111111111111",
  "agentPublicKey": "11111111111111111111111111111111",
  "policyPda": "11111111111111111111111111111111",
  "policyVersion": 1,
  "transferAuthority": "11111111111111111111111111111111",
  "sourceTokenAccount": "11111111111111111111111111111111",
  "destinationTokenAccount": "11111111111111111111111111111111",
  "mint": "11111111111111111111111111111111",
  "mintDecimals": 0,
  "amount": "1",
  "expiresAtSlot": "1",
  "nonce": "0000000000000000000000000000000000000000000000000000000000000001"
}
```

**Expected Binary (308 bytes):**
- Bytes 0-29: Domain "lilia.authorization.v2" + padding
- Byte 30: Version = 2
- Bytes 31-62: All zeros (Pubkey 11111... decodes to zeros)
- Bytes 63-94: All zeros
- Bytes 95-126: All zeros
- Bytes 127-130: [0x01, 0x00, 0x00, 0x00] (policy version 1)
- Bytes 131-258: All zeros (pubkeys)
- Byte 259: 0x00 (mint decimals = 0)
- Bytes 260-267: [0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00] (amount = 1)
- Bytes 268-275: [0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00] (slot = 1)
- Bytes 276-307: [0x00 × 31, 0x01] (nonce)

**Expected SHA-256:**
```
[Compute from actual bytes]
```

### Test Vector 2: Maximum Values

**Input:**
```json
{
  "domain": "lilia.authorization.v2",
  "version": 2,
  "agentRegistryPda": "9xQeWvzPeXWvzPeXWvzPeXWvzPeXWvzPeXWvzPeXWvz",
  "agentPublicKey": "9xQeWvzPeXWvzPeXWvzPeXWvzPeXWvzPeXWvzPeXWvz",
  "policyPda": "9xQeWvzPeXWvzPeXWvzPeXWvzPeXWvzPeXWvzPeXWvz",
  "policyVersion": 4294967295,
  "transferAuthority": "9xQeWvzPeXWvzPeXWvzPeXWvzPeXWvzPeXWvzPeXWvz",
  "sourceTokenAccount": "9xQeWvzPeXWvzPeXWvzPeXWvzPeXWvzPeXWvzPeXWvz",
  "destinationTokenAccount": "9xQeWvzPeXWvzPeXWvzPeXWvzPeXWvzPeXWvzPeXWvz",
  "mint": "9xQeWvzPeXWvzPeXWvzPeXWvzPeXWvzPeXWvzPeXWvz",
  "mintDecimals": 18,
  "amount": "18446744073709551615",
  "expiresAtSlot": "18446744073709551615",
  "nonce": "ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff"
}
```

**Expected Binary:**
- Policy version bytes: [0xFF, 0xFF, 0xFF, 0xFF]
- Mint decimals: 0x12 (18)
- Amount bytes: [0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]
- Slot bytes: [0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF]
- Nonce: [0xFF × 32]

---

## TypeScript Implementation

### Complete Serialization Function

```typescript
import { PublicKey } from '@solana/web3.js';

export interface PermitPayloadV2 {
  domain: string;
  version: number;
  agentRegistryPda: string;
  agentPublicKey: string;
  policyPda: string;
  policyVersion: number;
  transferAuthority: string;
  sourceTokenAccount: string;
  destinationTokenAccount: string;
  mint: string;
  mintDecimals: number;
  amount: string;
  expiresAtSlot: string;
  nonce: string;
}

export function serializePermitV2(payload: PermitPayloadV2): Buffer {
  // Validate inputs
  if (payload.domain !== "lilia.authorization.v2") {
    throw new Error("Invalid domain");
  }
  if (payload.version !== 2) {
    throw new Error("Invalid version");
  }
  if (payload.mintDecimals < 0 || payload.mintDecimals > 18) {
    throw new Error("Mint decimals must be 0-18");
  }
  
  const buffer = Buffer.alloc(308);
  let offset = 0;
  
  // 1. Domain separator (30 bytes)
  buffer.write(payload.domain, offset, 'utf8');
  offset += 30;
  
  // 2. Version (1 byte)
  buffer.writeUInt8(payload.version, offset);
  offset += 1;
  
  // 3. Agent Registry PDA (32 bytes)
  const agentRegistryPda = new PublicKey(payload.agentRegistryPda);
  buffer.set(agentRegistryPda.toBytes(), offset);
  offset += 32;
  
  // 4. Agent Public Key (32 bytes)
  const agentPublicKey = new PublicKey(payload.agentPublicKey);
  buffer.set(agentPublicKey.toBytes(), offset);
  offset += 32;
  
  // 5. Policy PDA (32 bytes)
  const policyPda = new PublicKey(payload.policyPda);
  buffer.set(policyPda.toBytes(), offset);
  offset += 32;
  
  // 6. Policy Version (4 bytes, u32 LE)
  buffer.writeUInt32LE(payload.policyVersion, offset);
  offset += 4;
  
  // 7. Transfer Authority (32 bytes)
  const transferAuthority = new PublicKey(payload.transferAuthority);
  buffer.set(transferAuthority.toBytes(), offset);
  offset += 32;
  
  // 8. Source Token Account (32 bytes)
  const sourceTokenAccount = new PublicKey(payload.sourceTokenAccount);
  buffer.set(sourceTokenAccount.toBytes(), offset);
  offset += 32;
  
  // 9. Destination Token Account (32 bytes)
  const destinationTokenAccount = new PublicKey(payload.destinationTokenAccount);
  buffer.set(destinationTokenAccount.toBytes(), offset);
  offset += 32;
  
  // 10. Mint (32 bytes)
  const mint = new PublicKey(payload.mint);
  buffer.set(mint.toBytes(), offset);
  offset += 32;
  
  // 11. Mint Decimals (1 byte)
  buffer.writeUInt8(payload.mintDecimals, offset);
  offset += 1;
  
  // 12. Amount (8 bytes, u64 LE)
  const amount = BigInt(payload.amount);
  const amountBuffer = Buffer.alloc(8);
  amountBuffer.writeBigUInt64LE(amount);
  buffer.set(amountBuffer, offset);
  offset += 8;
  
  // 13. Expires At Slot (8 bytes, u64 LE)
  const expiresAtSlot = BigInt(payload.expiresAtSlot);
  const slotBuffer = Buffer.alloc(8);
  slotBuffer.writeBigUInt64LE(expiresAtSlot);
  buffer.set(slotBuffer, offset);
  offset += 8;
  
  // 14. Nonce (32 bytes)
  const nonceBytes = Buffer.from(payload.nonce, 'hex');
  if (nonceBytes.length !== 32) {
    throw new Error("Nonce must be 32 bytes (64 hex characters)");
  }
  buffer.set(nonceBytes, offset);
  offset += 32;
  
  // Verify total size
  if (offset !== 308) {
    throw new Error(`Serialization error: expected 308 bytes, got ${offset}`);
  }
  
  return buffer;
}
```

### Signing Function

```typescript
import { createPrivateKey, sign } from 'node:crypto';
import { createHash } from 'node:crypto';

export function signPermitV2(
  payload: PermitPayloadV2,
  privatePEM: string
): { canonicalBytes: Buffer; signature: string; hash: string } {
  // 1. Serialize to binary
  const canonicalBytes = serializePermitV2(payload);
  
  // 2. Sign with Ed25519
  const privateKey = createPrivateKey(privatePEM);
  const signatureBuffer = sign(null, canonicalBytes, privateKey);
  const signature = signatureBuffer.toString('base64url');
  
  // 3. Hash for database storage
  const hash = createHash('sha256')
    .update(canonicalBytes)
    .digest('hex');
  
  return { canonicalBytes, signature, hash };
}
```

---

## Rust Implementation

### Deserialization Function

```rust
use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::pubkey::Pubkey;

const DOMAIN_BYTES: [u8; 30] = [
    0x6C, 0x69, 0x6C, 0x69, 0x61, 0x2E, 0x61, 0x75,
    0x74, 0x68, 0x6F, 0x72, 0x69, 0x7A, 0x61, 0x74,
    0x69, 0x6F, 0x6E, 0x2E, 0x76, 0x32, 0x00, 0x00,
    0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
];

#[derive(Debug, Clone)]
pub struct PermitDataV2 {
    pub domain: [u8; 30],
    pub version: u8,
    pub agent_registry_pda: Pubkey,
    pub agent_public_key: Pubkey,
    pub policy_pda: Pubkey,
    pub policy_version: u32,
    pub transfer_authority: Pubkey,
    pub source_token_account: Pubkey,
    pub destination_token_account: Pubkey,
    pub mint: Pubkey,
    pub mint_decimals: u8,
    pub amount: u64,
    pub expires_at_slot: u64,
    pub nonce: [u8; 32],
}

impl PermitDataV2 {
    pub const LEN: usize = 308;
    
    pub fn deserialize_from_bytes(data: &[u8]) -> Result<Self> {
        require_eq!(data.len(), Self::LEN, ErrorCode::InvalidPermitLength);
        
        let mut offset = 0;
        
        // 1. Domain separator (30 bytes)
        let mut domain = [0u8; 30];
        domain.copy_from_slice(&data[offset..offset + 30]);
        require!(domain == DOMAIN_BYTES, ErrorCode::InvalidDomain);
        offset += 30;
        
        // 2. Version (1 byte)
        let version = data[offset];
        require_eq!(version, 2, ErrorCode::InvalidVersion);
        offset += 1;
        
        // 3. Agent Registry PDA (32 bytes)
        let agent_registry_pda = Pubkey::new_from_array(
            data[offset..offset + 32].try_into().unwrap()
        );
        offset += 32;
        
        // 4. Agent Public Key (32 bytes)
        let agent_public_key = Pubkey::new_from_array(
            data[offset..offset + 32].try_into().unwrap()
        );
        offset += 32;
        
        // 5. Policy PDA (32 bytes)
        let policy_pda = Pubkey::new_from_array(
            data[offset..offset + 32].try_into().unwrap()
        );
        offset += 32;
        
        // 6. Policy Version (4 bytes, u32 LE)
        let policy_version = u32::from_le_bytes(
            data[offset..offset + 4].try_into().unwrap()
        );
        require!(policy_version >= 1, ErrorCode::InvalidPolicyVersion);
        offset += 4;
        
        // 7. Transfer Authority (32 bytes)
        let transfer_authority = Pubkey::new_from_array(
            data[offset..offset + 32].try_into().unwrap()
        );
        offset += 32;
        
        // 8. Source Token Account (32 bytes)
        let source_token_account = Pubkey::new_from_array(
            data[offset..offset + 32].try_into().unwrap()
        );
        offset += 32;
        
        // 9. Destination Token Account (32 bytes)
        let destination_token_account = Pubkey::new_from_array(
            data[offset..offset + 32].try_into().unwrap()
        );
        offset += 32;
        
        // 10. Mint (32 bytes)
        let mint = Pubkey::new_from_array(
            data[offset..offset + 32].try_into().unwrap()
        );
        offset += 32;
        
        // 11. Mint Decimals (1 byte)
        let mint_decimals = data[offset];
        require!(mint_decimals <= 18, ErrorCode::InvalidDecimals);
        offset += 1;
        
        // 12. Amount (8 bytes, u64 LE)
        let amount = u64::from_le_bytes(
            data[offset..offset + 8].try_into().unwrap()
        );
        require!(amount > 0, ErrorCode::ZeroAmount);
        offset += 8;
        
        // 13. Expires At Slot (8 bytes, u64 LE)
        let expires_at_slot = u64::from_le_bytes(
            data[offset..offset + 8].try_into().unwrap()
        );
        offset += 8;
        
        // 14. Nonce (32 bytes)
        let mut nonce = [0u8; 32];
        nonce.copy_from_slice(&data[offset..offset + 32]);
        offset += 32;
        
        // Verify we consumed all bytes
        require_eq!(offset, Self::LEN, ErrorCode::Deserialization Error);
        
        Ok(Self {
            domain,
            version,
            agent_registry_pda,
            agent_public_key,
            policy_pda,
            policy_version,
            transfer_authority,
            source_token_account,
            destination_token_account,
            mint,
            mint_decimals,
            amount,
            expires_at_slot,
            nonce,
        })
    }
}
```

---

## Validation Rules

### TypeScript Validation

```typescript
export function validatePermitV2(payload: PermitPayloadV2): void {
  // Domain
  if (payload.domain !== "lilia.authorization.v2") {
    throw new Error("Invalid domain");
  }
  
  // Version
  if (payload.version !== 2) {
    throw new Error("Invalid version");
  }
  
  // Pubkeys (will throw if invalid base58)
  new PublicKey(payload.agentRegistryPda);
  new PublicKey(payload.agentPublicKey);
  new PublicKey(payload.policyPda);
  new PublicKey(payload.transferAuthority);
  new PublicKey(payload.sourceTokenAccount);
  new PublicKey(payload.destinationTokenAccount);
  new PublicKey(payload.mint);
  
  // Policy version
  if (payload.policyVersion < 1 || payload.policyVersion > 4294967295) {
    throw new Error("Invalid policy version");
  }
  
  // Mint decimals
  if (payload.mintDecimals < 0 || payload.mintDecimals > 18) {
    throw new Error("Mint decimals must be 0-18");
  }
  
  // Amount
  const amount = BigInt(payload.amount);
  if (amount <= 0n || amount > 18446744073709551615n) {
    throw new Error("Amount must be positive and fit in u64");
  }
  
  // Slot
  const slot = BigInt(payload.expiresAtSlot);
  if (slot < 0n || slot > 18446744073709551615n) {
    throw new Error("Slot must fit in u64");
  }
  
  // Nonce
  if (!/^[0-9a-fA-F]{64}$/.test(payload.nonce)) {
    throw new Error("Nonce must be 64 hex characters (32 bytes)");
  }
}
```

### Rust Validation

```rust
impl PermitDataV2 {
    pub fn validate(&self, ctx: &Context<TransferHookExecute>) -> Result<()> {
        // Domain (already checked in deserialization)
        
        // Version (already checked in deserialization)
        
        // Expiry
        let clock = Clock::get()?;
        require!(
            clock.slot <= self.expires_at_slot,
            ErrorCode::PermitExpired
        );
        
        // Amount > 0 (already checked in deserialization)
        
        // Validate against actual transfer
        require_keys_eq!(
            self.source_token_account,
            ctx.accounts.source.key(),
            ErrorCode::SourceMismatch
        );
        require_keys_eq!(
            self.destination_token_account,
            ctx.accounts.destination.key(),
            ErrorCode::DestinationMismatch
        );
        require_keys_eq!(
            self.mint,
            ctx.accounts.mint.key(),
            ErrorCode::MintMismatch
        );
        require_eq!(
            self.mint_decimals,
            ctx.accounts.mint.decimals,
            ErrorCode::DecimalsMismatch
        );
        require_eq!(
            self.amount,
            ctx.accounts.transfer_amount,
            ErrorCode::AmountMismatch
        );
        
        Ok(())
    }
}
```

---

**Document Version:** 2.0  
**Last Updated:** November 7, 2026  
**Status:** Specification Complete  
**Next Steps:** Implement TypeScript serialization and Rust deserialization with test vectors
