export type Config = {
  apiBaseUrl: string;
  apiKey: string;
  solanaNetwork: string;
};

function readEnv(): Config {
  const apiKey = process.env.LILIA_API_KEY?.trim();
  if (!apiKey) {
    console.error(
      "[lilia-mcp] LILIA_API_KEY is required. Set it in the environment of the MCP host (Claude Desktop, Cursor, etc.).",
    );
    process.exit(1);
  }
  return {
    apiBaseUrl: process.env.LILIA_API_BASE_URL?.trim() || "http://127.0.0.1:4000",
    apiKey,
    solanaNetwork: process.env.SOLANA_NETWORK?.trim() || "devnet",
  };
}

export const config = readEnv();
