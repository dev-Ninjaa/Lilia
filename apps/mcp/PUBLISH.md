# Ready to Publish! 🚀

## What We Built

✅ **Interactive setup script** - Users run `npx lilia-mcp-setup` and enter their API key
✅ **Auto-configuration** - Automatically updates Claude Desktop or Cursor config files
✅ **Secure** - API keys are never exposed in documentation
✅ **User-friendly** - Simple install and setup process

## How Users Will Use It

### Step 1: Install
```bash
npm install -g lilia-mcp
```

### Step 2: Setup (Interactive)
```bash
npx lilia-mcp-setup
```

They'll be prompted for:
- Their API key (which you provide them)
- Your deployed API URL (e.g., https://api.lilia.com)
- Which client to configure (Claude/Cursor/Both)

### Step 3: Done!
Restart their AI assistant and start using the tools.

## How to Provide API Keys to Users

You have several options:

### Option 1: Manual Distribution (Current)
- Share the same API key with trusted users
- Good for: Small teams, internal use, beta testing

### Option 2: Dashboard (Recommended)
Add an API key section to your web frontend where users can:
- View their API key
- Regenerate if compromised
- See usage stats

### Option 3: Per-User Keys (Future)
Implement multi-tenant authentication:
- User registration/login
- Auto-generate API keys per user
- Better security and isolation

## Publishing Steps

```bash
cd apps/mcp

# 1. Build
npm run build

# 2. Test locally
echo "test" | node dist/setup.js

# 3. Login to npm
npm login

# 4. Publish
npm publish
```

## After Publishing

Users can install with:
```bash
npm install -g lilia-mcp
npx lilia-mcp-setup
```

The `postinstall` script will remind them to run setup.

## Package Features

✅ **lilia-mcp** command - Starts the MCP server
✅ **lilia-mcp-setup** command - Interactive configuration
✅ **Auto-update config files** - No manual JSON editing
✅ **Cross-platform** - Works on macOS, Windows, Linux
✅ **Clear error messages** - Helps users troubleshoot

## Security Notes

- API keys are stored in local config files only
- Never logged or transmitted except to your API
- Users can update keys anytime by re-running setup
- Setup script validates key length

## Next Steps for Better Security

If you want per-user authentication, you'd need to:

1. **Add user registration to your API**
2. **Generate unique API keys per user**
3. **Update authentication middleware**
4. **Add API key management UI**

But for now, this solution works great for:
- Internal teams
- Beta users
- Small-scale deployments

## Files Created

- `src/setup.ts` - Interactive setup script
- `README.md` - Updated with setup instructions
- `package.json` - Added setup command and postinstall hook

## What Users See

```
$ npm install -g lilia-mcp

✨ Run "npx lilia-mcp-setup" to configure your API key

$ npx lilia-mcp-setup

🚀 Lilia MCP Setup

This script will configure lilia-mcp for your MCP client.

Enter your Lilia API key: ***************
Enter your Lilia API URL (default: https://api.yourdomain.com): https://api.lilia.com

Which MCP client would you like to configure?
1. Claude Desktop
2. Cursor / Kiro IDE
3. Both
4. Show manual config (don't auto-configure)

Your choice (1-4): 1

✅ Claude Desktop configured at: /Users/name/Library/Application Support/Claude/claude_desktop_config.json
   Please restart Claude Desktop for changes to take effect.

🎉 Setup complete!

Test by asking your AI assistant: "What Lilia tools are available?"
```

Clean, simple, secure! 🎉
