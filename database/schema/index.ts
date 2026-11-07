import { index, integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const agents = sqliteTable(
  "agents",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    ownerId: text("owner_id").notNull(),
    publicKey: text("public_key").notNull(),
    status: text("status", { enum: ["active", "disabled"] })
      .notNull()
      .default("active"),
    metadata: text("metadata").notNull().default("{}"),
    onChainAddress: text("on_chain_address"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("agents_owner_idx").on(table.ownerId),
    index("agents_status_idx").on(table.status),
  ],
);

export const policies = sqliteTable(
  "policies",
  {
    id: text("id").primaryKey(),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id),
    ownerId: text("owner_id").notNull(),
    name: text("name").notNull(),
    maxTransferAmount: text("max_transfer_amount").notNull(),
    allowedRecipients: text("allowed_recipients").notNull().default("[]"),
    blockedRecipients: text("blocked_recipients").notNull().default("[]"),
    allowedMint: text("allowed_mint"),
    isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
    expiresAt: text("expires_at"),
    policyVersion: integer("policy_version").notNull().default(1),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("policies_owner_idx").on(table.ownerId),
    index("policies_agent_idx").on(table.agentId),
    index("policies_active_idx").on(table.isActive),
  ],
);

export const assessments = sqliteTable(
  "risk_assessments",
  {
    id: text("id").primaryKey(),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id),
    policyId: text("policy_id")
      .notNull()
      .references(() => policies.id),
    transactionDetails: text("transaction_details").notNull(),
    riskScore: integer("risk_score").notNull(),
    riskLevel: text("risk_level", { enum: ["low", "medium", "high", "critical"] }).notNull(),
    approved: integer("approved", { mode: "boolean" }).notNull(),
    reasons: text("reasons").notNull(),
    riskProvider: text("risk_provider", { enum: ["deterministic", "gemini"] }).notNull(),
    policyVersion: integer("policy_version").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("assessments_agent_idx").on(table.agentId),
    index("assessments_policy_idx").on(table.policyId),
  ],
);

export const permits = sqliteTable(
  "authorization_permits",
  {
    id: text("id").primaryKey(),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id),
    policyId: text("policy_id")
      .notNull()
      .references(() => policies.id),
    assessmentId: text("assessment_id")
      .notNull()
      .references(() => assessments.id),
    permitHash: text("permit_hash").notNull(),
    signedPayload: text("signed_payload").notNull(),
    signature: text("signature").notNull(),
    signerPublicKey: text("signer_public_key").notNull(),
    expiresAt: text("expires_at").notNull(),
    status: text("status", { enum: ["issued", "consumed", "expired", "revoked"] }).notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("permits_assessment_idx").on(table.assessmentId),
    index("permits_agent_idx").on(table.agentId),
    uniqueIndex("permits_hash_idx").on(table.permitHash),
  ],
);

export const transactions = sqliteTable(
  "transactions",
  {
    id: text("id").primaryKey(),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id),
    policyId: text("policy_id")
      .notNull()
      .references(() => policies.id),
    permitId: text("permit_id").references(() => permits.id),
    sender: text("sender").notNull(),
    recipient: text("recipient").notNull(),
    mint: text("mint").notNull(),
    amount: text("amount").notNull(),
    status: text("status").notNull(),
    transactionSignature: text("transaction_signature"),
    failureReason: text("failure_reason"),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    index("transactions_agent_idx").on(table.agentId),
    index("transactions_status_idx").on(table.status),
    index("transactions_permit_idx").on(table.permitId),
    index("transactions_signature_idx").on(table.transactionSignature),
  ],
);

export const securityEvents = sqliteTable(
  "security_events",
  {
    id: text("id").primaryKey(),
    agentId: text("agent_id").references(() => agents.id),
    transactionId: text("transaction_id").references(() => transactions.id),
    eventType: text("event_type").notNull(),
    severity: text("severity", { enum: ["info", "low", "medium", "high", "critical"] }).notNull(),
    description: text("description").notNull(),
    metadata: text("metadata").notNull().default("{}"),
    source: text("source", { enum: ["backend", "blockchain"] })
      .notNull()
      .default("backend"),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("events_agent_idx").on(table.agentId),
    index("events_transaction_idx").on(table.transactionId),
    index("events_created_idx").on(table.createdAt),
    index("events_type_idx").on(table.eventType),
    index("events_severity_idx").on(table.severity),
  ],
);

export const simulations = sqliteTable(
  "simulations",
  {
    id: text("id").primaryKey(),
    agentId: text("agent_id")
      .notNull()
      .references(() => agents.id),
    policyId: text("policy_id")
      .notNull()
      .references(() => policies.id),
    input: text("input").notNull(),
    result: text("result").notNull(),
    status: text("status").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    index("simulations_agent_idx").on(table.agentId),
    index("simulations_created_idx").on(table.createdAt),
  ],
);

export const schema = {
  agents,
  policies,
  assessments,
  permits,
  transactions,
  securityEvents,
  simulations,
};
