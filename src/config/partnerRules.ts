import { PartnerRuleSet } from "../types/rules";
import { defaultPartnerRuleSet } from "./defaultRuleSet";

/**
 * In-memory store: NOT persisted across restarts.
 * Seeded with a default rule set for the POC demo.
 */
const partnerRuleSets = new Map<string, PartnerRuleSet>();



partnerRuleSets.set(defaultPartnerRuleSet.partnerId, defaultPartnerRuleSet);

export function getPartnerRuleSet(
  partnerId: string
): PartnerRuleSet | undefined {
  return partnerRuleSets.get(partnerId);
}

export function upsertPartnerRuleSet(ruleSet: PartnerRuleSet): void {
  partnerRuleSets.set(ruleSet.partnerId, ruleSet);
}

export function deletePartnerRuleSet(partnerId: string): void {
  partnerRuleSets.delete(partnerId);
}

export function listPartnerRuleSets(): PartnerRuleSet[] {
  return Array.from(partnerRuleSets.values());
}
