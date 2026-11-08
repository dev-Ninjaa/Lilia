use anchor_lang::prelude::*;
use solana_instruction::Instruction;

use crate::errors::LiliaError;
use crate::utils::permit::PERMIT_LEN;

/// Canonical inline layout produced by `Ed25519Program.createInstructionWithPublicKey`:
/// 16-byte header, 32-byte public key, 64-byte signature, then the message.
///
/// Header fields (little-endian): u8 num_signatures, u8 padding,
/// u16 signature_offset, u16 signature_instruction_index,
/// u16 public_key_offset, u16 public_key_instruction_index,
/// u16 message_offset, u16 message_size, u16 message_instruction_index.
const HEADER_LEN: usize = 16;
const PUBLIC_KEY_OFFSET: usize = HEADER_LEN;
const SIGNATURE_OFFSET: usize = PUBLIC_KEY_OFFSET + 32;
const MESSAGE_OFFSET: usize = SIGNATURE_OFFSET + 64;
const TOTAL_LEN: usize = MESSAGE_OFFSET + PERMIT_LEN;

/// Verify that the instruction is a canonical single-signature Ed25519
/// precompile instruction and return its message.
///
/// The precompile itself performs signature verification. This function binds
/// the message and public key to the canonical offsets so a caller cannot point
/// the precompile at unrelated bytes, and checks that the signer is the
/// configured Sentinel authority.
pub fn verify_instruction(instruction: &Instruction, sentinel_key: &Pubkey) -> Result<[u8; PERMIT_LEN]> {
    require_keys_eq!(
        instruction.program_id,
        solana_sdk_ids::ed25519_program::ID,
        LiliaError::InvalidEd25519Instruction
    );

    let data = &instruction.data;
    require!(data.len() == TOTAL_LEN, LiliaError::InvalidEd25519Instruction);

    let num_signatures = data[0];
    require_eq!(num_signatures, 1u8, LiliaError::InvalidEd25519Instruction);

    let signature_offset = u16::from_le_bytes([data[2], data[3]]) as usize;
    let signature_instruction_index = u16::from_le_bytes([data[4], data[5]]);
    let public_key_offset = u16::from_le_bytes([data[6], data[7]]) as usize;
    let public_key_instruction_index = u16::from_le_bytes([data[8], data[9]]);
    let message_offset = u16::from_le_bytes([data[10], data[11]]) as usize;
    let message_size = u16::from_le_bytes([data[12], data[13]]) as usize;
    let message_instruction_index = u16::from_le_bytes([data[14], data[15]]);

    require_eq!(
        signature_instruction_index,
        u16::MAX,
        LiliaError::InvalidEd25519Instruction
    );
    require_eq!(
        public_key_instruction_index,
        u16::MAX,
        LiliaError::InvalidEd25519Instruction
    );
    require_eq!(
        message_instruction_index,
        u16::MAX,
        LiliaError::InvalidEd25519Instruction
    );
    require_eq!(
        public_key_offset,
        PUBLIC_KEY_OFFSET,
        LiliaError::InvalidEd25519Instruction
    );
    require_eq!(
        message_offset,
        MESSAGE_OFFSET,
        LiliaError::InvalidEd25519Instruction
    );
    require_eq!(
        message_size,
        PERMIT_LEN,
        LiliaError::InvalidEd25519Instruction
    );
    require_eq!(
        signature_offset,
        SIGNATURE_OFFSET,
        LiliaError::InvalidEd25519Instruction
    );

    let public_key: [u8; 32] = data[PUBLIC_KEY_OFFSET..PUBLIC_KEY_OFFSET + 32]
        .try_into()
        .unwrap();
    require!(
        public_key == sentinel_key.to_bytes(),
        LiliaError::UnauthorizedSigner
    );

    let message: [u8; PERMIT_LEN] = data[MESSAGE_OFFSET..MESSAGE_OFFSET + PERMIT_LEN]
        .try_into()
        .unwrap();
    Ok(message)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn canonical_instruction(sentinel: &Pubkey, message: [u8; PERMIT_LEN]) -> Instruction {
        let mut data = vec![0u8; TOTAL_LEN];
        data[0] = 1;
        data[2..4].copy_from_slice(&(SIGNATURE_OFFSET as u16).to_le_bytes());
        data[4..6].copy_from_slice(&u16::MAX.to_le_bytes());
        data[6..8].copy_from_slice(&(PUBLIC_KEY_OFFSET as u16).to_le_bytes());
        data[8..10].copy_from_slice(&u16::MAX.to_le_bytes());
        data[10..12].copy_from_slice(&(MESSAGE_OFFSET as u16).to_le_bytes());
        data[12..14].copy_from_slice(&(PERMIT_LEN as u16).to_le_bytes());
        data[14..16].copy_from_slice(&u16::MAX.to_le_bytes());
        data[PUBLIC_KEY_OFFSET..PUBLIC_KEY_OFFSET + 32].copy_from_slice(&sentinel.to_bytes());
        data[MESSAGE_OFFSET..MESSAGE_OFFSET + PERMIT_LEN].copy_from_slice(&message);
        Instruction {
            program_id: solana_sdk_ids::ed25519_program::ID,
            accounts: vec![],
            data,
        }
    }

    #[test]
    fn accepts_canonical_instruction() {
        let sentinel = Pubkey::new_from_array([7u8; 32]);
        let message = [9u8; PERMIT_LEN];
        let ix = canonical_instruction(&sentinel, message);
        assert_eq!(verify_instruction(&ix, &sentinel).unwrap(), message);
    }

    #[test]
    fn rejects_wrong_signer() {
        let sentinel = Pubkey::new_from_array([7u8; 32]);
        let attacker = Pubkey::new_from_array([8u8; 32]);
        let ix = canonical_instruction(&attacker, [9u8; PERMIT_LEN]);
        assert!(verify_instruction(&ix, &sentinel).is_err());
    }

    #[test]
    fn rejects_non_canonical_offsets() {
        let sentinel = Pubkey::new_from_array([7u8; 32]);
        let mut ix = canonical_instruction(&sentinel, [9u8; PERMIT_LEN]);
        ix.data[10] = 113;
        assert!(verify_instruction(&ix, &sentinel).is_err());
    }

    #[test]
    fn rejects_wrong_program() {
        let sentinel = Pubkey::new_from_array([7u8; 32]);
        let mut ix = canonical_instruction(&sentinel, [9u8; PERMIT_LEN]);
        ix.program_id = Pubkey::new_from_array([1u8; 32]);
        assert!(verify_instruction(&ix, &sentinel).is_err());
    }
    fn from_hex(value: &str) -> Vec<u8> {
        value
            .as_bytes()
            .chunks(2)
            .map(|pair| u8::from_str_radix(std::str::from_utf8(pair).unwrap(), 16).unwrap())
            .collect()
    }

    /// Byte-for-byte vector produced by `Ed25519Program.createInstructionWithPublicKey`
    /// in @solana/web3.js. Guards the header field offsets and inline ordering.
    #[test]
    fn parses_web3js_inline_vector() {
        let data = from_hex(concat!(
            "01003000ffff1000ffff70003401ffff07070707070707070707070707070707",
            "07070707070707070707070707070707abababababababababababababababab",
            "abababababababababababababababababababababababababababababababab",
            "abababababababababababababababab09090909090909090909090909090909",
            "0909090909090909090909090909090909090909090909090909090909090909",
            "0909090909090909090909090909090909090909090909090909090909090909",
            "0909090909090909090909090909090909090909090909090909090909090909",
            "0909090909090909090909090909090909090909090909090909090909090909",
            "0909090909090909090909090909090909090909090909090909090909090909",
            "0909090909090909090909090909090909090909090909090909090909090909",
            "0909090909090909090909090909090909090909090909090909090909090909",
            "0909090909090909090909090909090909090909090909090909090909090909",
            "0909090909090909090909090909090909090909090909090909090909090909",
            "09090909",
        ));
        assert_eq!(data.len(), TOTAL_LEN);
        let ix = Instruction {
            program_id: solana_sdk_ids::ed25519_program::ID,
            accounts: vec![],
            data,
        };
        let sentinel = Pubkey::new_from_array([7u8; 32]);
        assert_eq!(verify_instruction(&ix, &sentinel).unwrap(), [9u8; PERMIT_LEN]);
    }
}
