import { Router, Request, Response, NextFunction } from "express";
import { performance } from "node:perf_hooks";
import { FinanceDecisionRequest, PaymentFrequency } from "../types";
import { getPartnerRuleSet } from "../config/partnerRules";
import { evaluateRules } from "../engine/rulesEngine";
import { calculateInstallments } from "../engine/installmentCalculator";

const router = Router();

function isValidPaymentFrequency(value: unknown): value is PaymentFrequency {
  return (
    value === "MONTHLY" || value === "QUARTERLY" || value === "ANNUALLY"
  );
}

router.post(
  "/finance/decision",
  async (req: Request, res: Response, next: NextFunction) => {
    const start = performance.now();

    try {
      const raw = req.body as any;

      if (
        !raw ||
        typeof raw.partnerId !== "string" ||
        typeof raw.amount !== "number" ||
        !raw.policy ||
        typeof raw.policy !== "object" ||
        !raw.policy.attributes ||
        typeof raw.policy.attributes !== "object"
      ) {
        res.status(400).json({
          financeable: false,
          errors: [
            {
              code: "BAD_REQUEST",
              message:
                "partnerId (string), amount (number) and " +
                "policy.attributes (object) are required."
            }
          ]
        });
        return;
      }

      const request: FinanceDecisionRequest = {
        partnerId: raw.partnerId,
        amount: raw.amount,
        termMonths: typeof raw.termMonths === "number" ? raw.termMonths : undefined,
        paymentFrequency: isValidPaymentFrequency(raw.paymentFrequency)
          ? raw.paymentFrequency
          : undefined,
        policy: {
          policyId: raw.policy.policyId,
          attributes: raw.policy.attributes
        }
      };

      const partnerConfig = getPartnerRuleSet(request.partnerId);

      if (!partnerConfig) {
        res.status(404).json({
          financeable: false,
          errors: [
            {
              code: "UNKNOWN_PARTNER",
              message: `No rule set configured for partnerId=${request.partnerId}`
            }
          ]
        });
        return;
      }

      const evaluation = evaluateRules(request, partnerConfig);

      let installments = undefined;

      if (evaluation.financeable) {
        const termMonths = request.termMonths ?? partnerConfig.defaults?.termMonths ?? 12;
        const paymentFrequency =
          request.paymentFrequency ?? partnerConfig.defaults?.paymentFrequency ?? "MONTHLY";

        installments = calculateInstallments(
          request.amount,
          termMonths,
          paymentFrequency
        );
      }

      const durationMs = performance.now() - start;

      console.log(
        `Finance decision for partner=${request.partnerId} ` +
          `took ${durationMs.toFixed(2)}ms`
      );

      res.json({
        financeable: evaluation.financeable,
        errors: evaluation.errors,
        installments,
        metrics: {
          evaluationTimeMs: durationMs
        }
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;