import { NextFunction, Request, Response } from "express";
import { makeFinanceDecision } from "../services/financeDecisionService";
import { parseFinanceDecisionRequest } from "../validation/financeDecisionRequest";

export function postFinanceDecision(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const parsed = parseFinanceDecisionRequest(req.body);

    if (!parsed.ok) {
      res.status(400).json({
        financeable: false,
        errors: [parsed.error]
      });
      return;
    }

    const outcome = makeFinanceDecision(parsed.value);

    if (outcome.kind === "unknown_partner") {
      res.status(404).json({
        financeable: false,
        errors: [
          {
            code: "UNKNOWN_PARTNER",
            message: `No rule set configured for partnerId=${outcome.partnerId}`
          }
        ]
      });
      return;
    }

    res.json(outcome.response);
  } catch (error) {
    next(error);
  }
}
