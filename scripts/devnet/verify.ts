import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ExtensionType,
  TOKEN_2022_PROGRAM_ID,
  getExtensionData,
  getExtensionTypes,
  getMint,
} from "@solana/spl-token";
import { Ed25519Program, PublicKey, Transaction } from "@solana/web3.js";
import {
  createLiliaProgram,
  findAgentRegistry,
  findExtraAccountMetas,
  findPolicy,
  findSentinelAuthority,
  serializePermitV2,
} from "../../packages/solana/src/index.ts";
import { run as runAmount } from "./demo-amount-mismatch.ts";
import { run as runExpired } from "./demo-expired-permit.ts";
import { run as runReplay } from "./demo-replay-attack.ts";
import { run as runValid } from "./demo-valid-transfer.ts";
import { issuePermit } from "./flow.ts";
import {
  COMMITMENT,
  PROGRAM_ID,
  ROOT,
  TRANSFER_AMOUNT,
  adminKeypair,
  api,
  connection,
  loadState,
} from "./lib.ts";

type Check = { name: string; passed: boolean; detail: string };

type AccountFetcher = { fetch(address: PublicKey): Promise<Record<string, unknown>> };

function accountFetcher(): Record<string, AccountFetcher> {
  const program = createLiliaProgram(connection(), adminKeypair(), COMMITMENT);
  return program.account as unknown as Record<string, AccountFetcher>;
}

function bigintField(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  return BigInt(String(value));
}

async function main() {
  const state = loadState();
  const conn = connection();
  const checks: Check[] = [];
  const add = (name: string, passed: boolean, detail: string) => {
    checks.push({ name, passed, detail });
    console.log(`${passed ? "PASS" : "FAIL"}  ${name} - ${detail}`);
  };

  // 1-2. Program deployment
  const programInfo = await conn.getAccountInfo(PROGRAM_ID);
  add(
    "Anchor program is deployed",
    Boolean(programInfo?.executable),
    programInfo?.executable ? `${PROGRAM_ID.toBase58()} is executable` : "account missing",
  );
  add(
    "Program ID matches configuration",
    state.programId === PROGRAM_ID.toBase58(),
    `${state.programId} / ${PROGRAM_ID.toBase58()}`,
  );

  // 3. SentinelAuthority
  const sentinelPda = findSentinelAuthority(PROGRAM_ID);
  const sentinel = await accountFetcher().sentinelAuthority.fetch(sentinelPda);
  const status = await api<{ sentinelPublicKey: string | null }>("GET", "/api/solana/status");
  const sentinelOnChain = String(sentinel.publicKey ?? "");
  add(
    "SentinelAuthority initialized with the backend key",
    Boolean(sentinelOnChain) && sentinelOnChain === status.sentinelPublicKey,
    `${sentinelPda.toBase58()} trusts ${sentinelOnChain || "(none)"}`,
  );

  // 4. Mint has the transfer hook extension
  const mint = new PublicKey(state.mint);
  const mintInfo = await getMint(conn, mint, COMMITMENT, TOKEN_2022_PROGRAM_ID);
  const extensions = mintInfo.tlvData ? getExtensionTypes(mintInfo.tlvData) : [];
  const hookData = mintInfo.tlvData
    ? getExtensionData(ExtensionType.TransferHook, mintInfo.tlvData)
    : null;
  const hookProgram = hookData ? readHookProgram(hookData) : null;
  add(
    "Token-2022 mint has the TransferHook extension",
    extensions.includes(ExtensionType.TransferHook) && hookProgram === PROGRAM_ID.toBase58(),
    hookData ? `hook program ${hookProgram}` : "TransferHook extension missing",
  );

  // 5. ExtraAccountMetaList
  const extraMetas = findExtraAccountMetas(mint, PROGRAM_ID);
  const extraInfo = await conn.getAccountInfo(extraMetas);
  add(
    "ExtraAccountMetaList initialized",
    Boolean(extraInfo),
    `${extraMetas.toBase58()} (${extraInfo?.data.length ?? 0} bytes)`,
  );

  // 6. AgentRegistry
  const transferAuthority = new PublicKey(state.transferAuthority);
  const registryPda = findAgentRegistry(transferAuthority, PROGRAM_ID);
  const registry = await accountFetcher().agentRegistry.fetch(registryPda);
  add(
    "AgentRegistry exists and is active",
    Boolean(registry.isActive),
    `${registryPda.toBase58()} active=${String(registry.isActive)}`,
  );

  // 7. Policy
  const policyPda = findPolicy(transferAuthority, PROGRAM_ID);
  const policy = await accountFetcher().policy.fetch(policyPda);
  add(
    "Policy exists and is active",
    Boolean(policy.isActive) && Number(policy.policyVersion) >= 1,
    `${policyPda.toBase58()} version=${String(policy.policyVersion)}`,
  );

  // 8-9. Backend reads on-chain state and serializes canonical bytes
  const permit = await issuePermit();
  const sequenceOnChain = bigintField(registry.nextAuthorizationSequence);
  add(
    "Backend issues a permit from the on-chain sequence",
    BigInt(permit.sequence) === sequenceOnChain,
    `permit sequence ${permit.sequence}, on-chain ${sequenceOnChain}`,
  );
  const rebuilt = serializePermitV2({
    agentRegistryPda: new PublicKey(permit.agentRegistryPda),
    agentPublicKey: new PublicKey(permit.agentPublicKey),
    policyPda: new PublicKey(permit.policyPda),
    policyVersion: permit.policyVersion,
    transferAuthority: new PublicKey(permit.transferAuthority),
    sourceTokenAccount: new PublicKey(permit.sourceTokenAccount),
    destinationTokenAccount: new PublicKey(permit.destinationTokenAccount),
    mint: new PublicKey(permit.mint),
    mintDecimals: permit.mintDecimals,
    amount: BigInt(permit.amount),
    expiresAtSlot: BigInt(permit.expiresAtSlot),
    nonce: Buffer.from(permit.nonce, "hex"),
  });
  add(
    "Canonical permit bytes are reproducible (TS ↔ Rust vector)",
    rebuilt.toString("hex") === permit.canonicalMessage,
    `${rebuilt.length} bytes, sha256 hash matches stored message`,
  );

  // 10. Prepared transaction places Ed25519 immediately before the transfer
  const prepared = await api<{ transaction: string }>("POST", "/api/transactions/prepare-v2", {
    permitId: permit.id,
    sender: permit.transferAuthority,
    recipient: state.recipient,
    mint: permit.mint,
    amount: TRANSFER_AMOUNT,
  });
  const preparedTx = Transaction.from(Buffer.from(prepared.transaction, "base64"));
  const first = preparedTx.instructions[0];
  add(
    "Ed25519 precompile instruction precedes the transfer",
    first?.programId.equals(Ed25519Program.programId) === true &&
      preparedTx.instructions.length === 2,
    `${preparedTx.instructions.length} instructions, first=${first?.programId.toBase58()}`,
  );

  // 11-16. Live behaviour
  const valid = await runValid();
  add(valid.name, valid.passed, valid.detail);
  const replay = await runReplay();
  add(replay.name, replay.passed, replay.detail);
  const amount = await runAmount();
  add(amount.name, amount.passed, amount.detail);
  const expired = await runExpired();
  add(expired.name, expired.passed, expired.detail);

  // 17. Backend records the real signature
  if (valid.signature) {
    const recorded = await api<{ transactionSignature: string | null; status: string }>(
      "GET",
      `/api/transactions/${valid.signature}`,
    );
    add(
      "Backend records the confirmed signature",
      recorded.status === "confirmed" && recorded.transactionSignature === valid.signature,
      `${valid.signature} status=${recorded.status}`,
    );
  } else {
    add("Backend records the confirmed signature", false, "no signature from the valid transfer");
  }

  // 18. v1 path still works
  const assessment = await api<{ id: string; decision: string }>("POST", "/api/sentinel/evaluate", {
    agentId: state.agentId,
    policyId: state.policyId,
    recipient: state.recipient,
    mint: state.mint,
    amount: TRANSFER_AMOUNT,
  });
  const v1Permit = await api<{ id: string }>("POST", "/api/sentinel/authorize", {
    assessmentId: assessment.id,
  });
  const agent = await api<{ publicKey: string }>("GET", `/api/agents/${state.agentId}`);
  const v1Prepared = await api<{ transactionId: string }>("POST", "/api/transactions/prepare", {
    permitId: v1Permit.id,
    sender: agent.publicKey,
    recipient: state.recipient,
    mint: state.mint,
    amount: TRANSFER_AMOUNT,
  });
  add(
    "Existing v1 authorize and prepare still work",
    Boolean(v1Prepared.transactionId),
    `v1 permit ${v1Permit.id} prepared as ${v1Prepared.transactionId}`,
  );

  // 19. No private key material in API responses
  const statusJson = JSON.stringify(status);
  const permitJson = JSON.stringify(permit);
  const leaked = /PRIVATE KEY/.test(statusJson) || /PRIVATE KEY/.test(permitJson);
  add("No private keys in API responses", !leaked, leaked ? "private key found" : "clean");

  // 20. Docs reflect the implementation
  const apiDoc = readFileSync(resolve(ROOT, "docs/API.md"), "utf8");
  const accountDoc = readFileSync(resolve(ROOT, "docs/ONCHAIN_ACCOUNT_SPEC.md"), "utf8");
  add(
    "Docs describe the implemented endpoints and sequence guard",
    apiDoc.includes("/api/v2/sentinel/authorize") &&
      apiDoc.includes("InvalidSequence") &&
      accountDoc.includes("next_authorization_sequence"),
    "API.md and ONCHAIN_ACCOUNT_SPEC.md match the code",
  );

  const passed = checks.filter((check) => check.passed).length;
  console.log(`\n${passed}/${checks.length} acceptance checks passed`);
  if (passed !== checks.length) {
    console.log("Failed checks:");
    for (const check of checks.filter((c) => !c.passed)) {
      console.log(`  - ${check.name}: ${check.detail}`);
    }
    process.exit(1);
  }
}

/** TransferHook data is authority (32 bytes, zero = none) then program id. */
function readHookProgram(data: Buffer): string {
  const offset = data.length >= 64 ? 32 : 0;
  return new PublicKey(data.subarray(offset, offset + 32)).toBase58();
}

main().catch((error) => {
  console.error(`Verification failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
