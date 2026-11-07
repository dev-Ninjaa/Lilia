import { generateKeyPairSync, randomBytes } from "node:crypto";
import { existsSync, writeFileSync } from "node:fs";

const { privateKey, publicKey } = generateKeyPairSync("ed25519", {
  privateKeyEncoding: { type: "pkcs8", format: "pem" },
  publicKeyEncoding: { type: "spki", format: "pem" },
});
const privateEnv = JSON.stringify(privateKey);
const publicEnv = JSON.stringify(publicKey);
if (process.argv.includes("--configure-env")) {
  if (existsSync(".env")) throw new Error("Refusing to overwrite an existing .env file");
  const apiKey = randomBytes(32).toString("base64url");
  writeFileSync(
    ".env",
    [
      "PORT=4000",
      "HOST=0.0.0.0",
      "NODE_ENV=development",
      "DATABASE_URL=./database/lilia.db",
      `LILIA_API_KEY=${apiKey}`,
      `LILIA_SIGNING_PRIVATE_KEY=${privateEnv}`,
      `LILIA_SIGNING_PUBLIC_KEY=${publicEnv}`,
      "GEMINI_API_KEY=",
      "SOLANA_RPC_URL=",
      "",
    ].join("\n"),
    { flag: "wx", mode: 0o600 },
  );
  console.log(
    "Created .env with a new API key and Ed25519 signing key pair. Keep it private and out of version control.",
  );
} else {
  console.log(`LILIA_SIGNING_PRIVATE_KEY=${privateEnv}`);
  console.log(`LILIA_SIGNING_PUBLIC_KEY=${publicEnv}`);
  console.log(
    "Store these PEM values securely as environment variables. Never commit the private key.",
  );
}
