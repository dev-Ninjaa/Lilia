import { Transaction } from "@solana/web3.js";
import { issuePermit } from "./flow.ts";
import {
  type PermitResponse,
  TRANSFER_AMOUNT,
  api,
  ensureKeypair,
  loadState,
  solscanUrl,
} from "./lib.ts";

export type DemoResult = {
  name: string;
  passed: boolean;
  detail: string;
  signature?: string;
};

type Prepared = {
  transactionId: string;
  transaction: string;
};

type Submitted = {
  transactionId: string;
  status: string;
  signature: string | null;
  slot: string | null;
};

export async function run(): Promise<DemoResult> {
  const state = loadState();
  const transferAuthority = ensureKeypair("transfer-authority");
  const permit = await issuePermit();
  console.log(`Issued permit ${permit.id} at sequence ${permit.sequence}`);

  const prepared = await api<Prepared>("POST", "/api/transactions/prepare-v2", {
    permitId: permit.id,
    sender: permit.transferAuthority,
    recipient: state.recipient,
    mint: permit.mint,
    amount: TRANSFER_AMOUNT,
  });

  const transaction = Transaction.from(Buffer.from(prepared.transaction, "base64"));
  transaction.partialSign(transferAuthority);
  const signedTransaction = transaction
    .serialize({ requireAllSignatures: true, verifySignatures: true })
    .toString("base64");

  const submitted = await api<Submitted>("POST", "/api/transactions/submit", {
    transactionId: prepared.transactionId,
    signedTransaction,
  });

  const passed = submitted.status === "confirmed" && Boolean(submitted.signature);
  const detail = passed
    ? `confirmed in slot ${submitted.slot} (sequence ${permit.sequence})`
    : `status ${submitted.status}: ${JSON.stringify(submitted)}`;
  if (submitted.signature) console.log(`Transfer: ${solscanUrl(submitted.signature)}`);
  return {
    name: "valid transfer succeeds",
    passed,
    detail,
    signature: submitted.signature ?? undefined,
  };
}

if (import.meta.main) {
  run()
    .then((result) => {
      console.log(`${result.passed ? "PASS" : "FAIL"}: ${result.name} - ${result.detail}`);
      process.exit(result.passed ? 0 : 1);
    })
    .catch((error) => {
      console.error(`Demo failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    });
}

export type { PermitResponse };
