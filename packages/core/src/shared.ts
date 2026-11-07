import { AppError } from "../../../apps/api/src/middleware/error-handler.ts";

export const now = () => new Date().toISOString();
export const newId = () => crypto.randomUUID();

export function decodeJson<T>(value: string): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    throw new AppError(500, "DATA_INTEGRITY_ERROR", "Stored record contains invalid JSON");
  }
}

export function decimalUnits(value: string): bigint {
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * 10n ** 18n + BigInt(fraction.padEnd(18, "0"));
}

export function pageOffset(page: number, limit: number) {
  return (page - 1) * limit;
}
