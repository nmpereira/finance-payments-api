import { PartnerRuleSet } from "../types";

/**
 * In a real system, this would come from a database or external config.
 * For this POC, it's an in-memory array.
 */
const partnerRuleSets: PartnerRuleSet[] = [
  {
    partnerId: "partner-123",
    defaults: {
      termMonths: 12,
      paymentFrequency: "MONTHLY"
    },
    rules: [
      {
        id: "deny_google_wallet_over_100k_for_hotels",
        description:
          "Deny Google Wallet payments over 100k for hotel business type",
        when: [
          {
            field: "policy.attributes.paymentMethod",
            operator: "EQ",
            value: "GOOGLE_WALLET"
          },
          {
            field: "policy.attributes.businessType",
            operator: "EQ",
            value: "hotel"
          },
          {
            field: "amount",
            operator: "GT",
            value: 100000
          }
        ],
        effect: "DENY",
        errorCode: "MAX_AMOUNT_EXCEEDED",
        errorMessage:
          "Google Wallet payments over 100000 are not financeable " +
          "for hotel policies."
      }
    ]
  }
];

export function getPartnerRuleSet(
  partnerId: string
): PartnerRuleSet | undefined {
  return partnerRuleSets.find((set) => set.partnerId === partnerId);
}

