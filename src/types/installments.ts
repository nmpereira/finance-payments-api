import { PaymentFrequency } from "./policy";

export interface InstallmentPayment {
  sequence: number;
  amount: number;
}

export interface InstallmentPlan {
  termMonths: number;
  paymentFrequency: PaymentFrequency;
  numberOfPayments: number;
  payments: InstallmentPayment[];
}
