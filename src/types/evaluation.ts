export interface EvaluationError {
  code: string;
  message: string;
}

export interface RulesEvaluationResult {
  financeable: boolean;
  errors: EvaluationError[];
}
