use anchor_lang::prelude::*;

use crate::errors::LiliaError;

/// Exact Permit v2 canonical message length.
pub const PERMIT_LEN: usize = 308;
/// Domain string, null-padded to 30 bytes.
pub const DOMAIN: &[u8] = b"lilia.authorization.v2";
pub const DOMAIN_FIELD_LEN: usize = 30;
pub const PERMIT_VERSION: u8 = 2;
pub const MAX_MINT_DECIMALS: u8 = 18;

/// Parsed Permit v2 canonical message.
///
/// Layout (little-endian integers):
/// 0..30 domain, 30 version, 31..63 agent registry PDA,
/// 63..95 agent identity, 95..127 policy PDA, 127..131 policy version,
/// 131..163 transfer authority, 163..195 source token account,
/// 195..227 destination token account, 227..259 mint, 259 mint decimals,
/// 260..268 amount, 268..276 expiry slot, 276..308 nonce.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct PermitDataV2 {
    pub domain: [u8; DOMAIN_FIELD_LEN],
    pub version: u8,
    pub agent_registry_pda: Pubkey,
    pub agent_identity_key: Pubkey,
    pub policy_pda: Pubkey,
    pub policy_version: u32,
    pub transfer_authority: Pubkey,
    pub source_token_account: Pubkey,
    pub destination_token_account: Pubkey,
    pub mint: Pubkey,
    pub mint_decimals: u8,
    pub amount: u64,
    pub expires_at_slot: u64,
    pub nonce: [u8; 32],
}

impl PermitDataV2 {
    pub fn deserialize(data: &[u8]) -> Result<Self> {
        require!(data.len() == PERMIT_LEN, LiliaError::InvalidPermitLength);

        let mut domain = [0u8; DOMAIN_FIELD_LEN];
        domain.copy_from_slice(&data[0..DOMAIN_FIELD_LEN]);
        require!(
            domain[..DOMAIN.len()] == *DOMAIN,
            LiliaError::InvalidDomain
        );
        require!(
            domain[DOMAIN.len()..].iter().all(|byte| *byte == 0),
            LiliaError::InvalidDomain
        );

        let version = data[30];
        require!(version == PERMIT_VERSION, LiliaError::InvalidVersion);

        let mint_decimals = data[259];
        require!(
            mint_decimals <= MAX_MINT_DECIMALS,
            LiliaError::InvalidMintDecimals
        );

        let amount = u64::from_le_bytes(data[260..268].try_into().unwrap());
        require!(amount > 0, LiliaError::InvalidAmount);

        Ok(Self {
            domain,
            version,
            agent_registry_pda: pubkey_at(data, 31),
            agent_identity_key: pubkey_at(data, 63),
            policy_pda: pubkey_at(data, 95),
            policy_version: u32::from_le_bytes(data[127..131].try_into().unwrap()),
            transfer_authority: pubkey_at(data, 131),
            source_token_account: pubkey_at(data, 163),
            destination_token_account: pubkey_at(data, 195),
            mint: pubkey_at(data, 227),
            mint_decimals,
            amount,
            expires_at_slot: u64::from_le_bytes(data[268..276].try_into().unwrap()),
            nonce: data[276..308].try_into().unwrap(),
        })
    }

    /// Authorization sequence is the first 8 bytes of the nonce.
    pub fn sequence(&self) -> u64 {
        u64::from_le_bytes(self.nonce[0..8].try_into().unwrap())
    }

    /// 24-byte random entropy following the sequence.
    pub fn entropy(&self) -> &[u8] {
        &self.nonce[8..32]
    }
}

fn pubkey_at(data: &[u8], offset: usize) -> Pubkey {
    Pubkey::new_from_array(data[offset..offset + 32].try_into().unwrap())
}

#[cfg(test)]
mod tests {
    use super::*;

    fn minimal_permit() -> [u8; PERMIT_LEN] {
        let mut data = [0u8; PERMIT_LEN];
        data[..DOMAIN.len()].copy_from_slice(DOMAIN);
        data[30] = PERMIT_VERSION;
        data[127..131].copy_from_slice(&1u32.to_le_bytes());
        data[259] = 0;
        data[260..268].copy_from_slice(&1u64.to_le_bytes());
        data[268..276].copy_from_slice(&1u64.to_le_bytes());
        data
    }

    #[test]
    fn parses_minimal_permit() {
        let permit = PermitDataV2::deserialize(&minimal_permit()).unwrap();
        assert_eq!(permit.version, 2);
        assert_eq!(permit.policy_version, 1);
        assert_eq!(permit.amount, 1);
        assert_eq!(permit.expires_at_slot, 1);
        assert_eq!(permit.sequence(), 0);
        assert_eq!(permit.entropy(), &[0u8; 24]);
    }

    #[test]
    fn rejects_wrong_length() {
        assert!(PermitDataV2::deserialize(&[0u8; 307]).is_err());
        assert!(PermitDataV2::deserialize(&[0u8; 309]).is_err());
    }

    #[test]
    fn rejects_bad_domain() {
        let mut data = minimal_permit();
        data[0] = b'X';
        assert!(PermitDataV2::deserialize(&data).is_err());
    }

    #[test]
    fn rejects_bad_version() {
        let mut data = minimal_permit();
        data[30] = 1;
        assert!(PermitDataV2::deserialize(&data).is_err());
    }

    #[test]
    fn rejects_zero_amount() {
        let mut data = minimal_permit();
        data[260..268].copy_from_slice(&0u64.to_le_bytes());
        assert!(PermitDataV2::deserialize(&data).is_err());
    }

    #[test]
    fn rejects_excessive_decimals() {
        let mut data = minimal_permit();
        data[259] = 19;
        assert!(PermitDataV2::deserialize(&data).is_err());
    }

    #[test]
    fn parses_sequence_from_nonce() {
        let mut data = minimal_permit();
        data[276..284].copy_from_slice(&42u64.to_le_bytes());
        let permit = PermitDataV2::deserialize(&data).unwrap();
        assert_eq!(permit.sequence(), 42);
    }

    fn from_hex(value: &str) -> Vec<u8> {
        value
            .as_bytes()
            .chunks(2)
            .map(|pair| u8::from_str_radix(std::str::from_utf8(pair).unwrap(), 16).unwrap())
            .collect()
    }

    /// Byte-identical vector produced by the TypeScript serializer. Guards the
    /// cross-language canonical encoding contract.
    #[test]
    fn parses_typescript_canonical_vector() {
        let bytes = from_hex(concat!(
            "6c696c69612e617574686f72697a6174696f6e2e763200000000000000000201",
            "0101010101010101010101010101010101010101010101010101010101010102",
            "0202020202020202020202020202020202020202020202020202020202020203",
            "0303030303030303030303030303030303030303030303030303030303030304",
            "0302010404040404040404040404040404040404040404040404040404040404",
            "0404040505050505050505050505050505050505050505050505050505050505",
            "0505050606060606060606060606060606060606060606060606060606060606",
            "0606060707070707070707070707070707070707070707070707070707070707",
            "0707070608070605040302011817161514131211282726252423222131323334",
            "35363738393a3b3c3d3e3f404142434445464748",
        ));
        assert_eq!(bytes.len(), PERMIT_LEN);
        let permit = PermitDataV2::deserialize(&bytes).unwrap();
        assert_eq!(permit.version, 2);
        assert_eq!(permit.agent_registry_pda.to_bytes(), [1u8; 32]);
        assert_eq!(permit.agent_identity_key.to_bytes(), [2u8; 32]);
        assert_eq!(permit.policy_pda.to_bytes(), [3u8; 32]);
        assert_eq!(permit.policy_version, 0x0102_0304);
        assert_eq!(permit.transfer_authority.to_bytes(), [4u8; 32]);
        assert_eq!(permit.source_token_account.to_bytes(), [5u8; 32]);
        assert_eq!(permit.destination_token_account.to_bytes(), [6u8; 32]);
        assert_eq!(permit.mint.to_bytes(), [7u8; 32]);
        assert_eq!(permit.mint_decimals, 6);
        assert_eq!(permit.amount, 0x0102_0304_0506_0708);
        assert_eq!(permit.expires_at_slot, 0x1112_1314_1516_1718);
        assert_eq!(permit.sequence(), 0x2122_2324_2526_2728);
        assert_eq!(
            permit.entropy(),
            &[
                0x31, 0x32, 0x33, 0x34, 0x35, 0x36, 0x37, 0x38, 0x39, 0x3a, 0x3b, 0x3c, 0x3d, 0x3e,
                0x3f, 0x40, 0x41, 0x42, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48,
            ]
        );
    }
}
