import { parseFinanceDecisionRequest } from "./financeDecisionRequest";

describe("parseFinanceDecisionRequest", () => {
  const minimalValid = {
    partnerId: "p1",
    amount: 100,
    policy: {
      policyId: "pol-1",
      attributes: {},
    },
  };

  test("returns ok with minimal valid body", () => {
    const result = parseFinanceDecisionRequest(minimalValid);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.partnerId).toBe("p1");
      expect(result.value.amount).toBe(100);
      expect(result.value.termMonths).toBeUndefined();
      expect(result.value.paymentFrequency).toBeUndefined();
      expect(result.value.policy.policyId).toBe("pol-1");
      expect(result.value.policy.attributes).toEqual({});
    }
  });

  test("parses optional termMonths and paymentFrequency when valid", () => {
    const result = parseFinanceDecisionRequest({
      ...minimalValid,
      termMonths: 24,
      paymentFrequency: "QUARTERLY",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.termMonths).toBe(24);
      expect(result.value.paymentFrequency).toBe("QUARTERLY");
    }
  });

  test("treats invalid paymentFrequency as undefined", () => {
    const result = parseFinanceDecisionRequest({
      ...minimalValid,
      paymentFrequency: "WEEKLY",
    });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.paymentFrequency).toBeUndefined();
    }
  });

  test("rejects when amount is missing or not a number", () => {
    const missingAmount = parseFinanceDecisionRequest({
      partnerId: "p1",
      policy: { attributes: {} },
    });
    expect(missingAmount.ok).toBe(false);
    if (!missingAmount.ok) {
      expect(missingAmount.error.code).toBe("BAD_REQUEST");
    }

    const wrongType = parseFinanceDecisionRequest({
      ...minimalValid,
      amount: "100",
    });
    expect(wrongType.ok).toBe(false);
  });

  test("rejects when policy.attributes is missing", () => {
    const result = parseFinanceDecisionRequest({
      partnerId: "p1",
      amount: 100,
      policy: {},
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.message).toContain("policy.attributes");
    }
  });

  test("rejects null or non-object body", () => {
    expect(parseFinanceDecisionRequest(null).ok).toBe(false);
    expect(parseFinanceDecisionRequest(undefined).ok).toBe(false);
    expect(parseFinanceDecisionRequest("x").ok).toBe(false);
  });
});
