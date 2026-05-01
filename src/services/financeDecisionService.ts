import { getPartnerRuleSet } from "../config/partnerRules";
import { calculateInstallments } from "../engine/installmentCalculator";
import { evaluateRules } from "../engine/rulesEngine";
import { FinanceDecisionResponse } from "../types/api";
import { FinanceDecisionRequest } from "../types/request";

export type DecisionOutcome =
  | { kind: "unknown_partner"; partnerId: string }
  | { kind: "decision"; response: FinanceDecisionResponse };

const DEFAULT_TERM_MONTHS = 12;
const DEFAULT_PAYMENT_FREQUENCY = "MONTHLY" as const;

export function makeFinanceDecision(
  request: FinanceDecisionRequest
): DecisionOutcome {
  const partnerConfig = getPartnerRuleSet(request.partnerId);

  if (!partnerConfig) {
    return { kind: "unknown_partner", partnerId: request.partnerId };
  }

  const evaluation = evaluateRules(request, partnerConfig);

  const response: FinanceDecisionResponse = {
    financeable: evaluation.financeable,
    errors: evaluation.errors
  };

  if (evaluation.financeable) {
    const termMonths =
      request.termMonths ??
      partnerConfig.defaults?.termMonths ??
      DEFAULT_TERM_MONTHS;

    const paymentFrequency =
      request.paymentFrequency ??
      partnerConfig.defaults?.paymentFrequency ??
      DEFAULT_PAYMENT_FREQUENCY;

    response.installments = calculateInstallments(
      request.amount,
      termMonths,
      paymentFrequency
    );
  }

  return { kind: "decision", response };
}
