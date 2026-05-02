import { Request, Response } from "express";
import {
  deletePartnerRuleSet,
  getPartnerRuleSet,
  listPartnerRuleSets,
  upsertPartnerRuleSet
} from "../config/partnerRules";
import { PartnerRuleSet } from "../types/rules";

export function listPartners(_req: Request, res: Response): void {
  res.json(listPartnerRuleSets());
}

export function getPartnerRules(req: Request, res: Response): void {
  const partnerId = req.params.partnerId as string;
  const ruleSet = getPartnerRuleSet(partnerId);

  if (!ruleSet) {
    res.status(404).json({
      message: `No rule set found for partnerId=${partnerId}`
    });
    return;
  }

  res.json(ruleSet);
}

export function putPartnerRules(req: Request, res: Response): void {
  const partnerId = req.params.partnerId as string;
  const body = req.body as PartnerRuleSet;

  if (!body || !Array.isArray(body.rules)) {
    res.status(400).json({
      message: "Body must be a PartnerRuleSet with a 'rules' array."
    });
    return;
  }

  const ruleSet: PartnerRuleSet = {
    ...body,
    partnerId
  };

  upsertPartnerRuleSet(ruleSet);

  res.status(200).json({
    message: "Rule set updated.",
    partnerId
  });
}

export function deletePartnerRules(req: Request, res: Response): void {
  const partnerId = req.params.partnerId as string;
  deletePartnerRuleSet(partnerId);
  res.status(204).send();
}
