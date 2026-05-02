import { EvaluationError, RulesEvaluationResult } from "../types/evaluation";
import { FinanceDecisionRequest } from "../types/request";
import { Operator, PartnerRuleSet, RuleCondition } from "../types/rules";

/** Accept `operator` (typed rules) or `op` (common JSON shorthand from clients). */
function conditionOperator(condition: RuleCondition): Operator | undefined {
  const raw = condition as RuleCondition & { op?: Operator };
  return raw.operator ?? raw.op;
}

function resolveFieldValue(
  field: string,
  request: FinanceDecisionRequest
): unknown {
  if (field === "amount") {
    return request.amount;
  }

  if (field === "termMonths") {
    return request.termMonths;
  }

  if (field === "paymentFrequency") {
    return request.paymentFrequency;
  }

  if (field === "policy.policyId") {
    return request.policy.policyId;
  }

  const policyAttributesPrefix = "policy.attributes.";
  if (field.startsWith(policyAttributesPrefix)) {
    const attributeKey = field.substring(policyAttributesPrefix.length);
    return request.policy.attributes[attributeKey];
  }

  return undefined;
}

function compare(
  operator: RuleCondition["operator"],
  actual: unknown,
  expected: unknown
): boolean {
  switch (operator) {
    case "EQ":
      return actual === expected;
    case "NE":
      return actual !== expected;
    case "GT":
      return (
        typeof actual === "number" &&
        typeof expected === "number" &&
        actual > expected
      );
    case "GTE":
      return (
        typeof actual === "number" &&
        typeof expected === "number" &&
        actual >= expected
      );
    case "LT":
      return (
        typeof actual === "number" &&
        typeof expected === "number" &&
        actual < expected
      );
    case "LTE":
      return (
        typeof actual === "number" &&
        typeof expected === "number" &&
        actual <= expected
      );
    case "IN":
      return Array.isArray(expected) && expected.includes(actual);
    case "NOT_IN":
      return Array.isArray(expected) && !expected.includes(actual);
    default:
      return false;
  }
}

function evaluateCondition(
  condition: RuleCondition,
  request: FinanceDecisionRequest
): boolean {
  const actual = resolveFieldValue(condition.field, request);

  if (actual === undefined) {
    return false;
  }

  const op = conditionOperator(condition);
  if (op === undefined) {
    return false;
  }

  return compare(op, actual, condition.value);
}

export function evaluateRules(
  request: FinanceDecisionRequest,
  partnerRuleSet: PartnerRuleSet
): RulesEvaluationResult {
  const errors: EvaluationError[] = [];

  for (const rule of partnerRuleSet.rules) {
    const matchesAllConditions = rule.when.every((condition) =>
      evaluateCondition(condition, request)
    );

    if (!matchesAllConditions) {
      continue;
    }

    if (rule.effect === "DENY") {
      if (rule.errorCode && rule.errorMessage) {
        errors.push({
          code: rule.errorCode,
          message: rule.errorMessage,
        });
      } else {
        errors.push({
          code: rule.id,
          message: rule.description,
        });
      }
    }
  }

  return {
    financeable: errors.length === 0,
    errors,
  };
}
