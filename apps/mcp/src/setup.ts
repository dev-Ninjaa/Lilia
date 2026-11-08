#!/usr/bin/env node
/**
 * Interactive setup script for lilia-mcp
 * Prompts for API key and configures MCP clients
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir, platform } from "node:os";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const rl = createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(prompt: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

function getConfigPaths() {
  const home = homedir();
  const isWindows = platform() === "win32";

  return {
    claude: isWindows
      ? join(process.env.APPDATA || "", "Claude", "claude_desktop_config.json")
      : join(home, "Library", "Application Support", "Claude", "claude_desktop_config.json"),
    cursor: join(home, ".kiro", "settings", "mcp.json"),
    kiro: join(home, ".kiro", "settings", "mcp.json"),
  };
}

function updateConfig(path: string, apiKey: string, apiUrl: string) {
  try {
    // Ensure directory exists
    const dir = dirname(path);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    // Read existing config or create new
    let config: Record<string, unknown> = {};
    if (existsSync(path)) {
      const content = readFileSync(path, "utf-8");
      const parsed: unknown = JSON.parse(content);
      if (!isRecord(parsed)) {
        throw new Error("MCP client configuration must be a JSON object.");
      }
      config = parsed;
    }

    // Ensure mcpServers exists
    const configuredServers = config.mcpServers;
    if (configuredServers !== undefined && !isRecord(configuredServers)) {
      throw new Error('MCP client configuration "mcpServers" must be a JSON object.');
    }
    const mcpServers = configuredServers ?? {};
    config.mcpServers = mcpServers;

    // Add/update lilia server
    mcpServers.lilia = {
      command: "npx",
      args: ["lilia-mcp"],
      env: {
        LILIA_API_KEY: apiKey,
        LILIA_API_BASE_URL: apiUrl,
        SOLANA_NETWORK: "devnet",
      },
    };

    // Write config
    writeFileSync(path, JSON.stringify(config, null, 2), "utf-8");
    return true;
  } catch (error) {
    console.error(`Failed to update ${path}:`, error);
    return false;
  }
}

async function main() {
  console.log("\n🚀 Lilia MCP Setup\n");
  console.log("This script will configure lilia-mcp for your MCP client.\n");

  // Get API key
  const apiKey = await question("Enter your Lilia API key: ");
  if (!apiKey || apiKey.trim().length < 20) {
    console.error("❌ Invalid API key. Please provide a valid key.");
    rl.close();
    process.exit(1);
  }

  // Get API URL
  const defaultUrl = "https://api.yourdomain.com";
  const apiUrl =
    (await question(`Enter your Lilia API URL (default: ${defaultUrl}): `)) || defaultUrl;

  // Ask which client to configure
  console.log("\nWhich MCP client would you like to configure?");
  console.log("1. Claude Desktop");
  console.log("2. Cursor / Kiro IDE");
  console.log("3. Both");
  console.log("4. Show manual config (don't auto-configure)");

  const choice = await question("\nYour choice (1-4): ");

  const paths = getConfigPaths();
  const manualConfig = {
    mcpServers: {
      lilia: {
        command: "npx",
        args: ["lilia-mcp"],
        env: {
          LILIA_API_KEY: apiKey,
          LILIA_API_BASE_URL: apiUrl,
          SOLANA_NETWORK: "devnet",
        },
      },
    },
  };

  switch (choice.trim()) {
    case "1":
      if (updateConfig(paths.claude, apiKey, apiUrl)) {
        console.log(`\n✅ Claude Desktop configured at: ${paths.claude}`);
        console.log("   Please restart Claude Desktop for changes to take effect.\n");
      }
      break;

    case "2":
      if (updateConfig(paths.cursor, apiKey, apiUrl)) {
        console.log(`\n✅ Cursor/Kiro configured at: ${paths.cursor}`);
        console.log("   Please restart your IDE for changes to take effect.\n");
      }
      break;

    case "3": {
      let success = 0;
      if (updateConfig(paths.claude, apiKey, apiUrl)) {
        console.log(`\n✅ Claude Desktop configured at: ${paths.claude}`);
        success++;
      }
      if (updateConfig(paths.cursor, apiKey, apiUrl)) {
        console.log(`✅ Cursor/Kiro configured at: ${paths.cursor}`);
        success++;
      }
      if (success > 0) {
        console.log("\n   Please restart your applications for changes to take effect.\n");
      }
      break;
    }

    case "4":
      console.log("\n📋 Manual Configuration:\n");
      console.log("Add this to your MCP client config:\n");
      console.log(JSON.stringify(manualConfig, null, 2));
      console.log("\nConfig file locations:");
      console.log(`  Claude Desktop: ${paths.claude}`);
      console.log(`  Cursor/Kiro:    ${paths.cursor}\n`);
      break;

    default:
      console.log("\n❌ Invalid choice. Run the script again.\n");
      break;
  }

  console.log("🎉 Setup complete!\n");
  console.log('Test by asking your AI assistant: "What Lilia tools are available?"\n');

  rl.close();
}

main().catch((error) => {
  console.error("Setup failed:", error);
  rl.close();
  process.exit(1);
});
