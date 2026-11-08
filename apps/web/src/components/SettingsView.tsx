"use client";

import { useEffect, useState } from "react";

export function SettingsView() {
  const [showKey, setShowKey] = useState(false);
  const [copied, setCopied] = useState(false);
  const [apiKey, setApiKey] = useState<string>("");
  const [apiUrl, setApiUrl] = useState<string>("");

  useEffect(() => {
    // Get API key from server
    fetch("/api/lilia/api-key")
      .then((res) => res.json())
      .then((data) => {
        if (data.success) {
          setApiKey(data.data.apiKey);
          setApiUrl(data.data.apiUrl);
        }
      })
      .catch((err) => console.error("Failed to fetch API key:", err));
  }, []);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(apiKey);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-100">Settings</h1>
        <p className="mt-2 text-sm text-gray-400">Manage your API access and integrations</p>
      </div>

      {/* API Key Section */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-100">API Key</h2>
            <p className="mt-1 text-sm text-gray-400">
              Use this key to connect the Lilia MCP server to your AI assistant
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {/* API Key Display */}
          <div>
            <label htmlFor="api-key" className="block text-xs font-medium text-gray-400 mb-2">
              Your API Key
            </label>
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <input
                  id="api-key"
                  type={showKey ? "text" : "password"}
                  value={apiKey}
                  readOnly
                  className="w-full rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 font-mono text-sm text-gray-100 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="rounded-lg border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm font-medium text-gray-300 hover:bg-gray-700 hover:text-gray-100 transition-colors"
              >
                {showKey ? "Hide" : "Show"}
              </button>
              <button
                type="button"
                onClick={copyToClipboard}
                className="rounded-lg bg-cyan-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-cyan-700 transition-colors"
              >
                {copied ? "✓ Copied" : "Copy"}
              </button>
            </div>
          </div>

          {/* Security Warning */}
          <div className="rounded-lg border border-yellow-500/20 bg-yellow-500/10 p-4">
            <div className="flex items-start gap-3">
              <svg
                aria-hidden="true"
                className="h-5 w-5 text-yellow-500 flex-shrink-0 mt-0.5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
              <div className="text-sm text-yellow-200">
                <p className="font-medium">Keep this key secure!</p>
                <p className="mt-1 text-yellow-200/80">
                  This key grants full access to your Lilia API. Never share it publicly or commit
                  it to version control.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* MCP Setup Instructions */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
        <h2 className="text-lg font-semibold text-gray-100">Setup MCP Integration</h2>
        <p className="mt-1 text-sm text-gray-400">Connect Lilia to your AI assistant in 2 steps</p>

        <div className="mt-6 space-y-4">
          <div className="rounded-lg border border-gray-800 bg-gray-950 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-cyan-600 text-xs font-bold text-white">
                1
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-100">Install lilia-mcp</h3>
                <p className="mt-1 text-sm text-gray-400">Run this command in your terminal:</p>
                <div className="mt-2 rounded-lg bg-black p-3">
                  <code className="text-sm text-cyan-400">npm install -g lilia-mcp</code>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-lg border border-gray-800 bg-gray-950 p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-cyan-600 text-xs font-bold text-white">
                2
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-100">Run setup</h3>
                <p className="mt-1 text-sm text-gray-400">Configure your API key:</p>
                <div className="mt-2 rounded-lg bg-black p-3">
                  <code className="text-sm text-cyan-400">npx lilia-mcp-setup</code>
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  When prompted, paste your API key from above
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-lg border border-gray-700 bg-gray-800/50 p-4">
          <h3 className="text-sm font-medium text-gray-100">What's next?</h3>
          <ul className="mt-2 space-y-2 text-sm text-gray-400">
            <li className="flex items-start gap-2">
              <span className="text-cyan-500">•</span>
              <span>Restart your AI assistant (Claude Desktop, Cursor, etc.)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-500">•</span>
              <span>Ask: "What Lilia tools are available?"</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-500">•</span>
              <span>Start building AI-powered token workflows! 🚀</span>
            </li>
          </ul>
        </div>
      </div>

      {/* API Information */}
      <div className="rounded-xl border border-gray-800 bg-gray-900/50 p-6">
        <h2 className="text-lg font-semibold text-gray-100">API Information</h2>
        <div className="mt-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">API URL:</span>
            <code className="text-cyan-400">{apiUrl || "Loading..."}</code>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Network:</span>
            <code className="text-cyan-400">devnet</code>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Documentation:</span>
            <a
              href="https://github.com/dev-Ninjaa/Lilia"
              target="_blank"
              rel="noopener noreferrer"
              className="text-cyan-400 hover:text-cyan-300"
            >
              View on GitHub →
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
