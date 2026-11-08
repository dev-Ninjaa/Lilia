use anchor_lang::prelude::*;

use crate::errors::LiliaError;
use crate::state::{AgentRegistry, Policy, SentinelAuthority};
use crate::utils::pda::{AGENT_SEED, POLICY_SEED, SENTINEL_SEED};

#[derive(Accounts)]
pub struct CreatePolicy<'info> {
    #[account(
        init,
        payer = upgrade_authority,
        space = Policy::LEN,
        seeds = [POLICY_SEED, transfer_authority.key().as_ref()],
        bump
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

    #[account(mut)]
    pub upgrade_authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[event]
pub struct PolicyCreated {
    pub transfer_authority: Pubkey,
    pub policy_id: [u8; 16],
    pub max_transfer_amount: u64,
    pub allowed_mint: Pubkey,
    pub expires_at_slot: u64,
}

pub fn handler(
    ctx: Context<CreatePolicy>,
    policy_id: [u8; 16],
    max_transfer_amount: u64,
    allowed_mint: Pubkey,
    expires_at_slot: u64,
) -> Result<()> {
    require_keys_eq!(
        ctx.accounts.agent_registry.transfer_authority,
        ctx.accounts.transfer_authority.key(),
        LiliaError::TransferAuthorityMismatch
    );

    let policy = &mut ctx.accounts.policy;
    policy.policy_id = policy_id;
    policy.agent_registry = ctx.accounts.agent_registry.key();
    policy.owner = ctx.accounts.upgrade_authority.key();
    policy.max_transfer_amount = max_transfer_amount;
    policy.allowed_mint = allowed_mint;
    policy.is_active = true;
    policy.policy_version = 1;
    policy.expires_at_slot = expires_at_slot;
    policy.bump = ctx.bumps.policy;

    emit!(PolicyCreated {
        transfer_authority: ctx.accounts.transfer_authority.key(),
        policy_id,
        max_transfer_amount,
        allowed_mint,
        expires_at_slot,
    });
    Ok(())
}
