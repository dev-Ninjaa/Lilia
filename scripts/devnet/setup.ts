import { findSentinelAuthority } from "@lilia/solana/index.ts";
import { PublicKey } from "@solana/web3.js";
import {
  API_URL,
  type DevnetState,
  MINT_DECIMALS,
  MINT_SUPPLY,
  PROGRAM_ID,
  TRANSFER_AMOUNT,
  adminKeypair,
  api,
  clusterLabel,
  connection,
  createHookMint,
  ensureAta,
  ensureFunded,
  ensureKeypair,
  initializeExtraMetas,
  loadState,
  requireApi,
  saveState,
} from "./lib.ts";

type AgentRecord = {
  id: string;
  onChainRegistryPda: string | null;
  transferAuthority: string | null;
};

type PolicyRecord = {
  id: string;
  onChainPolicyPda: string | null;
  onChainPolicyVersion: number | null;
};

type SolanaStatus = {
  configured: boolean;
  programId: string;
  sentinelPublicKey: string | null;
  adminConfigured: boolean;
  latestSlot: number | null;
};

async function main() {
  await requireApi();
  const conn = connection();
  const admin = adminKeypair();
  console.log(`Cluster:   ${clusterLabel()} (${API_URL})`);
  console.log(`Admin:     ${admin.publicKey.toBase58()}`);
  console.log(`Program:   ${PROGRAM_ID.toBase58()}`);

  const balance = await ensureFunded(admin);
  console.log(`Balance:   ${(balance / 1_000_000_000).toFixed(3)} SOL`);

  const programInfo = await conn.getAccountInfo(PROGRAM_ID);
  if (!programInfo?.executable) {
    throw new Error(
      `Program ${PROGRAM_ID.toBase58()} is not deployed on ${clusterLabel()}. Run: anchor deploy --provider.cluster ${clusterLabel()}`,
    );
  }

  const status = await api<SolanaStatus>("GET", "/api/solana/status");
  if (!status.configured) {
    throw new Error("Backend reports Solana as unconfigured. Check SOLANA_RPC_URL.");
  }
  if (!status.sentinelPublicKey) {
    throw new Error("Backend could not derive a Sentinel public key. Check the signing key.");
  }

  const sentinelPda = findSentinelAuthority(PROGRAM_ID);
  if (!(await conn.getAccountInfo(sentinelPda))) {
    console.log("Initializing SentinelAuthority...");
    const result = await api<{ signature: string }>("POST", "/api/solana/sentinel/initialize", {
      publicKey: status.sentinelPublicKey,
    });
    console.log(`  sentinel: ${result.signature}`);
  } else {
    console.log("SentinelAuthority: already initialized");
  }

  const transferAuthority = ensureKeypair("transfer-authority");
  const agentIdentity = ensureKeypair("agent-identity");
  const recipient = ensureKeypair("recipient");
  await ensureFunded(transferAuthority, 1);
  console.log(`Transfer authority: ${transferAuthority.publicKey.toBase58()}`);
  console.log(`Recipient:          ${recipient.publicKey.toBase58()}`);

  const state: DevnetState = loadStateOrInit({
    cluster: clusterLabel(),
    programId: PROGRAM_ID.toBase58(),
    mint: "",
    mintDecimals: MINT_DECIMALS,
    transferAuthority: transferAuthority.publicKey.toBase58(),
    agentIdentityKey: agentIdentity.publicKey.toBase58(),
    recipient: recipient.publicKey.toBase58(),
    sentinelAuthority: sentinelPda.toBase58(),
  });

  if (!state.mint) {
    console.log("Creating Token-2022 mint with the Lilia transfer hook...");
    const mint = await createHookMint({
      payer: admin,
      mintAuthority: admin.publicKey,
      decimals: MINT_DECIMALS,
    });
    state.mint = mint.toBase58();
    saveState(state);
    console.log(`  mint: ${state.mint}`);
  } else {
    console.log(`Mint: ${state.mint}`);
  }
  const mint = new PublicKey(state.mint);

  await ensureAta({
    payer: admin,
    mint,
    owner: transferAuthority.publicKey,
    mintAuthority: admin,
    supply: MINT_SUPPLY,
  });
  await ensureAta({
    payer: admin,
    mint,
    owner: recipient.publicKey,
    mintAuthority: admin,
  });
  console.log("Token accounts ready (transfer authority funded, recipient empty)");

  const extraMetas = await initializeExtraMetas({ payer: admin, mint });
  state.extraMetas = extraMetas.toBase58();
  saveState(state);
  console.log(`ExtraAccountMetaList: ${state.extraMetas}`);

  if (!state.agentId) {
    const agent = await api<AgentRecord>("POST", "/api/agents/register", {
      name: "Devnet demo agent",
      description: "Agent used by the local/Devnet transfer-hook acceptance run.",
      publicKey: transferAuthority.publicKey.toBase58(),
      metadata: { cluster: clusterLabel() },
    });
    state.agentId = agent.id;
    saveState(state);
  }
  const agent = await api<AgentRecord>("GET", `/api/agents/${state.agentId}`);
  if (!agent.onChainRegistryPda) {
    console.log("Registering agent on-chain...");
    const updated = await api<AgentRecord>(
      "POST",
      `/api/agents/${state.agentId}/register-on-chain`,
      {
        transferAuthority: transferAuthority.publicKey.toBase58(),
        agentIdentityKey: agentIdentity.publicKey.toBase58(),
      },
    );
    console.log(`  registry: ${updated.onChainRegistryPda}`);
  } else {
    console.log(`AgentRegistry: ${agent.onChainRegistryPda}`);
  }

  if (!state.policyId) {
    const policy = await api<PolicyRecord>("POST", "/api/policies", {
      agentId: state.agentId,
      name: "Devnet transfer policy",
      maxTransferAmount: "1000",
      allowedRecipients: [recipient.publicKey.toBase58()],
      blockedRecipients: [],
      allowedMint: state.mint,
      expiresAt: null,
    });
    state.policyId = policy.id;
    saveState(state);
  }
  const policy = await api<PolicyRecord>("GET", `/api/policies/${state.policyId}`);
  if (!policy.onChainPolicyPda) {
    console.log("Publishing policy on-chain...");
    const updated = await api<PolicyRecord>(
      "POST",
      `/api/policies/${state.policyId}/publish-on-chain`,
      { mintDecimals: MINT_DECIMALS },
    );
    console.log(`  policy: ${updated.onChainPolicyPda} (v${updated.onChainPolicyVersion})`);
  } else {
    console.log(`Policy: ${policy.onChainPolicyPda} (v${policy.onChainPolicyVersion})`);
  }

  console.log("\nSetup complete. State written to .devnet/state.json");
  console.log(`  agentId:  ${state.agentId}`);
  console.log(`  policyId: ${state.policyId}`);
  console.log(`  mint:     ${state.mint}`);
  console.log(`  amount:   ${TRANSFER_AMOUNT} tokens per demo transfer`);
}

function loadStateOrInit(fallback: DevnetState): DevnetState {
  try {
    const existing = loadState();
    if (existing.programId !== fallback.programId) {
      throw new Error(
        `Existing state targets program ${existing.programId}, expected ${fallback.programId}. Remove .devnet/ to start over.`,
      );
    }
    return existing;
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Missing ")) {
      saveState(fallback);
      return fallback;
    }
    throw error;
  }
}

if (import.meta.main) {
  main().catch((error) => {
    console.error(`\nSetup failed: ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  });
}
