use anchor_lang::prelude::*;

use crate::state::SentinelAuthority;
use crate::utils::pda::SENTINEL_SEED;

#[derive(Accounts)]
pub struct UpdateSentinelPublicKey<'info> {
    #[account(
        mut,
        seeds = [SENTINEL_SEED],
        bump = sentinel_authority.bump,
        has_one = upgrade_authority
    )]
    pub sentinel_authority: Account<'info, SentinelAuthority>,

    pub upgrade_authority: Signer<'info>,
}

#[event]
pub struct SentinelKeyUpdated {
    pub old_key: Pubkey,
    pub new_key: Pubkey,
}

pub fn handler(ctx: Context<UpdateSentinelPublicKey>, new_public_key: Pubkey) -> Result<()> {
    let sentinel = &mut ctx.accounts.sentinel_authority;
    let old_key = sentinel.public_key;
    sentinel.public_key = new_public_key;

    emit!(SentinelKeyUpdated {
        old_key,
        new_key: new_public_key,
    });
    Ok(())
}
