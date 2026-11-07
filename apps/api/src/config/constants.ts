export const APP_VERSION = "0.1.0";
export const PROTOCOL_DOMAIN = "lilia.authorization.v1";
export const DEFAULT_PERMIT_TTL_SECONDS = 300;
export const SECURITY_RULES = [
  {
    id: "agent-active",
    name: "Active agent",
    description: "Only active registered agents may evaluate or authorize transactions.",
    severity: "critical",
    enabled: true,
  },
  {
    id: "policy-active",
    name: "Active policy",
    description: "An active, unexpired policy must govern every permitted transfer.",
    severity: "critical",
    enabled: true,
  },
  {
    id: "transfer-limit",
    name: "Maximum transfer amount",
    description: "A proposed amount must not exceed the policy maximum.",
    severity: "high",
    enabled: true,
  },
  {
    id: "recipient-allow-deny",
    name: "Recipient restrictions",
    description: "Blocked recipients are denied and non-empty allow lists are enforced.",
    severity: "high",
    enabled: true,
  },
  {
    id: "mint-allow",
    name: "Allowed mint",
    description: "When configured, only the specified token mint is allowed.",
    severity: "high",
    enabled: true,
  },
];
