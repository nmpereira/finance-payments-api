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

const partnerNoDefaultsRuleSet = {
  rules: [],
};

beforeAll(async () => {
  await request(app)
    .put("/api/v1/partners/partner-qa/rules")
    .send(partnerQaRuleSet)
    .expect(200);

  await request(app)
    .put("/api/v1/partners/partner-no-defaults/rules")
    .send(partnerNoDefaultsRuleSet)
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

  test("amount exactly at minimum (500) is financeable", async () => {
    const res = await request(app)
      .post("/api/v1/finance/decision")
      .send({
        partnerId: "partner-qa",
        amount: 500,
        policy: {
          policyId: "MIN-EDGE",
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
    const sum = res.body.installments.payments.reduce(
      (acc: number, p: { amount: number }) => acc + p.amount,
      0
    );
    expect(sum).toBeCloseTo(500, 5);
  });

  test("amount exactly at maximum (10000) is financeable", async () => {
    const res = await request(app)
      .post("/api/v1/finance/decision")
      .send({
        partnerId: "partner-qa",
        amount: 10000,
        policy: {
          policyId: "MAX-EDGE",
          attributes: {
            state: "CA",
            riskTier: "LOW",
          },
        },
      })
      .expect(200);

    expect(res.body.financeable).toBe(true);
    expect(res.body.errors).toEqual([]);
    const sum = res.body.installments.payments.reduce(
      (acc: number, p: { amount: number }) => acc + p.amount,
      0
    );
    expect(sum).toBeCloseTo(10000, 5);
  });

  test("term exactly at maximum (60 months) is financeable", async () => {
    const res = await request(app)
      .post("/api/v1/finance/decision")
      .send({
        partnerId: "partner-qa",
        amount: 9000,
        termMonths: 60,
        paymentFrequency: "MONTHLY",
        policy: {
          policyId: "TERM-EDGE",
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
      termMonths: 60,
      paymentFrequency: "MONTHLY",
      numberOfPayments: 60,
    });
    const sum = res.body.installments.payments.reduce(
      (acc: number, p: { amount: number }) => acc + p.amount,
      0
    );
    expect(sum).toBe(9000);
  });

  test("amount just above maximum (10001) is denied", async () => {
    const res = await request(app)
      .post("/api/v1/finance/decision")
      .send({
        partnerId: "partner-qa",
        amount: 10001,
        policy: {
          policyId: "MAX-OVER",
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
        code: "MAX_AMOUNT",
        message: "Maximum financed amount is 10000",
      },
    ]);
    expect(res.body.installments).toBeUndefined();
  });

  test("term just above maximum (61) is denied", async () => {
    const res = await request(app)
      .post("/api/v1/finance/decision")
      .send({
        partnerId: "partner-qa",
        amount: 9000,
        termMonths: 61,
        paymentFrequency: "MONTHLY",
        policy: {
          policyId: "TERM-OVER",
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
        code: "MAX_TERM",
        message: "Maximum term is 60 months",
      },
    ]);
    expect(res.body.installments).toBeUndefined();
  });

  test(
    "annual frequency with term 12 months is allowed (boundary " +
      "for no-annual-short-term rule)",
    async () => {
      const res = await request(app)
        .post("/api/v1/finance/decision")
        .send({
          partnerId: "partner-qa",
          amount: 1200,
          termMonths: 12,
          paymentFrequency: "ANNUALLY",
          policy: {
            policyId: "ANNUAL-OK",
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
        paymentFrequency: "ANNUALLY",
        numberOfPayments: 1,
      });

      expect(res.body.installments.payments).toEqual([
        { sequence: 1, amount: 1200 },
      ]);
    }
  );

  test(
    "short term (6 months) with MONTHLY frequency is allowed " +
      "(no-annual-short-term should not match)",
    async () => {
      const res = await request(app)
        .post("/api/v1/finance/decision")
        .send({
          partnerId: "partner-qa",
          amount: 600,
          termMonths: 6,
          paymentFrequency: "MONTHLY",
          policy: {
            policyId: "SHORT-MONTHLY",
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
        termMonths: 6,
        paymentFrequency: "MONTHLY",
        numberOfPayments: 6,
      });
      const sum = res.body.installments.payments.reduce(
        (acc: number, p: { amount: number }) => acc + p.amount,
        0
      );
      expect(sum).toBe(600);
    }
  );

  test(
    "override term only, frequency comes from partner default " +
      "(MONTHLY)",
    async () => {
      const res = await request(app)
        .post("/api/v1/finance/decision")
        .send({
          partnerId: "partner-qa",
          amount: 1800,
          termMonths: 18,
          policy: {
            policyId: "TERM-ONLY-OVERRIDE",
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
        termMonths: 18,
        paymentFrequency: "MONTHLY",
        numberOfPayments: 18,
      });
      expect(res.body.installments.payments[0].amount).toBe(100);
    }
  );

  test(
    "override frequency only, term comes from partner default " +
      "(12 months)",
    async () => {
      const res = await request(app)
        .post("/api/v1/finance/decision")
        .send({
          partnerId: "partner-qa",
          amount: 1200,
          paymentFrequency: "QUARTERLY",
          policy: {
            policyId: "FREQ-ONLY-OVERRIDE",
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
        paymentFrequency: "QUARTERLY",
        numberOfPayments: 4,
      });

      const amounts = res.body.installments.payments.map(
        (p: { amount: number }) => p.amount
      );
      expect(amounts).toEqual([300, 300, 300, 300]);
    }
  );

  test("validation error: missing partnerId", async () => {
    const res = await request(app)
      .post("/api/v1/finance/decision")
      .send({
        amount: 1000,
        policy: {
          policyId: "VAL-001",
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

  test("validation error: missing policy.attributes", async () => {
    const res = await request(app)
      .post("/api/v1/finance/decision")
      .send({
        partnerId: "partner-qa",
        amount: 1000,
        policy: {
          policyId: "VAL-002",
        },
      })
      .expect(400);

    expect(res.body.financeable).toBe(false);
    expect(res.body.errors[0].code).toBe("BAD_REQUEST");
  });

  test(
    "invalid paymentFrequency is ignored; partner defaults apply " +
      "(not rejected)",
    async () => {
      const res = await request(app)
        .post("/api/v1/finance/decision")
        .send({
          partnerId: "partner-qa",
          amount: 1000,
          termMonths: 12,
          paymentFrequency: "WEEKLY",
          policy: {
            policyId: "VAL-003",
            attributes: {
              state: "CA",
              riskTier: "LOW",
            },
          },
        })
        .expect(200);

      expect(res.body.financeable).toBe(true);
      expect(res.body.installments.paymentFrequency).toBe("MONTHLY");
    }
  );
});

describe("Finance decision API - partner with no defaults", () => {
  test(
    "falls back to 12 months and MONTHLY when term and " +
      "frequency are omitted",
    async () => {
      const res = await request(app)
        .post("/api/v1/finance/decision")
        .send({
          partnerId: "partner-no-defaults",
          amount: 1200,
          policy: {
            policyId: "NODEF-001",
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
      const sum = res.body.installments.payments.reduce(
        (acc: number, p: { amount: number }) => acc + p.amount,
        0
      );
      expect(sum).toBe(1200);
    }
  );

  test(
    "explicit term with no defaults still uses MONTHLY as " +
      "global fallback",
    async () => {
      const res = await request(app)
        .post("/api/v1/finance/decision")
        .send({
          partnerId: "partner-no-defaults",
          amount: 900,
          termMonths: 9,
          policy: {
            policyId: "NODEF-002",
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
        termMonths: 9,
        paymentFrequency: "MONTHLY",
        numberOfPayments: 9,
      });
      const sum = res.body.installments.payments.reduce(
        (acc: number, p: { amount: number }) => acc + p.amount,
        0
      );
      expect(sum).toBe(900);
    }
  );

  test(
    "explicit QUARTERLY frequency with custom term and no " +
      "defaults",
    async () => {
      const res = await request(app)
        .post("/api/v1/finance/decision")
        .send({
          partnerId: "partner-no-defaults",
          amount: 1800,
          termMonths: 18,
          paymentFrequency: "QUARTERLY",
          policy: {
            policyId: "NODEF-003",
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
        termMonths: 18,
        paymentFrequency: "QUARTERLY",
        numberOfPayments: 6,
      });
      const sum = res.body.installments.payments.reduce(
        (acc: number, p: { amount: number }) => acc + p.amount,
        0
      );
      expect(sum).toBe(1800);
    }
  );
});
