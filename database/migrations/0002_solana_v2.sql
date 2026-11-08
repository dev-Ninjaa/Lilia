-- Migration 0002: Solana v2 permit, agent registry, and policy publishing.
--
-- The v1 columns remain untouched so existing records and endpoints keep
-- working. Every new column is nullable or has a default, which lets SQLite
-- apply the migration in place without a table rewrite.

-- Agent on-chain identity. `transfer_authority` is the Solana key that signs
-- Token-2022 transfers and owns the source token account; it is also the PDA
-- seed for the AgentRegistry and Policy accounts.
ALTER TABLE agents ADD COLUMN transfer_authority TEXT;
ALTER TABLE agents ADD COLUMN agent_identity_key TEXT;
ALTER TABLE agents ADD COLUMN on_chain_registry_pda TEXT;
ALTER TABLE agents ADD COLUMN on_chain_registered_at TEXT;
ALTER TABLE agents ADD COLUMN registration_tx_signature TEXT;
ALTER TABLE agents ADD COLUMN authorization_sequence TEXT NOT NULL DEFAULT '0';

CREATE INDEX IF NOT EXISTS agents_transfer_authority_idx ON agents(transfer_authority);
CREATE UNIQUE INDEX IF NOT EXISTS agents_registry_pda_idx ON agents(on_chain_registry_pda);

-- Policy publishing metadata. `on_chain_policy_version` mirrors the Policy
-- account version, which the permit binds and the hook checks.
ALTER TABLE policies ADD COLUMN on_chain_policy_pda TEXT;
ALTER TABLE policies ADD COLUMN on_chain_policy_version INTEGER NOT NULL DEFAULT 0;
ALTER TABLE policies ADD COLUMN publish_tx_signature TEXT;
ALTER TABLE policies ADD COLUMN published_at TEXT;

CREATE INDEX IF NOT EXISTS policies_on_chain_pda_idx ON policies(on_chain_policy_pda);

-- Permit v2 fields. `signed_payload` keeps the v1 JSON payload; the canonical
-- 308-byte message is stored in `canonical_message` (hex) for audit and
-- re-verification. `sequence` and `nonce` drive replay protection.
ALTER TABLE authorization_permits ADD COLUMN permit_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE authorization_permits ADD COLUMN sequence TEXT;
ALTER TABLE authorization_permits ADD COLUMN nonce TEXT;
ALTER TABLE authorization_permits ADD COLUMN agent_registry_pda TEXT;
ALTER TABLE authorization_permits ADD COLUMN agent_public_key TEXT;
ALTER TABLE authorization_permits ADD COLUMN policy_pda TEXT;
ALTER TABLE authorization_permits ADD COLUMN policy_version INTEGER;
ALTER TABLE authorization_permits ADD COLUMN transfer_authority TEXT;
ALTER TABLE authorization_permits ADD COLUMN source_token_account TEXT;
ALTER TABLE authorization_permits ADD COLUMN destination_token_account TEXT;
ALTER TABLE authorization_permits ADD COLUMN mint TEXT;
ALTER TABLE authorization_permits ADD COLUMN mint_decimals INTEGER;
ALTER TABLE authorization_permits ADD COLUMN amount_raw TEXT;
ALTER TABLE authorization_permits ADD COLUMN expires_at_slot TEXT;
ALTER TABLE authorization_permits ADD COLUMN canonical_message TEXT;
ALTER TABLE authorization_permits ADD COLUMN consumed_at TEXT;
ALTER TABLE authorization_permits ADD COLUMN consumed_signature TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS permits_agent_sequence_idx
  ON authorization_permits(agent_id, sequence)
  WHERE sequence IS NOT NULL;
CREATE INDEX IF NOT EXISTS permits_transfer_authority_idx
  ON authorization_permits(transfer_authority);
CREATE INDEX IF NOT EXISTS permits_version_idx ON authorization_permits(permit_version);

-- Transaction v2 fields. `signed_transaction` stores the base64 wire
-- transaction the client submitted, and the blockhash window is retained so
-- the API can report expiry accurately.
ALTER TABLE transactions ADD COLUMN flow_version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE transactions ADD COLUMN blockhash TEXT;
ALTER TABLE transactions ADD COLUMN last_valid_block_height TEXT;
ALTER TABLE transactions ADD COLUMN signed_transaction TEXT;
ALTER TABLE transactions ADD COLUMN submitted_at TEXT;
ALTER TABLE transactions ADD COLUMN confirmed_at TEXT;
ALTER TABLE transactions ADD COLUMN slot TEXT;
ALTER TABLE transactions ADD COLUMN error_code TEXT;
ALTER TABLE transactions ADD COLUMN error_message TEXT;

CREATE INDEX IF NOT EXISTS transactions_flow_version_idx ON transactions(flow_version);
CREATE INDEX IF NOT EXISTS transactions_blockhash_idx ON transactions(blockhash);
