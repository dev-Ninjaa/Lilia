import {
  TOKEN_2022_PROGRAM_ID,
  createTransferCheckedWithTransferHookInstruction,
} from "@solana/spl-token";
import {
  Ed25519Program,
  type Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  COMMITMENT,
  type PermitResponse,
  TRANSFER_AMOUNT,
  api,
  connection,
  loadState,
} from "./lib.ts";

export type IssuedPermit = PermitResponse & {
  assessmentId: string;
  signerPublicKey: string;
};

export type Assessment = {
  id: string;
  decision: "approved" | "rejected";
};

export async function issuePermit(options?: {
  amount?: string;
  recipient?: string;
  expiresInSlots?: number;
}): Promise<IssuedPermit> {
  const state = loadState();
  if (!state.agentId || !state.policyId) {
    throw new Error("State is missing agentId/policyId. Run setup.ts first.");
  }
  const assessment = await api<Assessment>("POST", "/api/sentinel/evaluate", {
    agentId: state.agentId,
    policyId: state.policyId,
    recipient: options?.recipient ?? state.recipient,
    mint: state.mint,
    amount: options?.amount ?? TRANSFER_AMOUNT,
  });
  if (assessment.decision !== "approved") {
    throw new Error(`Assessment ${assessment.id} was rejected; the demo needs an approval`);
  }
  const permit = await api<PermitResponse & { signerPublicKey: string }>(
    "POST",
    "/api/v2/sentinel/authorize",
    {
      assessmentId: assessment.id,
      ...(options?.expiresInSlots === undefined ? {} : { expiresInSlots: options.expiresInSlots }),
    },
  );
  return { ...permit, assessmentId: assessment.id };
}

/**
 * Rebuild the transfer transaction from the permit bytes. Used by the negative
 * demos, which must bypass the backend's own expiry/amount checks so the hook
 * itself is what rejects the transfer.
 */
export async function buildTransfer(
  permit: IssuedPermit,
  options?: { amountOverride?: bigint },
): Promise<Transaction> {
  const conn = connection();
  const message = Buffer.from(permit.canonicalMessage, "hex");
  const signature = Buffer.from(permit.signature, "base64url");
  const ed25519 = Ed25519Program.createInstructionWithPublicKey({
    publicKey: new PublicKey(permit.signerPublicKey).toBytes(),
    message,
    signature,
  });
  const amount = options?.amountOverride ?? BigInt(permit.amount);
  const transfer = await createTransferCheckedWithTransferHookInstruction(
    conn,
    new PublicKey(permit.sourceTokenAccount),
    new PublicKey(permit.mint),
    new PublicKey(permit.destinationTokenAccount),
    new PublicKey(permit.transferAuthority),
    amount,
    permit.mintDecimals,
    [],
    COMMITMENT,
    TOKEN_2022_PROGRAM_ID,
  );
  const transaction = new Transaction().add(ed25519, transfer);
  transaction.feePayer = new PublicKey(permit.transferAuthority);
  transaction.recentBlockhash = (await conn.getLatestBlockhash(COMMITMENT)).blockhash;
  return transaction;
}

export async function sendSigned(
  transaction: Transaction,
  signer: Keypair,
): Promise<{ signature: string; slot: number | null }> {
  const conn = connection();
  const signature = await sendAndConfirmTransaction(conn, transaction, [signer], {
    commitment: COMMITMENT,
  });
  const status = await conn.getSignatureStatus(signature);
  return { signature, slot: status.value?.slot ?? null };
}

export type FailureResult = {
  failed: boolean;
  text: string;
  logs: string[];
};

/** Send a transaction that is expected to fail and return its logs. */
export async function sendExpectingFailure(
  transaction: Transaction,
  signer: Keypair,
): Promise<FailureResult> {
  const conn = connection();
  try {
    const signature = await sendAndConfirmTransaction(conn, transaction, [signer], {
      commitment: COMMITMENT,
      skipPreflight: false,
    });
    return { failed: false, text: `unexpected success: ${signature}`, logs: [] };
  } catch (error) {
    const logs = Array.isArray((error as { logs?: unknown }).logs)
      ? ((error as { logs: string[] }).logs ?? [])
      : [];
    const message = error instanceof Error ? error.message : String(error);
    return { failed: true, text: [message, ...logs].join("\n"), logs };
  }
}

export function expectError(result: FailureResult, code: string): boolean {
  if (!result.failed) return false;
  return result.text.includes(code);
}

export async function currentSlot(): Promise<number> {
  return connection().getSlot(COMMITMENT);
}

export async function waitForSlot(target: number, timeoutMs = 30_000): Promise<number> {
  const deadline = Date.now() + timeoutMs;
  let slot = await currentSlot();
  while (slot <= target) {
    if (Date.now() > deadline) throw new Error(`Timed out waiting for slot ${target}`);
    await new Promise((resolve) => setTimeout(resolve, 500));
    slot = await currentSlot();
  }
  return slot;
}
