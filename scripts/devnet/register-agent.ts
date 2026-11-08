import { api, ensureFunded, ensureKeypair, loadState, saveState } from "./lib.ts";

type AgentRecord = {
  id: string;
  onChainRegistryPda: string | null;
  transferAuthority: string | null;
  agentIdentityKey: string | null;
};

async function main() {
  const state = loadState();
  if (!state.agentId) {
    throw new Error("State is missing agentId. Run setup.ts first.");
  }
  const transferAuthority = ensureKeypair("transfer-authority");
  const agentIdentity = ensureKeypair("agent-identity");
  await ensureFunded(transferAuthority, 1);

  const current = await api<AgentRecord>("GET", `/api/agents/${state.agentId}`);
  if (current.onChainRegistryPda) {
    console.log(`Agent already registered: ${current.onChainRegistryPda}`);
    return;
  }

  const updated = await api<AgentRecord>("POST", `/api/agents/${state.agentId}/register-on-chain`, {
    transferAuthority: transferAuthority.publicKey.toBase58(),
    agentIdentityKey: agentIdentity.publicKey.toBase58(),
  });
  state.transferAuthority = transferAuthority.publicKey.toBase58();
  state.agentIdentityKey = agentIdentity.publicKey.toBase58();
  saveState(state);
  console.log(`AgentRegistry: ${updated.onChainRegistryPda}`);
  console.log(`Transfer authority: ${transferAuthority.publicKey.toBase58()}`);
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(
      `Register agent failed: ${error instanceof Error ? error.message : String(error)}`,
    );
    process.exit(1);
  });
}
