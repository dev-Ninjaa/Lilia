import { MINT_DECIMALS, api, loadState, saveState } from "./lib.ts";

type PolicyRecord = {
  id: string;
  onChainPolicyPda: string | null;
  onChainPolicyVersion: number | null;
};

async function main() {
  const state = loadState();
  if (!state.agentId) {
    throw new Error("State is missing agentId. Run setup.ts first.");
  }
  if (!state.mint) {
    throw new Error("State is missing mint. Run setup.ts first.");
  }

  if (!state.policyId) {
    const created = await api<PolicyRecord>("POST", "/api/policies", {
      agentId: state.agentId,
      name: "Devnet transfer policy",
      maxTransferAmount: "1000",
      allowedRecipients: [state.recipient],
      blockedRecipients: [],
      allowedMint: state.mint,
      expiresAt: null,
    });
    state.policyId = created.id;
    saveState(state);
  }

  const policy = await api<PolicyRecord>("GET", `/api/policies/${state.policyId}`);
  if (policy.onChainPolicyPda) {
    console.log(
      `Policy already published: ${policy.onChainPolicyPda} (v${policy.onChainPolicyVersion})`,
    );
    return;
  }

  const updated = await api<PolicyRecord>(
    "POST",
    `/api/policies/${state.policyId}/publish-on-chain`,
    { mintDecimals: MINT_DECIMALS },
  );
  console.log(`Policy: ${updated.onChainPolicyPda} (v${updated.onChainPolicyVersion})`);
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(
      `Create policy failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  });
}
