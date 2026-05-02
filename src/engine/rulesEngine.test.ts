import { evaluateRules } from "./rulesEngine";
import { FinanceDecisionRequest } from "../types/request";
import { PartnerRuleSet, Rule, RuleCondition } from "../types/rules";

function baseRequest(
  overrides: Partial<FinanceDecisionRequest> = {}
): FinanceDecisionRequest {
  return {
    partnerId: "test-partner",
    amount: 1000,
    policy: {
      policyId: "P-1",
      attributes: { state: "CA", riskTier: "LOW" },
    },
    ...overrides,
  };
}

function ruleSet(rules: Rule[]): PartnerRuleSet {
  return {
    partnerId: "test-partner",
    rules,
  };
}

describe("evaluateRules", () => {
  test("EQ matches", () => {
    const res = evaluateRules(
      baseRequest({ amount: 500 }),
      ruleSet([
        {
          id: "r1",
          description: "deny when amount equals 500",
          effect: "DENY",
          when: [{ field: "amount", operator: "EQ", value: 500 }],
          errorCode: "EQ_HIT",
          errorMessage: "eq",
        },
      ])
    );
    expect(res.financeable).toBe(false);
    expect(res.errors).toEqual([{ code: "EQ_HIT", message: "eq" }]);
  });

  test("NE matches when values differ", () => {
    const res = evaluateRules(
      baseRequest({ amount: 100 }),
      ruleSet([
        {
          id: "r-ne",
          description: "deny when amount not equal to 0",
          effect: "DENY",
          when: [{ field: "amount", operator: "NE", value: 0 }],
          errorCode: "NE_HIT",
          errorMessage: "ne",
        },
      ])
    );
    expect(res.financeable).toBe(false);
    expect(res.errors[0].code).toBe("NE_HIT");
  });

  test("GT / GTE / LT / LTE on numbers", () => {
    expect(
      evaluateRules(
        baseRequest({ amount: 100 }),
        ruleSet([
          {
            id: "gt",
            description: "gt",
            effect: "DENY",
            when: [{ field: "amount", operator: "GT", value: 50 }],
            errorCode: "GT",
            errorMessage: "m",
          },
        ])
      ).financeable
    ).toBe(false);

    expect(
      evaluateRules(
        baseRequest({ amount: 50 }),
        ruleSet([
          {
            id: "gte",
            description: "gte",
            effect: "DENY",
            when: [{ field: "amount", operator: "GTE", value: 50 }],
            errorCode: "GTE",
            errorMessage: "m",
          },
        ])
      ).financeable
    ).toBe(false);

    expect(
      evaluateRules(
        baseRequest({ amount: 40 }),
        ruleSet([
          {
            id: "lt",
            description: "lt",
            effect: "DENY",
            when: [{ field: "amount", operator: "LT", value: 50 }],
            errorCode: "LT",
            errorMessage: "m",
          },
        ])
      ).financeable
    ).toBe(false);

    expect(
      evaluateRules(
        baseRequest({ amount: 50 }),
        ruleSet([
          {
            id: "lte",
            description: "lte",
            effect: "DENY",
            when: [{ field: "amount", operator: "LTE", value: 50 }],
            errorCode: "LTE",
            errorMessage: "m",
          },
        ])
      ).financeable
    ).toBe(false);
  });

  test("IN and NOT_IN", () => {
    const denyIn = ruleSet([
      {
        id: "in",
        description: "in",
        effect: "DENY",
        when: [
          {
            field: "policy.attributes.state",
            operator: "IN",
            value: ["CA", "NY"],
          },
        ],
        errorCode: "IN",
        errorMessage: "m",
      },
    ]);
    expect(evaluateRules(baseRequest(), denyIn).financeable).toBe(false);

    const denyNotIn = ruleSet([
      {
        id: "not-in",
        description: "not in",
        effect: "DENY",
        when: [
          {
            field: "policy.attributes.state",
            operator: "NOT_IN",
            value: ["AK", "HI"],
          },
        ],
        errorCode: "NOT_IN",
        errorMessage: "m",
      },
    ]);
    expect(evaluateRules(baseRequest(), denyNotIn).financeable).toBe(false);
  });

  test("accepts op shorthand instead of operator", () => {
    const res = evaluateRules(
      baseRequest({ amount: 10 }),
      ruleSet([
        {
          id: "op-shorthand",
          description: "lt via op",
          effect: "DENY",
          when: [
            {
              field: "amount",
              op: "LT",
              value: 100,
            } as unknown as RuleCondition,
          ],
          errorCode: "OP",
          errorMessage: "op shorthand",
        },
      ])
    );
    expect(res.financeable).toBe(false);
    expect(res.errors[0].code).toBe("OP");
  });

  test("dynamic policy.attributes key resolves", () => {
    const res = evaluateRules(
      baseRequest({
        policy: {
          policyId: "X",
          attributes: { customScore: 99 },
        },
      }),
      ruleSet([
        {
          id: "attr",
          description: "custom attribute",
          effect: "DENY",
          when: [
            {
              field: "policy.attributes.customScore",
              operator: "GTE",
              value: 90,
            },
          ],
          errorCode: "ATTR",
          errorMessage: "m",
        },
      ])
    );
    expect(res.financeable).toBe(false);
  });

  test("unknown field yields undefined and rule does not match", () => {
    const res = evaluateRules(
      baseRequest(),
      ruleSet([
        {
          id: "unknown-field",
          description: "never matches",
          effect: "DENY",
          when: [
            {
              field: "policy.attributes.nonexistent",
              operator: "EQ",
              value: "x",
            },
          ],
          errorCode: "NO",
          errorMessage: "no",
        },
      ])
    );
    expect(res.financeable).toBe(true);
    expect(res.errors).toEqual([]);
  });

  test("missing operator and op causes condition to fail", () => {
    const res = evaluateRules(
      baseRequest({ amount: 5 }),
      ruleSet([
        {
          id: "no-op",
          description: "missing op",
          effect: "DENY",
          when: [
            {
              field: "amount",
              value: 5,
            } as RuleCondition,
          ],
          errorCode: "X",
          errorMessage: "y",
        },
      ])
    );
    expect(res.financeable).toBe(true);
  });

  test("DENY uses rule id and description when errorCode omitted", () => {
    const res = evaluateRules(
      baseRequest({ amount: 1 }),
      ruleSet([
        {
          id: "fallback-id",
          description: "Fallback description",
          effect: "DENY",
          when: [{ field: "amount", operator: "EQ", value: 1 }],
        },
      ])
    );
    expect(res.financeable).toBe(false);
    expect(res.errors).toEqual([
      { code: "fallback-id", message: "Fallback description" },
    ]);
  });

  test("multiple rules: all matching DENY rules accumulate errors", () => {
    const res = evaluateRules(
      baseRequest({ amount: 100, termMonths: 12 }),
      ruleSet([
        {
          id: "a",
          description: "amount check",
          effect: "DENY",
          when: [{ field: "amount", operator: "LT", value: 200 }],
          errorCode: "A",
          errorMessage: "a",
        },
        {
          id: "b",
          description: "term check",
          effect: "DENY",
          when: [{ field: "termMonths", operator: "LTE", value: 12 }],
          errorCode: "B",
          errorMessage: "b",
        },
      ])
    );
    expect(res.financeable).toBe(false);
    expect(res.errors).toHaveLength(2);
  });
});
