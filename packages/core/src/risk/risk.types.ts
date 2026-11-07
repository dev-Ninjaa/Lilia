export type RiskLevel = "low" | "medium" | "high" | "critical";
export type RiskReason = { ruleId: string; message: string; severity: "high" | "critical" };
export type RiskResult = {
  approved: boolean;
  riskScore: number;
  riskLevel: RiskLevel;
  reasons: RiskReason[];
};
