import type { DemoResult } from "./demo-valid-transfer.ts";
import {
  buildTransfer,
  expectError,
  issuePermit,
  sendExpectingFailure,
  waitForSlot,
} from "./flow.ts";
import { ensureKeypair } from "./lib.ts";

export async function run(): Promise<DemoResult> {
  const transferAuthority = ensureKeypair("transfer-authority");
  const permit = await issuePermit({ expiresInSlots: 1 });
  const expiry = Number(permit.expiresAtSlot);
  console.log(`Permit expires at slot ${expiry}; waiting for the cluster to pass it`);

  const slot = await waitForSlot(expiry);
  const transaction = await buildTransfer(permit);
  const result = await sendExpectingFailure(transaction, transferAuthority);
  const passed = expectError(result, "PermitExpired");
  return {
    name: "expired permit fails with PermitExpired",
    passed,
    detail: passed
      ? `rejected at slot ${slot} after expiry slot ${expiry}`
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
