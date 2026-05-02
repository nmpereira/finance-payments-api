import { EvaluationError } from "./evaluation";
import { InstallmentPlan } from "./installments";

export interface ApiError {
  code: string;
  message: string;
}

export interface FinanceDecisionResponse {
  financeable: boolean;
  errors: EvaluationError[];
  installments?: InstallmentPlan;
}
