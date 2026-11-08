import type { DemoResult } from "./demo-valid-transfer.ts";
import { buildTransfer, expectError, issuePermit, sendExpectingFailure } from "./flow.ts";
import { ensureKeypair } from "./lib.ts";

export async function run(): Promise<DemoResult> {
  const transferAuthority = ensureKeypair("transfer-authority");
  const permit = await issuePermit();
  const tamperedAmount = BigInt(permit.amount) + 1_000_000n; // +1 token at 6 decimals

  const transaction = await buildTransfer(permit, { amountOverride: tamperedAmount });
  const result = await sendExpectingFailure(transaction, transferAuthority);
  const passed = expectError(result, "AmountMismatch");
  return {
    name: "amount tampering fails with AmountMismatch",
    passed,
    detail: passed
      ? `permit authorized ${permit.amount} raw units; ${tamperedAmount} was rejected`
      : `unexpected result: ${result.text.slice(0, 400)}`,
  };
}

if (import.meta.main) {
  run()
    .then((outcome) => {
      console.log(`${outcome.passed ? "PASS" : "FAIL"}: ${outcome.name} - ${outcome.detail}`);
      process.exit(outcome.passed ? 0 : 1);
    })
    .catch((error) => {
      console.error(`Demo failed: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    });
}
