use anchor_lang::prelude::*;

/// Active on-chain policy for one transfer authority.
///
/// PDA seeds: `[b"policy", transfer_authority]`
///
/// The backend may keep policy history off-chain; on-chain there is exactly one
/// active policy per agent, replaced in place with an incremented version.
#[account]
pub struct Policy {
    /// 16-byte backend identifier (first 16 bytes of the policy UUID).
    pub policy_id: [u8; 16],
    /// Agent registry this policy belongs to.
    pub agent_registry: Pubkey,
    /// Backend owner that published the policy.
    pub owner: Pubkey,
    /// Maximum amount in base units.
    pub max_transfer_amount: u64,
    /// Allowed mint, or the all-zero pubkey for "any mint".
    pub allowed_mint: Pubkey,
    /// Whether the policy is active.
    pub is_active: bool,
    /// Monotonic policy version bound into permits.
    pub policy_version: u32,
    /// Policy expiry slot, or 0 for no expiry.
    pub expires_at_slot: u64,
    /// PDA bump.
    pub bump: u8,
}

impl Policy {
    pub const LEN: usize = 8 + 16 + 32 + 32 + 8 + 32 + 1 + 4 + 8 + 1;
}
