use anchor_lang::prelude::*;

use crate::state::SentinelAuthority;
use crate::utils::pda::SENTINEL_SEED;

#[derive(Accounts)]
pub struct InitializeSentinelAuthority<'info> {
    #[account(
        init,
        payer = payer,
        space = SentinelAuthority::LEN,
        seeds = [SENTINEL_SEED],
        bump
    )]
    pub sentinel_authority: Account<'info, SentinelAuthority>,

    /// Authority allowed to rotate the Sentinel key and administer agents.
    pub upgrade_authority: Signer<'info>,

    #[account(mut)]
    pub payer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[event]
pub struct SentinelAuthorityInitialized {
    pub public_key: Pubkey,
    pub upgrade_authority: Pubkey,
}

pub fn handler(ctx: Context<InitializeSentinelAuthority>, public_key: Pubkey) -> Result<()> {
    let sentinel = &mut ctx.accounts.sentinel_authority;
    sentinel.public_key = public_key;
    sentinel.upgrade_authority = ctx.accounts.upgrade_authority.key();
    sentinel.bump = ctx.bumps.sentinel_authority;

    emit!(SentinelAuthorityInitialized {
        public_key,
        upgrade_authority: sentinel.upgrade_authority,
    });
    Ok(())
}
