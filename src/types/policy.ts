export type PaymentFrequency = "MONTHLY" | "QUARTERLY" | "ANNUALLY";

export interface PolicyAttributes {
  [key: string]: string | number | boolean;
}

export interface Policy {
  policyId?: string;
  attributes: PolicyAttributes;
}
