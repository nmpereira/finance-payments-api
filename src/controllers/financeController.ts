import { NextFunction, Request, Response } from "express";
import { performance } from "node:perf_hooks";
import { getAllPartnerRuleSets } from "../config/partnerRules";
import { makeFinanceDecision } from "../services/financeDecisionService";
import { parseFinanceDecisionRequest } from "../validation/financeDecisionRequest";

export function postFinanceDecision(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const start = performance.now();

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

    const durationMs = performance.now() - start;

    console.log(
      `Finance decision for partner=${parsed.value.partnerId} ` +
        `took ${durationMs.toFixed(2)}ms`
    );

    res.json({
      ...outcome.response,
      metrics: {
        evaluationTimeMs: durationMs
      }
    });
  } catch (error) {
    next(error);
  }
}

export function getPartnerRules(_req: Request, res: Response): void {
  res.status(200).json(getAllPartnerRuleSets());
}
