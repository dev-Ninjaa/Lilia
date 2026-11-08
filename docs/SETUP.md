# Lilia Setup Guide

This guide walks you through setting up Lilia locally for development and testing.

## Prerequisites

- **Bun** - JavaScript runtime and package manager ([install](https://bun.sh))
- **Node.js** (optional) - For compatibility with some tools
- **Solana CLI** (optional) - For generating keypairs and managing wallets

## Quick Start

### 1. Install Dependencies

```powershell
bun install
```

### 2. Configure Environment

Copy the example environment file:

```powershell
Copy-Item .env.example .env
```

Generate signing keys for the Sentinel:

```powershell
bun run db:generate-key
```

This outputs Ed25519 PEM keys. Copy them into your `.env`:

```env
LILIA_SIGNING_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
LILIA_SIGNING_PUBLIC_KEY="-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----\n"
```

Or use the auto-configure option (creates `.env` with all keys):

```powershell
bun scripts/generate-signing-key.ts --configure-env
```

Set a secure API key in `.env`:

```env
LILIA_API_KEY=your_secure_random_key_here_at_least_24_chars
```

### 3. Set Up the Database

Run migrations to create the SQLite database:

```powershell
bun run db:migrate
```

Verify the setup:

```powershell
bun run db:inspect
```

### 4. Configure Solana (Devnet)

Add these to your `.env`:

```env
SOLANA_RPC_URL=https://api.devnet.solana.com
SOLANA_RPC_COMMITMENT=confirmed
LILIA_PROGRAM_ID=51yqX5byrtqTYt1MS2cfo98UqPskzmbdW8SEBvj3FTbz
LILIA_ADMIN_KEYPAIR_PATH=keypairs/admin-keypair.json
LILIA_PERMIT_TTL_SLOTS=300
```

### 5. Generate Wallets

Lilia needs two types of Solana keypairs:

#### Admin Keypair (for on-chain operations)

Generate an admin wallet that will sign on-chain registrations:

```powershell
bun scripts/generate-agent-keypair.ts admin-keypair
```

This creates `keypairs/admin-keypair.json` and outputs the public key.

#### Agent Keypairs (for transfers)

Generate wallets for your AI agents:

```powershell
bun scripts/generate-agent-keypair.ts my-first-agent
```

**Important:** The public key is your Solana address. Save it - you'll need it when registering agents in the web UI.

### 6. Fund Wallets with Devnet SOL

Visit **https://faucet.solana.com** and request 1-2 SOL for:
- Your admin keypair public key
- Your agent keypair public key(s)

SOL is needed to pay for transaction fees on devnet (it's free test currency).

### 7. Start the API Server

```powershell
bun run dev
```

The API runs on `http://localhost:4000`

### 8. Start the Web UI (Optional)

In a separate terminal:

```powershell
cd apps/web
bun install
bun run dev
```

The web console runs on `http://localhost:3000`

---

## Understanding Solana Keypairs

### What is a Public Key?

A **public key** IS your Solana wallet address. They're the same thing:
- **Public Key = Solana Address** - Both terms refer to the same Base58 string
- **Safe to share** - Use it to receive tokens, register agents, or identify wallets
- **Base58 encoded** - Looks like: `7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU`
- **Derived from the private key** - The keypair file contains both public and private keys

### How to Generate Keypairs

**Option 1: Using Lilia Scripts (Recommended)**

```powershell
bun scripts/generate-agent-keypair.ts agent-name
```

This generates a new keypair and saves it to `keypairs/agent-name.json`. The output shows your public key (Solana address).

**Option 2: Using Solana CLI**

```powershell
solana-keygen new --outfile agent.json
solana-keygen pubkey agent.json
```

The second command displays your public key (wallet address).

**Option 3: Connect Your Existing Solana Wallet**

If you already have a Solana wallet (Phantom, Solflare, Backpack, etc.):

1. **For devnet testing:**
   - Switch your wallet to "Devnet" network
   - Copy your wallet address - this IS your public key
   - Use this address when registering agents

2. **For signing transactions:**
   - The web wallet can sign transactions directly (if you integrate wallet adapter)
   - Or export your private key for programmatic signing

**Your wallet address and public key are the same thing.** When the form asks for "Agent Public Key", just paste your Solana wallet address.

### Keypair Format

Lilia uses the Solana CLI format - a JSON array of 64 bytes:

```json
[123, 45, 67, 89, ...]
```

- **First 32 bytes**: Private key seed
- **Last 32 bytes**: Public key

**⚠️ Keep keypair files secure!** They contain your private key. Never commit them to git.

---

## Using the System

### 1. Register an Agent

Open the web UI at `http://localhost:3000/console/agents`

- Click "Register New Agent"
- Fill in:
  - **Agent Friendly Name**: A descriptive name
  - **Unique Agent Identifier**: A unique ID (e.g., `trading-bot-01`)
  - **Agent Public Key**: The Base58 public key from your generated keypair
  - **Security Policy**: Choose a policy

### 2. Register Agent On-Chain

After creating an agent in the backend:

- Click "Register on-chain" 
- Fill in:
  - **Transfer authority**: The agent's public key (same as above)
  - **Agent identity key**: The agent's public key (can be same or different)
- Click "Register on-chain"

This creates an AgentRegistry PDA on Solana.

### 3. Create a Policy

Go to `http://localhost:3000/console/policies`

- Click "Create New Policy"
- Set spending limits and recipient restrictions
- Click "Publish on-chain" to create a Policy PDA

### 4. Execute a Transfer

Go to `http://localhost:3000/console/transfers`

Follow the 4-step flow:
1. **Evaluate** - Check if transfer meets policy
2. **Authorize** - Get a signed permit
3. **Prepare** - Build the unsigned transaction
4. **Submit** - Sign externally and submit

---

## Troubleshooting

### "Admin keypair not found"

Make sure `LILIA_ADMIN_KEYPAIR_PATH` in `.env` points to a valid keypair file:

```env
LILIA_ADMIN_KEYPAIR_PATH=keypairs/admin-keypair.json
```

### "Insufficient funds"

Fund your wallets at https://faucet.solana.com

### "Module not found @solana/web3.js"

Install dependencies:

```powershell
bun install
```

### Database errors

Reset and recreate:

```powershell
Remove-Item database/lilia.db
bun run db:migrate
```

---

## Next Steps

- Read [API.md](./API.md) for endpoint documentation
- Read [ARCHITECTURE.md](./ARCHITECTURE.md) to understand the system design
- Check `scripts/devnet/README.md` for automated testing examples

## Production Deployment

For production:
- Use environment variables instead of `.env` files
- Secure your keypairs with proper key management (AWS Secrets Manager, HashiCorp Vault, etc.)
- Use mainnet RPC endpoints with redundancy (Helius, QuickNode, or your own validator)
- Deploy the Solana program to mainnet (requires audit)
- Set up proper monitoring, alerting, and rate limiting
- Use hardware security modules (HSMs) for critical keys
- Implement proper backup and disaster recovery procedures
