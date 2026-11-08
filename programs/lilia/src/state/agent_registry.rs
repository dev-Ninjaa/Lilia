use anchor_lang::prelude::*;

/// Per-transfer-authority agent state.
///
/// PDA seeds: `[b"agent", transfer_authority]`
///
/// The sequence counter is the on-chain replay guard. Every permit carries the
/// sequence it was issued for; a successful transfer increments the counter so
/// the same permit can never be used twice.
#[account]
pub struct AgentRegistry {
    /// 16-byte backend identifier (first 16 bytes of the agent UUID).
    pub agent_id: [u8; 16],
    /// Backend agent identity key bound into the permit.
    pub agent_identity_key: Pubkey,
    /// Wallet allowed to sign transfers for this agent.
    pub transfer_authority: Pubkey,
    /// Backend owner that registered the agent.
    pub owner: Pubkey,
    /// Whether the agent may currently transfer.
    pub is_active: bool,
    /// Next sequence value a permit must carry.
    pub next_authorization_sequence: u64,
    /// Slot at which the agent was registered.
    pub registered_slot: u64,
    /// PDA bump.
    pub bump: u8,
}

impl AgentRegistry {
    pub const LEN: usize = 8 + 16 + 32 + 32 + 32 + 1 + 8 + 8 + 1;
}
