# Lilia demo script

Companion to `lilia-full-demo.mp4` (4 min 52 s, 1440x900, visible cursor with click ripples).
The video has no audio. The narration lines are suggested voice-over text, matched to the video
clock. Timestamps were read from frames sampled every 6 seconds, so they are accurate to about
plus or minus 6 seconds. The order of steps is exact.

The video was recorded against production (`lilia-pied.vercel.app` -> Render API -> Solana devnet).
It was recorded before the hero headline was rewritten, so the landing page in the video still
shows the old "Give your AI agent a wallet. Not a blank check." headline.

## Values used

| Item | Value |
|---|---|
| Agent registered | `Settlement Bot`, id `settlement-bot-01`, a freshly generated Solana public key |
| On-chain registration | a freshly generated transfer authority and agent identity key |
| Policy created | `Settlement micro-payments`, max per tx 250, daily cap 1000, one allowed recipient `5hJvyMZUZp…fkSP` |
| Transfer agent / policy | `Devnet demo agent` / `Devnet transfer policy (max 1000)` |
| Transfer | 100 tokens of mint `3oJ5wNXd…oWzZ` to `5hJvyMZUZp…fkSP`, permit TTL 300 slots |

## Timeline

| Time | On screen | What the script does | Suggested narration |
|---|---|---|---|
| 0:00 - 0:12 | Landing page, hero and stat cards | Opens the site, scrolls the landing page, returns to the top | "AI agents can now move money on their own. That is useful and dangerous. Lilia puts rules between an agent and its wallet, and enforces them on Solana." |
| 0:12 - 0:30 | Console Overview: stat cards, Active Agents, Threat Event Stream (each full width) | Opens `/console/overview`, scrolls down and back up | "This is the console: registered agents, protected volume, verified transfers and threats blocked. Active agents and the live threat stream are below." |
| 0:30 - 0:36 | Agents page, table of agents | Clicks Agents in the sidebar | "Agents are the identities allowed to move money." |
| 0:36 - 1:00 | Register Agent Identity modal, fields filling in | Clicks Register New Agent, types name `Settlement Bot` and id `settlement-bot-01`, pastes a Solana public key, clicks Register agent | "Registering an agent takes a name, an identifier and its public key. We only ever ask for the public key. The agent keeps its private key." |
| 1:00 - 1:06 | Table with Settlement Bot as a new row | Shows the result | "The agent is saved in Lilia's registry." |
| 1:06 - 1:30 | Register AgentRegistry on-chain modal | Clicks On-chain on the new row, types a transfer authority and an agent identity key, clicks Register on-chain | "Now we register it on Solana. The backend signs with the admin key and creates the agent's on-chain registry account. That account holds the replay-protection sequence number." |
| 1:30 - 1:42 | Table: Settlement Bot shows "On-chain ✓" | Waits for the devnet transaction, shows the updated row | "The row now shows the on-chain registration." |
| 1:42 - 1:48 | Same row, red Disable Agent button | Clicks Disable Agent | "The kill switch. One click and the agent is disabled. Its open permits are revoked and it cannot request new ones." |
| 1:48 - 1:54 | Policies page, policy cards | Clicks Policies | "Policies are the rules: how much, how often, and who." |
| 1:54 - 2:24 | Create On-Chain Policy modal, fields filling in | Clicks Create New Policy, types title `Settlement micro-payments`, max 250, daily cap 1000, pastes one allowed recipient, clicks Save & Commit Policy | "A policy has a per-transfer maximum, a daily cap, and allowed and blocked recipients. Here: 250 per transfer, 1,000 per day, one approved destination." |
| 2:24 - 2:30 | Policies list with the new policy first | Shows the result | "The policy is saved and can be published on-chain." |
| 2:30 - 2:42 | Feed (Transaction Monitor & Permit Inspector) | Clicks Feed, scrolls | "Every permit and transfer is logged: agent, amount, destination, the Sentinel permit state and the on-chain hook result. Permits that expire without a confirmed transfer are marked failed, not left pending." |
| 2:42 - 2:54 | Transfer Console, agent dropdown | Clicks Transfers, selects Devnet demo agent; policy, recipient and mint fill in from its policy | "The Transfer Console runs one transfer end to end. We pick the demo agent, and its policy fills in the recipient and the token mint." |
| 2:54 - 3:06 | Step 1 Evaluate: APPROVED, risk 5/100 | Clicks Run | "Step one. Sentinel checks the transfer against the policy: amount, recipient, mint and risk. Approved." |
| 3:06 - 3:12 | Step 2 Authorize: permit sequence and expiry slot | Clicks Sign | "Step two. Sentinel signs a Permit v2: a 308-byte message with an Ed25519 signature, bound to this exact amount, mint and destination, valid only until the shown slot." |
| 3:12 - 3:24 | Step 3 Prepare: unsigned transaction | Clicks Build | "Step three. The backend builds the Token-2022 transfer with the permit attached." |
| 3:24 - 3:30 | Step 4: signed transaction fills the box | Clicks Sign with demo authority (devnet) | "The token owner has to sign. For the demo, a devnet demo key signs. A real agent would sign with its own wallet." |
| 3:30 - 3:36 | Green "Confirmed: <signature>" | Clicks Submit and waits for confirmation | "Submitted to Solana devnet. The transfer hook verifies the Sentinel signature on-chain, checks amount, mint and destination, advances the sequence number, and the transfer confirms." |
| 3:36 - 3:48 | Feed with the new Executed row on top | Clicks Feed, scrolls | "And the Feed now shows the confirmed transfer." |
| 3:48 - 4:00 | Threats page: event log | Clicks Threats, scrolls | "Everything is logged: permits issued, approvals, registrations, and the agent we disabled." |
| 4:00 - 4:12 | Simulation Lab, empty terminal, then Scenario A output | Clicks Simulate, then Run test on Scenario A | "The simulation lab shows how Sentinel judges transfers. A: a legitimate payment. Approved, and a permit would be issued." |
| 4:12 - 4:24 | Scenario B output, rejected | Clicks Run test on Scenario B | "B: a prompt-injection drain of 40,000 units to an unknown wallet. Rejected: it breaks the maximum and the recipient rules. No permit, no transfer." |
| 4:24 - 4:36 | Scenario C output, rejected | Clicks Run test on Scenario C | "C: a transfer over the hard cap. The cap is also enforced inside the on-chain program, which no AI model can override." |
| 4:36 - 4:48 | Integrate page: Sentinel admin, MCP config, tool list | Clicks Integrate, scrolls | "Agents connect through the REST API or the MCP server, so Claude, Cursor or any MCP client can request permits through these tools." |
| 4:48 - 4:52 | Overview with updated numbers | Clicks Overview | "Back on the overview the counts have moved: more agents, a confirmed transfer, threats blocked." |

## What each step proves

| Step | Proves |
|---|---|
| Register agent | Agents are identified by a public key; no private keys are collected |
| On-chain registration | The backend admin key can create an on-chain registry account |
| Disable agent | The kill switch revokes permits and blocks new requests |
| Policy creation | Spend limits and recipient lists are configurable per agent |
| Evaluate | Deterministic policy checks plus a risk score before any signature |
| Authorize | A signed, expiring, amount-bound permit exists only after approval |
| Prepare, sign, submit | The Token-2022 transfer hook accepts the transfer only with a valid permit |
| Feed | Confirmed transfers are recorded; stale permits are marked failed |
| Simulate | Malicious or over-limit requests are refused before any permit exists |

## Before you re-record or present live

- The Transfers step only works for `Devnet demo agent`, because the demo signing key
  (`LILIA_DEMO_TRANSFER_AUTHORITY` on Render) belongs to that agent's token account.
- Production already holds test data from earlier takes: disabled `Treasury Bot` and `Payroll Bot`,
  a `Payroll micro-payments` policy, and the `Settlement Bot` agent and policy. The API has no
  delete, so a new run adds more.
- The Vercel proxy has no login. Anyone with the URL can use the console.
- To show a blocked on-chain attack live, run the scripts in `scripts/devnet/`
  (`demo-replay-attack.ts`, `demo-amount-mismatch.ts`, `demo-expired-permit.ts`).
