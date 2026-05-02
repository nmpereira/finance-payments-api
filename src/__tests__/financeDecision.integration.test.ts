import request from "supertest";
import { app } from "../server";

const partnerQaRuleSet = {
  defaults: {
    termMonths: 12,
    paymentFrequency: "MONTHLY",
  },
  rules: [
    {
      id: "min-amount-500",
      effect: "DENY",
      description: "Reject amounts below 500",
      when: [
        {
          field: "amount",
          op: "LT",
          value: 500,
        },
      ],
      errorCode: "MIN_AMOUNT",
      errorMessage: "Minimum financed amount is 500",
    },
    {
      id: "max-amount-10000",
      effect: "DENY",
      description: "Reject amounts above 10,000",
      when: [
        {
          field: "amount",
          op: "GT",
          value: 10000,
        },
      ],
      errorCode: "MAX_AMOUNT",
      errorMessage: "Maximum financed amount is 10000",
    },
    {
      id: "max-term-60",
      effect: "DENY",
      description: "Reject terms longer than 60 months",
      when: [
        {
          field: "termMonths",
          op: "GT",
          value: 60,
        },
      ],
      errorCode: "MAX_TERM",
      errorMessage: "Maximum term is 60 months",
    },
    {
      id: "banned-states",
      effect: "DENY",
      description: "No financing in AK or HI",
      when: [
        {
          field: "policy.attributes.state",
          op: "IN",
          value: ["AK", "HI"],
        },
      ],
      errorCode: "BANNED_STATE",
      errorMessage:
        "Financing is not available in the applicant state",
    },
    {
      id: "high-risk-tier",
      effect: "DENY",
      description: "Reject HIGH risk tier",
      when: [
        {
          field: "policy.attributes.riskTier",
          op: "EQ",
          value: "HIGH",
        },
      ],
      errorCode: "RISK_TIER_HIGH",
      errorMessage: "Risk tier HIGH is not financeable",
    },
    {
      id: "blocked-policies",
      effect: "DENY",
      description: "Block specific policy IDs",
      when: [
        {
          field: "policy.policyId",
          op: "IN",
          value: ["TEST-BLOCK", "LEGACY-123"],
        },
      ],
      errorCode: "POLICY_BLOCKED",
      errorMessage:
        "This policy is not eligible for financing",
    },
    {
      id: "no-annual-short-term",
      effect: "DENY",
      description:
        "Annual payments require at least 12 months term",
      when: [
        {
          field: "paymentFrequency",
          op: "EQ",
          value: "ANNUALLY",
        },
        {
          field: "termMonths",
          op: "LT",
          value: 12,
        },
      ],
      errorCode: "ANNUAL_SHORT_TERM_NOT_ALLOWED",
      errorMessage:
        "Annual payment schedule not allowed for terms below 12 months",
    },
  ],
};

beforeAll(async () => {
  await request(app)
    .put("/api/v1/partners/partner-qa/rules")
    .send(partnerQaRuleSet)
    .expect(200);
});

describe("Finance decision API", () => {
  test("happy path: defaults (12 months, MONTHLY)", async () => {
    const res = await request(app)
      .post("/api/v1/finance/decision")
      .send({
        partnerId: "partner-qa",
        amount: 1200,
        policy: {
          policyId: "STD-001",
          attributes: {
            state: "CA",
            riskTier: "LOW",
          },
        },
      })
      .expect(200);

    expect(res.body.financeable).toBe(true);
    expect(res.body.errors).toEqual([]);

    expect(res.body.installments).toMatchObject({
      termMonths: 12,
      paymentFrequency: "MONTHLY",
      numberOfPayments: 12,
    });

    expect(res.body.installments.payments).toHaveLength(12);
    const sum = res.body.installments.payments.reduce(
      (acc: number, p: { amount: number }) => acc + p.amount,
      0
    );
    expect(sum).toBe(1200);
    res.body.installments.payments.forEach(
      (p: { amount: number }) => {
        expect(p.amount).toBe(100);
      }
    );
  });

  test("DENY: amount below minimum", async () => {
    const res = await request(app)
      .post("/api/v1/finance/decision")
      .send({
        partnerId: "partner-qa",
        amount: 400,
        policy: {
          policyId: "STD-004",
          attributes: {
            state: "CA",
            riskTier: "LOW",
          },
        },
      })
      .expect(200);

    expect(res.body.financeable).toBe(false);
    expect(res.body.errors).toEqual([
      {
        code: "MIN_AMOUNT",
        message: "Minimum financed amount is 500",
      },
    ]);
    expect(res.body.installments).toBeUndefined();
  });

  test("rounding on last payment (1000 / 3 months)", async () => {
    const res = await request(app)
      .post("/api/v1/finance/decision")
      .send({
        partnerId: "partner-qa",
        amount: 1000,
        termMonths: 3,
        paymentFrequency: "MONTHLY",
        policy: {
          policyId: "STD-003",
          attributes: {
            state: "TX",
            riskTier: "LOW",
          },
        },
      })
      .expect(200);

    expect(res.body.financeable).toBe(true);
    expect(res.body.errors).toEqual([]);

    expect(res.body.installments).toMatchObject({
      termMonths: 3,
      paymentFrequency: "MONTHLY",
      numberOfPayments: 3,
    });

    expect(res.body.installments.payments).toEqual([
      { sequence: 1, amount: 333.33 },
      { sequence: 2, amount: 333.33 },
      { sequence: 3, amount: 333.34 },
    ]);
  });

  test("multiple DENY rules triggered", async () => {
    const res = await request(app)
      .post("/api/v1/finance/decision")
      .send({
        partnerId: "partner-qa",
        amount: 20000,
        termMonths: 72,
        paymentFrequency: "MONTHLY",
        policy: {
          policyId: "STD-009",
          attributes: {
            state: "HI",
            riskTier: "HIGH",
          },
        },
      })
      .expect(200);

    expect(res.body.financeable).toBe(false);

    const codes = res.body.errors.map(
      (e: { code: string }) => e.code
    );

    expect(codes).toEqual(
      expect.arrayContaining([
        "MAX_AMOUNT",
        "MAX_TERM",
        "BANNED_STATE",
        "RISK_TIER_HIGH",
      ])
    );
  });

  test("unknown partner returns 404 + UNKNOWN_PARTNER", async () => {
    const res = await request(app)
      .post("/api/v1/finance/decision")
      .send({
        partnerId: "no-such-partner",
        amount: 1000,
        policy: {
          policyId: "STD-010",
          attributes: {
            state: "CA",
            riskTier: "LOW",
          },
        },
      })
      .expect(404);

    expect(res.body.financeable).toBe(false);
    expect(res.body.errors[0].code).toBe("UNKNOWN_PARTNER");
  });

  test("validation error (missing amount) returns 400", async () => {
    const res = await request(app)
      .post("/api/v1/finance/decision")
      .send({
        partnerId: "partner-qa",
        policy: {
          policyId: "STD-011",
          attributes: {
            state: "CA",
            riskTier: "LOW",
          },
        },
      })
      .expect(400);

    expect(res.body.financeable).toBe(false);
    expect(res.body.errors[0].code).toBe("BAD_REQUEST");
  });
});
