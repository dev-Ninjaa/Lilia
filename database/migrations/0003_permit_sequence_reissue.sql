-- Migration 0003: allow a sequence to be reissued after a failed transfer.
--
-- `AgentRegistry.next_authorization_sequence` only advances when a transfer
-- actually lands on-chain. A permit that is issued but never consumed (the
-- client crashed, the transaction failed simulation, the permit expired) leaves
-- the counter untouched, so the next legitimate issuance reuses the same
-- sequence. The unique index from 0002 rejected that reissue with a database
-- error even though the chain would accept it.
--
-- Replay protection is enforced by the transfer hook, which requires the
-- permit's sequence to equal the on-chain counter and increments it atomically
-- with a successful transfer. The database therefore only needs a lookup index
-- for audit queries, not a uniqueness constraint.

DROP INDEX IF EXISTS permits_agent_sequence_idx;
CREATE INDEX IF NOT EXISTS permits_agent_sequence_idx
  ON authorization_permits(agent_id, sequence);
