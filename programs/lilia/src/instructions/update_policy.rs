use anchor_lang::prelude::*;

use crate::errors::LiliaError;
use crate::state::{AgentRegistry, Policy, SentinelAuthority};
use crate::utils::pda::{AGENT_SEED, POLICY_SEED, SENTINEL_SEED};

#[derive(Accounts)]
pub struct UpdatePolicy<'info> {
    #[account(
        mut,
        seeds = [POLICY_SEED, transfer_authority.key().as_ref()],
        bump = policy.bump
    )]
    pub policy: Account<'info, Policy>,

    #[account(
        seeds = [AGENT_SEED, transfer_authority.key().as_ref()],
        bump = agent_registry.bump
    )]
    pub agent_registry: Account<'info, AgentRegistry>,

    /// CHECK: seed component; must match the registry.
    pub transfer_authority: UncheckedAccount<'info>,

    #[account(
        seeds = [SENTINEL_SEED],
        bump = sentinel_authority.bump,
        has_one = upgrade_authority
    )]
    pub sentinel_authority: Account<'info, SentinelAuthority>,

    pub upgrade_authority: Signer<'info>,
}

#[event]
pub struct PolicyUpdated {
    pub transfer_authority: Pubkey,
    pub policy_version: u32,
    pub max_transfer_amount: u64,
    pub allowed_mint: Pubkey,
    pub expires_at_slot: u64,
    pub is_active: bool,
}

pub fn handler(
    ctx: Context<UpdatePolicy>,
    max_transfer_amount: u64,
    allowed_mint: Pubkey,
    expires_at_slot: u64,
    is_active: bool,
) -> Result<()> {
    require_keys_eq!(
        ctx.accounts.policy.agent_registry,
        ctx.accounts.agent_registry.key(),
        LiliaError::PolicyMismatch
    );
    require_keys_eq!(
        ctx.accounts.agent_registry.transfer_authority,
        ctx.accounts.transfer_authority.key(),
        LiliaError::TransferAuthorityMismatch
    );

    let policy = &mut ctx.accounts.policy;
    policy.max_transfer_amount = max_transfer_amount;
    policy.allowed_mint = allowed_mint;
    policy.expires_at_slot = expires_at_slot;
    policy.is_active = is_active;
    policy.policy_version = policy
        .policy_version
        .checked_add(1)
        .ok_or(LiliaError::SequenceOverflow)?;

    emit!(PolicyUpdated {
        transfer_authority: ctx.accounts.transfer_authority.key(),
        policy_version: policy.policy_version,
        max_transfer_amount,
        allowed_mint,
        expires_at_slot,
        is_active,
    });
    Ok(())
}
