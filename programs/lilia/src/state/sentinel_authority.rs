use anchor_lang::prelude::*;

/// Global Sentinel signing configuration.
///
/// PDA seeds: `[b"sentinel"]`
#[account]
pub struct SentinelAuthority {
    /// Ed25519 public key of the backend that signs permits.
    pub public_key: Pubkey,
    /// Authority allowed to update the Sentinel key and administer agents.
    pub upgrade_authority: Pubkey,
    /// PDA bump.
    pub bump: u8,
}

impl SentinelAuthority {
    pub const LEN: usize = 8 + 32 + 32 + 1;
}
