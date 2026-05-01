import { InstallmentPlan } from "../types/installments";
import { PaymentFrequency } from "../types/policy";

/**
 * Simple installment calculator:
 * - Defaults assume termMonths is compatible with frequency.
 * - Last payment adjusts for rounding so the sum equals the original amount.
 */
export function calculateInstallments(
  amount: number,
  termMonths: number,
  frequency: PaymentFrequency
): InstallmentPlan {
  if (amount <= 0) {
    throw new Error("Amount must be greater than zero.");
  }

  if (termMonths <= 0) {
    throw new Error("termMonths must be greater than zero.");
  }

  let numberOfPayments: number;

  switch (frequency) {
    case "MONTHLY":
      numberOfPayments = termMonths;
      break;
    case "QUARTERLY":
      numberOfPayments = termMonths / 3;
      break;
    case "ANNUALLY":
      numberOfPayments = termMonths / 12;
      break;
    default:
      numberOfPayments = termMonths;
  }

  if (!Number.isInteger(numberOfPayments) || numberOfPayments <= 0) {
    throw new Error(
      `Invalid combination of termMonths=${termMonths} ` +
        `and paymentFrequency=${frequency}`
    );
  }

  const payments = [];
  const rawPayment = amount / numberOfPayments;
  const basePayment = Math.floor(rawPayment * 100) / 100;

  let accumulated = 0;

  for (let i = 1; i <= numberOfPayments; i += 1) {
    const isLast = i === numberOfPayments;
    const amountForThis = isLast
      ? Number((amount - accumulated).toFixed(2))
      : basePayment;

    accumulated += amountForThis;

    payments.push({
      sequence: i,
      amount: amountForThis
    });
  }

  return {
    termMonths,
    paymentFrequency: frequency,
    numberOfPayments,
    payments
  };
}
