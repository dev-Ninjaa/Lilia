import {
  TOKEN_2022_PROGRAM_ID,
  createTransferCheckedWithTransferHookInstruction,
  getMint,
} from "@solana/spl-token";
import {
  type Commitment,
  type Connection,
  Ed25519Program,
  PublicKey,
  Transaction,
  type TransactionInstruction,
} from "@solana/web3.js";
import { type PermitPayloadV2, type PubkeyLike, serializePermitV2 } from "./permit.ts";

export interface BuildPermitTransferParams {
  connection: Connection;
  permit: PermitPayloadV2;
  /** 64-byte Ed25519 signature over the 308-byte permit, produced by the Sentinel key. */
  signature: Uint8Array;
  sentinelPublicKey: PubkeyLike;
  /** Optional instructions placed before the Ed25519 precompile (e.g. ATA creation). */
  preInstructions?: TransactionInstruction[];
  feePayer?: PubkeyLike;
  recentBlockhash?: string;
  lastValidBlockHeight?: number;
  commitment?: Commitment;
}

/** Build the Ed25519 precompile instruction that carries the signed permit. */
export function buildPermitEd25519Instruction(
  permitBytes: Uint8Array,
  signature: Uint8Array,
  sentinelPublicKey: PubkeyLike,
): TransactionInstruction {
  if (signature.length !== 64) throw new Error("Permit signature must be exactly 64 bytes");
  return Ed25519Program.createInstructionWithPublicKey({
    publicKey: (sentinelPublicKey instanceof PublicKey
      ? sentinelPublicKey
      : new PublicKey(sentinelPublicKey)
    ).toBytes(),
    message: Buffer.from(permitBytes),
    signature: Buffer.from(signature),
  });
}

/**
 * Build a Token-2022 transfer transaction with the permit Ed25519 instruction
 * immediately before the transfer. The hook inspects the previous top-level
 * instruction, so no instruction may be inserted between these two.
 */
export async function buildPermitTransferTransaction(params: BuildPermitTransferParams): Promise<{
  transaction: Transaction;
  permitBytes: Buffer;
  blockhash: string;
  lastValidBlockHeight: number;
}> {
  const commitment = params.commitment ?? "confirmed";
  const permitBytes = serializePermitV2(params.permit);
  const ed25519Instruction = buildPermitEd25519Instruction(
    permitBytes,
    params.signature,
    params.sentinelPublicKey,
  );

  const transferInstruction = await createTransferCheckedWithTransferHookInstruction(
    params.connection,
    new PublicKey(params.permit.sourceTokenAccount),
    new PublicKey(params.permit.mint),
    new PublicKey(params.permit.destinationTokenAccount),
    new PublicKey(params.permit.transferAuthority),
    BigInt(params.permit.amount.toString()),
    params.permit.mintDecimals,
    [],
    commitment,
    TOKEN_2022_PROGRAM_ID,
  );

  let blockhash = params.recentBlockhash;
  let lastValidBlockHeight = params.lastValidBlockHeight;
  if (!blockhash || lastValidBlockHeight === undefined) {
    const latest = await params.connection.getLatestBlockhash(commitment);
    blockhash ??= latest.blockhash;
    lastValidBlockHeight ??= latest.lastValidBlockHeight;
  }

  const transaction = new Transaction();
  for (const instruction of params.preInstructions ?? []) transaction.add(instruction);
  transaction.add(ed25519Instruction);
  transaction.add(transferInstruction);
  transaction.feePayer = new PublicKey(params.feePayer ?? params.permit.transferAuthority);
  transaction.recentBlockhash = blockhash;
  return { transaction, permitBytes, blockhash, lastValidBlockHeight };
}

/** Serialize an unsigned (or partially signed) transaction for an API response. */
export function serializeUnsignedTransaction(transaction: Transaction): string {
  return transaction
    .serialize({ requireAllSignatures: false, verifySignatures: false })
    .toString("base64");
}

/** Submit a base64-encoded signed transaction and return its signature. */
export async function sendSignedTransaction(
  connection: Connection,
  signedTransaction: string,
  commitment: Commitment = "confirmed",
): Promise<string> {
  return connection.sendRawTransaction(Buffer.from(signedTransaction, "base64"), {
    skipPreflight: false,
    preflightCommitment: commitment,
  });
}

/** Poll for confirmation and return the signature status. */
export async function waitForSignature(
  connection: Connection,
  signature: string,
  commitment: Commitment = "confirmed",
  timeoutMs = 60_000,
) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const status = (
      await connection.getSignatureStatus(signature, {
        searchTransactionHistory: true,
      })
    ).value;
    if (status?.err) return { confirmed: false, error: status.err, slot: status.slot };
    if (status?.confirmationStatus === "confirmed" || status?.confirmationStatus === "finalized") {
      return { confirmed: true, error: null, slot: status.slot };
    }
    await new Promise((resolve) => setTimeout(resolve, 1_000));
  }
  return { confirmed: false, error: new Error("Confirmation timed out"), slot: null };
}

export async function getMintDecimals(
  connection: Connection,
  mint: PubkeyLike,
  commitment: Commitment = "confirmed",
): Promise<number> {
  const account = await getMint(
    connection,
    mint instanceof PublicKey ? mint : new PublicKey(mint),
    commitment,
    TOKEN_2022_PROGRAM_ID,
  );
  return account.decimals;
}

export async function getLatestSlot(
  connection: Connection,
  commitment: Commitment = "confirmed",
): Promise<number> {
  return connection.getSlot(commitment);
}
