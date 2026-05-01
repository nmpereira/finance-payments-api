export type PaymentFrequency = "MONTHLY" | "QUARTERLY" | "ANNUALLY";

export interface PolicyAttributes {
  [key: string]: string | number | boolean;
}

export interface Policy {
  policyId?: string;
  attributes: PolicyAttributes;
}

export interface FinanceDecisionRequest {
  partnerId: string;
  amount: number;
  termMonths?: number;
  paymentFrequency?: PaymentFrequency;
  policy: Policy;
}

export type Operator =
  | "EQ"
  | "NE"
  | "GT"
  | "GTE"
  | "LT"
  | "LTE"
  | "IN"
  | "NOT_IN";

export interface RuleCondition {
  field: string;
  operator: Operator;
  value: unknown;
}

export type RuleEffect = "DENY" | "ALLOW";

export interface Rule {
  id: string;
  description: string;
  when: RuleCondition[];
  effect: RuleEffect;
  errorCode?: string;
  errorMessage?: string;
}

export interface PartnerRuleSetDefaults {
  termMonths?: number;
  paymentFrequency?: PaymentFrequency;
}

export interface PartnerRuleSet {
  partnerId: string;
  rules: Rule[];
  defaults?: PartnerRuleSetDefaults;
}

export interface EvaluationError {
  code: string;
  message: string;
}

export interface RulesEvaluationResult {
  financeable: boolean;
  errors: EvaluationError[];
}

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
