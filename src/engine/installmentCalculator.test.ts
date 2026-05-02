import { calculateInstallments } from "./installmentCalculator";

describe("calculateInstallments", () => {
  test("throws when amount is zero or negative", () => {
    expect(() =>
      calculateInstallments(0, 12, "MONTHLY")
    ).toThrow("Amount must be greater than zero.");
    expect(() =>
      calculateInstallments(-10, 12, "MONTHLY")
    ).toThrow("Amount must be greater than zero.");
  });

  test("throws when termMonths is zero or negative", () => {
    expect(() =>
      calculateInstallments(100, 0, "MONTHLY")
    ).toThrow("termMonths must be greater than zero.");
    expect(() =>
      calculateInstallments(100, -1, "MONTHLY")
    ).toThrow("termMonths must be greater than zero.");
  });

  test("throws when term and frequency yield non-integer payment count", () => {
    expect(() =>
      calculateInstallments(1000, 11, "QUARTERLY")
    ).toThrow("Invalid combination of termMonths=11 and paymentFrequency=QUARTERLY");
  });

  test("sum of payments equals original amount (rounding)", () => {
    const plan = calculateInstallments(100.01, 3, "MONTHLY");
    const sum = plan.payments.reduce((acc, p) => acc + p.amount, 0);
    expect(sum).toBeCloseTo(100.01, 10);
    expect(plan.payments).toHaveLength(3);
  });

  test("QUARTERLY with compatible term produces integer payments", () => {
    const plan = calculateInstallments(1200, 12, "QUARTERLY");
    expect(plan.numberOfPayments).toBe(4);
    const sum = plan.payments.reduce((acc, p) => acc + p.amount, 0);
    expect(sum).toBe(1200);
  });
});
