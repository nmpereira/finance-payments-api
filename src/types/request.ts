import { PaymentFrequency, Policy } from "./policy";

export interface FinanceDecisionRequest {
  partnerId: string;
  amount: number;
  termMonths?: number;
  paymentFrequency?: PaymentFrequency;
  policy: Policy;
}
