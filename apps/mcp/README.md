# lilia-mcp

MCP server for Lilia Sentinel - connects AI assistants to the Lilia API.

## Installation

```bash
npm install -g lilia-mcp
```

## Quick Setup (Interactive)

Run the setup wizard to configure your API key:

```bash
npx lilia-mcp-setup
```

The wizard will:
1. ✨ Ask for your Lilia API key
2. 🌐 Ask for your API URL (your deployed backend)
3. ⚙️ Auto-configure Claude Desktop or Cursor/Kiro

That's it! Restart your AI assistant and you're ready to go.

## Getting Your API Key

### From the Lilia Dashboard

1. Open your deployed Lilia web dashboard
2. Click **Settings** in the sidebar (bottom of navigation)
3. You'll see your API key with "Show" and "Copy" buttons
4. Click **Copy** to copy it to your clipboard

The Settings page also shows:
- ✅ Your API URL
- ✅ Complete setup instructions
- ✅ MCP integration steps

> **Security**: Keep your API key secure! It grants full access to your Lilia instance.

## Manual Setup

If you prefer manual configuration:

### Claude Desktop

Edit config file:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "lilia": {
      "command": "npx",
      "args": ["lilia-mcp"],
      "env": {
        "LILIA_API_KEY": "your_api_key_here",
        "LILIA_API_BASE_URL": "https://your-deployed-api.com"
      }
    }
  }
}
```

### Cursor / Kiro

Create `.kiro/settings/mcp.json` in your home directory:

```json
{
  "mcpServers": {
    "lilia": {
      "command": "npx",
      "args": ["lilia-mcp"],
      "env": {
        "LILIA_API_KEY": "your_api_key_here",
        "LILIA_API_BASE_URL": "https://your-deployed-api.com"
      }
    }
  }
}
```

## Available Tools

Once configured, you can ask your AI assistant to:

| Tool | What it does |
|------|--------------|
| **evaluate_transaction** | Check if a transfer is allowed by policy |
| **request_authorization** | Get a signed permit for approved transfers |
| **prepare_transfer** | Build a Token-2022 transaction |
| **simulate_transfer** | Test a transfer off-chain |
| **get_transaction_status** | Check if a transaction completed |
| **get_agent** | View agent configuration |
| **get_policy** | Inspect policy rules |

## Usage Examples

Just ask in natural language:

```
"Can I send 100 USDC to Alice's address?"
"Show me the policy for agent xyz-123"
"What's the status of transaction 5J8Q..."
"Simulate sending 50 tokens to Bob"
```

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `LILIA_API_KEY` | ✅ Yes | - | Your API key from Settings |
| `LILIA_API_BASE_URL` | ✅ Yes | - | Your deployed API URL |
| `SOLANA_NETWORK` | ❌ No | `devnet` | Network name (informational) |

## Troubleshooting

### Error: "LILIA_API_KEY is required"

Your API key isn't configured. Run `npx lilia-mcp-setup` or check your MCP config file.

### Error: "Unable to connect to API"

Check that:
1. Your API URL is correct in the config
2. Your deployed backend is running and accessible
3. You have internet connectivity
4. The URL uses `https://` (not `http://`) for deployed instances

### Tools don't appear in your AI assistant

1. Restart your AI assistant after configuration
2. Check for errors in MCP server startup
3. Run setup again: `npx lilia-mcp-setup`
4. Verify the config file was updated correctly

### "401 Unauthorized" errors

Your API key is incorrect or expired. Get a fresh key from the Settings page.

## Development

### Test Locally

```bash
# Clone the repo
git clone https://github.com/yourusername/lilia.git
cd lilia/apps/mcp

# Install dependencies
npm install

# Build
npm run build

# Test manually
LILIA_API_KEY=test_key LILIA_API_BASE_URL=http://localhost:4000 node dist/index.js
```

## License

MIT

## Support

- **Dashboard**: Go to Settings for your API key and setup instructions
- **Issues**: [GitHub Issues](https://github.com/yourusername/lilia/issues)
- **Documentation**: [Lilia Docs](https://docs.lilia.dev)

---

Built with ❤️ by the Lilia Team
