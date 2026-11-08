# @lilia/mcp

MCP server exposing Lilia Sentinel tools over the Lilia REST API (stdio transport).

## Tools

| Tool | Scope | REST endpoint |
|---|---|---|
| `evaluate_transaction` | Off-chain Sentinel | `POST /api/sentinel/evaluate` |
| `request_authorization` | Permit authority (v1/v2) | `POST /api/sentinel/authorize`, `POST /api/v2/sentinel/authorize` |
| `prepare_transfer` | Blockchain prep (v1/v2) | `POST /api/transactions/prepare`, `POST /api/transactions/prepare-v2` |
| `simulate_transfer` | Simulation lab | `POST /api/simulation/run` |
| `get_transaction_status` | Observer | `GET /api/transactions/:signature` |
| `get_agent` | Registry | `GET /api/agents/:agentId` |
| `get_policy` | Policy engine | `GET /api/policies/:policyId` |

## Run

```bash
bun install            # inside apps/mcp
LILIA_API_KEY=<your key> bun run apps/mcp/src/index.ts
```

Environment:

| Var | Default | Purpose |
|---|---|---|
| `LILIA_API_KEY` | required | Bearer key for the Lilia API |
| `LILIA_API_BASE_URL` | `http://127.0.0.1:4000` | Fastify API base URL |
| `SOLANA_NETWORK` | `devnet` | Informational only |

## Claude Desktop / Cursor config

```json
{
  "mcpServers": {
    "lilia": {
      "command": "bun",
      "args": ["run", "apps/mcp/src/index.ts"],
      "env": {
        "LILIA_API_KEY": "YOUR_LILIA_API_KEY",
        "SOLANA_NETWORK": "devnet"
      }
    }
  }
}
```

Or, once published, with `bunx @lilia/mcp`. Start the API first (`bun run dev` from the repo root).
