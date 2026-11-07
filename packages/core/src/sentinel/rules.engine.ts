import type { policies } from "../../../../database/schema/index.ts";
import type { RiskResult } from "../risk/risk.types.ts";
import { decimalUnits } from "../shared.ts";

type Policy = typeof policies.$inferSelect;
type Transfer = { recipient: string; mint: string; amount: string };

export class RulesEngine {
  evaluate(policy: Policy, transfer: Transfer, agentActive = true): RiskResult {
    const reasons: RiskResult["reasons"] = [];
    if (!agentActive)
      reasons.push({ ruleId: "agent-active", message: "Agent is disabled.", severity: "critical" });
    if (!policy.isActive)
      reasons.push({
        ruleId: "policy-active",
        message: "Policy is inactive.",
        severity: "critical",
      });
    if (policy.expiresAt && Date.parse(policy.expiresAt) <= Date.now()) {
      reasons.push({
        ruleId: "policy-active",
        message: "Policy has expired.",
        severity: "critical",
      });
    }
    if (decimalUnits(transfer.amount) > decimalUnits(policy.maxTransferAmount)) {
      reasons.push({
        ruleId: "transfer-limit",
        message: `Amount exceeds policy maximum of ${policy.maxTransferAmount}.`,
        severity: "high",
      });
    }
    const allowed = JSON.parse(policy.allowedRecipients) as string[];
    const blocked = JSON.parse(policy.blockedRecipients) as string[];
    if (blocked.includes(transfer.recipient)) {
      reasons.push({
        ruleId: "recipient-allow-deny",
        message: "Recipient is blocked by policy.",
        severity: "critical",
      });
    } else if (allowed.length > 0 && !allowed.includes(transfer.recipient)) {
      reasons.push({
        ruleId: "recipient-allow-deny",
        message: "Recipient is not on the policy allow list.",
        severity: "high",
      });
    }
    if (policy.allowedMint && policy.allowedMint !== transfer.mint) {
      reasons.push({
        ruleId: "mint-allow",
        message: "Token mint does not match the policy allow list.",
        severity: "high",
      });
    }
    const critical = reasons.some((reason) => reason.severity === "critical");
    const riskScore = critical
      ? 100
      : reasons.length > 0
        ? Math.min(95, 55 + reasons.length * 10)
        : 5;
    return {
      approved: reasons.length === 0,
      riskScore,
      riskLevel:
        riskScore >= 90
          ? "critical"
          : riskScore >= 70
            ? "high"
            : riskScore >= 40
              ? "medium"
              : "low",
      reasons,
    };
  }
}
