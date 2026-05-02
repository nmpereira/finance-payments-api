import { PartnerRuleSet } from "../types";

export const defaultPartnerRuleSet: PartnerRuleSet[] = [
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