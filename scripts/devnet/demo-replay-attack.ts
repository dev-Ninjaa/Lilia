import type { DemoResult } from "./demo-valid-transfer.ts";
import {
  buildTransfer,
  expectError,
  issuePermit,
  sendExpectingFailure,
  sendSigned,
} from "./flow.ts";
import { ensureKeypair } from "./lib.ts";

export async function run(): Promise<DemoResult> {
  const transferAuthority = ensureKeypair("transfer-authority");
  const permit = await issuePermit();

  const first = await buildTransfer(permit);
  const sent = await sendSigned(first, transferAuthority);
  console.log(`First use confirmed at sequence ${permit.sequence}: ${sent.signature}`);

  // Rebuild from the exact same permit bytes so the sequence is now stale.
  const replay = await buildTransfer(permit);
  const result = await sendExpectingFailure(replay, transferAuthority);
  const passed = expectError(result, "InvalidSequence");
  return {
    name: "replay fails with InvalidSequence",
    passed,
    detail: passed
      ? `replay rejected after sequence advanced past ${permit.sequence}`
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
