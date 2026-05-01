import { ApiError } from "../types/api";
import { PaymentFrequency } from "../types/policy";
import { FinanceDecisionRequest } from "../types/request";

export type ParseResult =
  | { ok: true; value: FinanceDecisionRequest }
  | { ok: false; error: ApiError };

function isValidPaymentFrequency(value: unknown): value is PaymentFrequency {
  return value === "MONTHLY" || value === "QUARTERLY" || value === "ANNUALLY";
}

function isShapeValid(raw: any): boolean {
  return (
    !!raw &&
    typeof raw.partnerId === "string" &&
    typeof raw.amount === "number" &&
    !!raw.policy &&
    typeof raw.policy === "object" &&
    !!raw.policy.attributes &&
    typeof raw.policy.attributes === "object"
  );
}

export function parseFinanceDecisionRequest(body: unknown): ParseResult {
  const raw = body as any;

  if (!isShapeValid(raw)) {
    return {
      ok: false,
      error: {
        code: "BAD_REQUEST",
        message:
          "partnerId (string), amount (number) and " +
          "policy.attributes (object) are required."
      }
    };
  }

  const value: FinanceDecisionRequest = {
    partnerId: raw.partnerId,
    amount: raw.amount,
    termMonths:
      typeof raw.termMonths === "number" ? raw.termMonths : undefined,
    paymentFrequency: isValidPaymentFrequency(raw.paymentFrequency)
      ? raw.paymentFrequency
      : undefined,
    policy: {
      policyId: raw.policy.policyId,
      attributes: raw.policy.attributes
    }
  };

  return { ok: true, value };
}
