CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL DEFAULT '',
  owner_id TEXT NOT NULL, public_key TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','disabled')),
  metadata TEXT NOT NULL DEFAULT '{}', on_chain_address TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS agents_owner_idx ON agents(owner_id);
CREATE INDEX IF NOT EXISTS agents_status_idx ON agents(status);
CREATE TABLE IF NOT EXISTS policies (
  id TEXT PRIMARY KEY, agent_id TEXT NOT NULL REFERENCES agents(id), owner_id TEXT NOT NULL, name TEXT NOT NULL,
  max_transfer_amount TEXT NOT NULL, allowed_recipients TEXT NOT NULL DEFAULT '[]',
  blocked_recipients TEXT NOT NULL DEFAULT '[]', allowed_mint TEXT, is_active INTEGER NOT NULL DEFAULT 1,
  expires_at TEXT, policy_version INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS policies_owner_idx ON policies(owner_id);
CREATE INDEX IF NOT EXISTS policies_agent_idx ON policies(agent_id);
CREATE INDEX IF NOT EXISTS policies_active_idx ON policies(is_active);
CREATE TABLE IF NOT EXISTS risk_assessments (
  id TEXT PRIMARY KEY, agent_id TEXT NOT NULL REFERENCES agents(id), policy_id TEXT NOT NULL REFERENCES policies(id),
  transaction_details TEXT NOT NULL, risk_score INTEGER NOT NULL, risk_level TEXT NOT NULL,
  approved INTEGER NOT NULL, reasons TEXT NOT NULL, risk_provider TEXT NOT NULL DEFAULT 'deterministic',
  policy_version INTEGER NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS assessments_agent_idx ON risk_assessments(agent_id);
CREATE INDEX IF NOT EXISTS assessments_policy_idx ON risk_assessments(policy_id);
CREATE TABLE IF NOT EXISTS authorization_permits (
  id TEXT PRIMARY KEY, agent_id TEXT NOT NULL REFERENCES agents(id), policy_id TEXT NOT NULL REFERENCES policies(id),
  assessment_id TEXT NOT NULL REFERENCES risk_assessments(id), permit_hash TEXT NOT NULL UNIQUE,
  signed_payload TEXT NOT NULL, signature TEXT NOT NULL, signer_public_key TEXT NOT NULL,
  expires_at TEXT NOT NULL, status TEXT NOT NULL CHECK(status IN ('issued','consumed','expired','revoked')),
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS permits_assessment_idx ON authorization_permits(assessment_id);
CREATE INDEX IF NOT EXISTS permits_agent_idx ON authorization_permits(agent_id);
CREATE TABLE IF NOT EXISTS transactions (
  id TEXT PRIMARY KEY, agent_id TEXT NOT NULL REFERENCES agents(id), policy_id TEXT NOT NULL REFERENCES policies(id),
  permit_id TEXT REFERENCES authorization_permits(id), sender TEXT NOT NULL, recipient TEXT NOT NULL, mint TEXT NOT NULL,
  amount TEXT NOT NULL, status TEXT NOT NULL, transaction_signature TEXT, failure_reason TEXT,
  created_at TEXT NOT NULL, updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS transactions_agent_idx ON transactions(agent_id);
CREATE INDEX IF NOT EXISTS transactions_status_idx ON transactions(status);
CREATE INDEX IF NOT EXISTS transactions_permit_idx ON transactions(permit_id);
CREATE INDEX IF NOT EXISTS transactions_signature_idx ON transactions(transaction_signature);
CREATE TABLE IF NOT EXISTS security_events (
  id TEXT PRIMARY KEY, agent_id TEXT REFERENCES agents(id), transaction_id TEXT REFERENCES transactions(id),
  event_type TEXT NOT NULL, severity TEXT NOT NULL, description TEXT NOT NULL, metadata TEXT NOT NULL DEFAULT '{}',
  source TEXT NOT NULL DEFAULT 'backend', created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS events_agent_idx ON security_events(agent_id);
CREATE INDEX IF NOT EXISTS events_transaction_idx ON security_events(transaction_id);
CREATE INDEX IF NOT EXISTS events_created_idx ON security_events(created_at);
CREATE INDEX IF NOT EXISTS events_type_idx ON security_events(event_type);
CREATE INDEX IF NOT EXISTS events_severity_idx ON security_events(severity);
CREATE TABLE IF NOT EXISTS simulations (
  id TEXT PRIMARY KEY, agent_id TEXT NOT NULL REFERENCES agents(id), policy_id TEXT NOT NULL REFERENCES policies(id),
  input TEXT NOT NULL, result TEXT NOT NULL, status TEXT NOT NULL, created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS simulations_agent_idx ON simulations(agent_id);
CREATE INDEX IF NOT EXISTS simulations_created_idx ON simulations(created_at);
CREATE TABLE IF NOT EXISTS schema_migrations (name TEXT PRIMARY KEY, applied_at TEXT NOT NULL);
