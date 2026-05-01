import { PaymentFrequency } from "./policy";

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
