import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import {
  findAgentRegistry,
  findExtraAccountMetas,
  findPolicy,
  findSentinelAuthority,
} from "../../packages/solana/src/index.ts";
import { PROGRAM_ID, api, connection, loadState } from "./lib.ts";

/**
 * The program has no close instructions: replay protection is a counter inside
 * AgentRegistry, so there are no per-transfer accounts to reclaim. Cleanup
 * therefore disables the demo agent and reports the rent that stays locked in
 * the persistent accounts.
 */
async function main() {
  const state = loadState();
  const conn = connection();
  const transferAuthority = new PublicKey(state.transferAuthority);
  const accounts = [
    ["SentinelAuthority", findSentinelAuthority(PROGRAM_ID)],
    ["AgentRegistry", findAgentRegistry(transferAuthority, PROGRAM_ID)],
    ["Policy", findPolicy(transferAuthority, PROGRAM_ID)],
    ["ExtraAccountMetaList", findExtraAccountMetas(new PublicKey(state.mint), PROGRAM_ID)],
  ] as const;

  if (process.argv.includes("--disable") && state.agentId) {
    await api("POST", `/api/agents/${state.agentId}/status-on-chain`, { isActive: false });
    console.log("Agent disabled on-chain.");
  }

  let total = 0;
  console.log("Persistent accounts (no per-transfer accounts exist):");
  for (const [label, address] of accounts) {
    const balance = await conn.getBalance(address);
    total += balance;
    console.log(
      `  ${label.padEnd(20)} ${address.toBase58()}  ${(balance / LAMPORTS_PER_SOL).toFixed(6)} SOL`,
    );
  }
  console.log(`  ${"total".padEnd(20)} ${(total / LAMPORTS_PER_SOL).toFixed(6)} SOL locked`);
  console.log("\nNothing to close or reclaim; remove .devnet/ to start a new demo run.");
}

main().catch((error) => {
  console.error(`Cleanup failed: ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
