# Explorer metadata (devnet)

The Solana Explorer beta reads a program's IDL and security.txt from the Solana Program
Metadata program, not from Anchor's IDL account. Publish both with the upgrade-authority key:

```bash
export PROGRAM=51yqX5byrtqTYt1MS2cfo98UqPskzmbdW8SEBvj3FTbz
npx @solana-program/program-metadata@latest write idl $PROGRAM docs/program-metadata/idl.json \
  --keypair ~/.config/solana/id.json --rpc https://api.devnet.solana.com
npx @solana-program/program-metadata@latest write security $PROGRAM docs/program-metadata/security.json \
  --keypair ~/.config/solana/id.json --rpc https://api.devnet.solana.com
```

Check `npx @solana-program/program-metadata@latest write --help` if a flag name differs in your version.
