import { describe, expect, test } from "bun:test";
import { PERMIT_V2_DOMAIN, PERMIT_V2_LENGTH, PERMIT_V2_VERSION } from "@lilia/solana/constants.ts";
import {
  deriveTokenAccount,
  findAgentRegistry,
  findExtraAccountMetas,
  findPolicy,
  findSentinelAuthority,
} from "@lilia/solana/pda.ts";
import {
  type PermitPayloadV2,
  buildPermitNonce,
  deserializePermitV2,
  permitEntropy,
  permitSequence,
  serializePermitV2,
} from "@lilia/solana/permit.ts";
import { Keypair, PublicKey } from "@solana/web3.js";

function keypairPubkey(): PublicKey {
  return Keypair.generate().publicKey;
}

function samplePermit(overrides: Partial<PermitPayloadV2> = {}): PermitPayloadV2 {
  return {
    agentRegistryPda: keypairPubkey(),
    agentPublicKey: keypairPubkey(),
    policyPda: keypairPubkey(),
    policyVersion: 7,
    transferAuthority: keypairPubkey(),
    sourceTokenAccount: keypairPubkey(),
    destinationTokenAccount: keypairPubkey(),
    mint: keypairPubkey(),
    mintDecimals: 6,
    amount: 1_500_000n,
    expiresAtSlot: 123_456_789n,
    nonce: buildPermitNonce(42n),
    ...overrides,
  };
}

describe("Permit v2 serialization", () => {
  test("produces the canonical 308-byte layout", () => {
    const bytes = serializePermitV2(samplePermit());
    expect(bytes.length).toBe(PERMIT_V2_LENGTH);
    expect(bytes.subarray(0, PERMIT_V2_DOMAIN.length).toString("utf8")).toBe(PERMIT_V2_DOMAIN);
    expect(bytes.subarray(PERMIT_V2_DOMAIN.length, 30).every((b) => b === 0)).toBe(true);
    expect(bytes.readUInt8(30)).toBe(PERMIT_V2_VERSION);
  });

  test("round-trips every field", () => {
    const permit = samplePermit();
    const parsed = deserializePermitV2(serializePermitV2(permit));
    expect(parsed.domain).toBe(PERMIT_V2_DOMAIN);
    expect(parsed.version).toBe(PERMIT_V2_VERSION);
    expect(parsed.agentRegistryPda).toBe(new PublicKey(permit.agentRegistryPda).toBase58());
    expect(parsed.agentPublicKey).toBe(new PublicKey(permit.agentPublicKey).toBase58());
    expect(parsed.policyPda).toBe(new PublicKey(permit.policyPda).toBase58());
    expect(parsed.policyVersion).toBe(7);
    expect(parsed.transferAuthority).toBe(new PublicKey(permit.transferAuthority).toBase58());
    expect(parsed.sourceTokenAccount).toBe(new PublicKey(permit.sourceTokenAccount).toBase58());
    expect(parsed.destinationTokenAccount).toBe(
      new PublicKey(permit.destinationTokenAccount).toBase58(),
    );
    expect(parsed.mint).toBe(new PublicKey(permit.mint).toBase58());
    expect(parsed.mintDecimals).toBe(6);
    expect(parsed.amount).toBe(1_500_000n);
    expect(parsed.expiresAtSlot).toBe(123_456_789n);
    expect(parsed.sequence).toBe(42n);
  });

  test("rejects a permit of the wrong length", () => {
    expect(() => deserializePermitV2(Buffer.alloc(PERMIT_V2_LENGTH - 1))).toThrow(/308 bytes/);
  });

  test("rejects a mismatched domain", () => {
    const bytes = serializePermitV2(samplePermit());
    bytes.write("lilia.authorization.v1", 0, "utf8");
    expect(() => deserializePermitV2(bytes)).toThrow(/domain/);
  });

  test("rejects non-zero domain padding", () => {
    const bytes = serializePermitV2(samplePermit());
    bytes[PERMIT_V2_DOMAIN.length + 3] = 1;
    expect(() => deserializePermitV2(bytes)).toThrow(/padding/);
  });

  test("rejects an unsupported version", () => {
    const bytes = serializePermitV2(samplePermit());
    bytes.writeUInt8(3, 30);
    expect(() => deserializePermitV2(bytes)).toThrow(/version/);
  });

  test("rejects a zero amount", () => {
    expect(() => serializePermitV2(samplePermit({ amount: 0n }))).toThrow(/amount/);
  });

  test("rejects an amount above u64", () => {
    expect(() => serializePermitV2(samplePermit({ amount: 2n ** 64n }))).toThrow(/u64/);
  });

  test("rejects decimals above 18", () => {
    expect(() => serializePermitV2(samplePermit({ mintDecimals: 19 }))).toThrow(/mintDecimals/);
  });

  test("accepts decimal string amounts", () => {
    const parsed = deserializePermitV2(serializePermitV2(samplePermit({ amount: "250" })));
    expect(parsed.amount).toBe(250n);
  });
});

describe("Permit nonce", () => {
  test("encodes the sequence as little-endian u64 in the first 8 bytes", () => {
    const nonce = buildPermitNonce(0x0102030405060708n, new Uint8Array(24));
    expect(nonce.readBigUInt64LE(0)).toBe(0x0102030405060708n);
    expect(nonce.subarray(8).every((b) => b === 0)).toBe(true);
    expect(permitSequence(nonce)).toBe(0x0102030405060708n);
  });

  test("keeps caller-provided entropy intact", () => {
    const entropy = Uint8Array.from({ length: 24 }, (_, i) => i + 1);
    const nonce = buildPermitNonce(9n, entropy);
    expect([...permitEntropy(nonce)]).toEqual([...entropy]);
  });

  test("fills unused entropy randomly", () => {
    expect(buildPermitNonce(1n).equals(buildPermitNonce(1n))).toBe(false);
  });

  test("rejects an oversized sequence", () => {
    expect(() => buildPermitNonce(2n ** 64n)).toThrow(/u64/);
  });

  test("rejects entropy of the wrong size", () => {
    expect(() => buildPermitNonce(1n, new Uint8Array(23))).toThrow(/24 bytes/);
  });
});

describe("PDA derivation", () => {
  test("derives a deterministic sentinel authority", () => {
    expect(findSentinelAuthority().equals(findSentinelAuthority())).toBe(true);
  });

  test("derives distinct agent registries per authority", () => {
    const a = keypairPubkey();
    const b = keypairPubkey();
    expect(findAgentRegistry(a).equals(findAgentRegistry(b))).toBe(false);
    expect(findAgentRegistry(a.toBase58()).equals(findAgentRegistry(a))).toBe(true);
  });

  test("derives distinct policies per authority", () => {
    const authority = keypairPubkey();
    expect(findPolicy(authority).equals(findAgentRegistry(authority))).toBe(false);
  });

  test("derives extra account metas per mint", () => {
    const mintA = keypairPubkey();
    const mintB = keypairPubkey();
    expect(findExtraAccountMetas(mintA).equals(findExtraAccountMetas(mintA))).toBe(true);
    expect(findExtraAccountMetas(mintA).equals(findExtraAccountMetas(mintB))).toBe(false);
  });

  test("derives the associated Token-2022 account", () => {
    const mint = keypairPubkey();
    const owner = keypairPubkey();
    expect(deriveTokenAccount(mint, owner).equals(deriveTokenAccount(mint, owner))).toBe(true);
    expect(deriveTokenAccount(mint, owner).equals(deriveTokenAccount(mint, keypairPubkey()))).toBe(
      false,
    );
  });
});
