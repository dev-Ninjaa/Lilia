use anchor_lang::prelude::*;

#[error_code]
pub enum LiliaError {
    #[msg("Permit domain is invalid")]
    InvalidDomain,
    #[msg("Permit version is not supported")]
    InvalidVersion,
    #[msg("Permit message must be exactly 308 bytes")]
    InvalidPermitLength,
    #[msg("Permit has expired")]
    PermitExpired,
    #[msg("Permit amount must be greater than zero")]
    InvalidAmount,
    #[msg("Mint decimals must be 0-18")]
    InvalidMintDecimals,
    #[msg("Transfer authority does not match the permit")]
    TransferAuthorityMismatch,
    #[msg("Source token account does not match the permit")]
    SourceMismatch,
    #[msg("Destination token account does not match the permit")]
    DestinationMismatch,
    #[msg("Mint does not match the permit")]
    MintMismatch,
    #[msg("Amount does not match the permit")]
    AmountMismatch,
    #[msg("Agent registry does not match the permit")]
    AgentRegistryMismatch,
    #[msg("Agent identity does not match the registry")]
    AgentIdentityMismatch,
    #[msg("Agent is disabled")]
    AgentDisabled,
    #[msg("Policy does not match the permit")]
    PolicyMismatch,
    #[msg("Policy is inactive or expired")]
    PolicyInactive,
    #[msg("Policy version does not match the permit")]
    PolicyVersionMismatch,
    #[msg("Amount exceeds the on-chain policy limit")]
    AmountExceedsPolicy,
    #[msg("Mint is not allowed by the policy")]
    MintNotAllowed,
    #[msg("Authorization sequence is invalid or already consumed")]
    InvalidSequence,
    #[msg("Authorization sequence overflow")]
    SequenceOverflow,
    #[msg("Ed25519 instruction is missing or malformed")]
    InvalidEd25519Instruction,
    #[msg("Ed25519 instruction must be immediately before the transfer")]
    InvalidEd25519Position,
    #[msg("Signer is not the configured Sentinel authority")]
    UnauthorizedSigner,
    #[msg("Transfer hook was called outside a Token-2022 transfer")]
    NotTransferring,
    #[msg("Extra account meta list is invalid")]
    InvalidExtraAccountMetaList,
}
