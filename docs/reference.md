# Reference

Companion to the root [README](../README.md): behavior details, API examples, assumptions, and project layout.

## What it does

1. **Partner rule sets** — Each partner has a configurable list of rules. Rules match when **all** conditions in `when` are true for the incoming request.
2. **Deny semantics** — Matching rules with `effect: "DENY"` collect errors. If any DENY rule matches, the decision is not financeable and errors are returned. **Approval is implicit**: there is no separate allow-list rule type; if no DENY rule matches, the request is financeable (subject to installment calculation).
3. **Installments** — If nothing denies the request, the API computes payment count from `termMonths`, optional `paymentFrequency` (`MONTHLY`, `QUARTERLY`, `ANNUALLY`), and `amount`, and returns a per-payment breakdown.

Rule fields can reference `amount`, `termMonths`, `paymentFrequency`, `policy.policyId`, and `policy.attributes.<key>` (see `src/engine/rulesEngine.ts`). Operators include `EQ`, `NE`, `GT`, `GTE`, `LT`, `LTE`, `IN`, and `NOT_IN`. Conditions may use `operator` or `op` as a shorthand.

## Storage

Partner configurations live in an **in-memory map** (`src/config/partnerRules.ts`). They are **not persisted** across process restarts. On startup, the server seeds the store from `src/config/defaultRuleSet.ts` (demo partner `partner-123`). Use `PUT /api/v1/partners/:partnerId/rules` to load or update a rule set at runtime without changing code.

## API

Base path: `/api/v1` for protected routes. JSON bodies use `Content-Type: application/json`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check: status, timestamp, uptime (no `/api/v1` prefix) |
| `POST` | `/api/v1/finance/decision` | Evaluate a finance decision |
| `GET` | `/api/v1/partners` | List all partner rule sets |
| `GET` | `/api/v1/partners/:partnerId/rules` | Get one partner’s rule set |
| `PUT` | `/api/v1/partners/:partnerId/rules` | Upsert a partner rule set (`partnerId` from URL) |
| `DELETE` | `/api/v1/partners/:partnerId/rules` | Remove a partner’s rule set |

### Decision request (fields)

| Field | Type | Required |
|-------|------|----------|
| `partnerId` | string | yes |
| `amount` | number | yes |
| `termMonths` | number | no |
| `paymentFrequency` | `"MONTHLY"` \| `"QUARTERLY"` \| `"ANNUALLY"` | no |
| `policy.policyId` | string | no |
| `policy.attributes` | object (open map of string keys) | yes |

Defaults for installments: `termMonths` and `paymentFrequency` from the request, else from the partner’s `defaults` in the rule set, else **12** months and **MONTHLY**.

### Example: financeable decision

Request `POST /api/v1/finance/decision`:

```json
{
  "partnerId": "partner-123",
  "amount": 50000,
  "policy": {
    "policyId": "POL-001",
    "attributes": {
      "paymentMethod": "ACH",
      "businessType": "hotel"
    }
  }
}
```

Example **200** response (abbreviated):

```json
{
  "financeable": true,
  "errors": [],
  "installments": {
    "termMonths": 12,
    "paymentFrequency": "MONTHLY",
    "numberOfPayments": 12,
    "payments": [
      { "sequence": 1, "amount": 4166.66 },
      { "sequence": 2, "amount": 4166.66 }
    ]
  }
}
```

### Example: denied (matching DENY rule)

```json
{
  "financeable": false,
  "errors": [
    {
      "code": "MAX_AMOUNT_EXCEEDED",
      "message": "Google Wallet payments over 100000 are not financeable for hotel policies."
    }
  ]
}
```

### Example: validation error **400**

```json
{
  "financeable": false,
  "errors": [
    {
      "code": "BAD_REQUEST",
      "message": "partnerId (string), amount (number) and policy.attributes (object) are required."
    }
  ]
}
```

### Example: upsert partner rules `PUT /api/v1/partners/acme-corp/rules`

```json
{
  "defaults": {
    "termMonths": 12,
    "paymentFrequency": "MONTHLY"
  },
  "rules": [
    {
      "id": "deny-high-amount",
      "description": "Reject amounts over 250000",
      "when": [
        { "field": "amount", "operator": "GT", "value": 250000 }
      ],
      "effect": "DENY",
      "errorCode": "MAX_AMOUNT",
      "errorMessage": "Maximum financed amount is 250000"
    }
  ]
}
```

**200** response:

```json
{
  "message": "Rule set updated.",
  "partnerId": "acme-corp"
}
```

### Responses (summary)

- **200** — Decision JSON: `financeable`, `errors`, and optionally `installments` when financeable (including some DENY cases returned as 200 with `financeable: false`).
- **400** — Validation failure (`financeable: false`, `errors`).
- **404** — Unknown partner on decision (`UNKNOWN_PARTNER`).
- **500** — Unhandled errors (wrapped by middleware).

Machine-readable contract: [`openapi.yaml`](openapi.yaml).

## Assumptions

- **No datastore** — All partner configuration is in memory; restarting the process loses updates unless you re-seed or call the admin API again.
- **Policy attributes** — `policy.attributes` is an open map. Business dimensions (e.g. `state`, `country`, `businessType`) are added by partners in JSON and referenced in rules as `policy.attributes.<key>` without API schema changes.
- **Missing attributes** — If a rule references `policy.attributes.state` but the request omits `state`, the resolved value is undefined and that condition does **not** match; DENY rules depending on that attribute will not fire (fail-safe toward “not denied” for that condition). Partners should send attributes required by their rules.
- **Invalid `paymentFrequency`** — Values other than `MONTHLY`, `QUARTERLY`, or `ANNUALLY` are ignored; installment computation falls back to partner defaults or global defaults (see tests).
- **Auth** — `authMiddleware` is intentionally a no-op for this POC; production would use API keys, JWT, or mTLS.
- **Term vs frequency** — `termMonths` is interpreted as the financed policy term in months. Payment count derives from frequency (e.g. quarterly ⇒ `termMonths / 3` payments). Invalid combinations (non-integer payment counts) cause **500** from the installment calculator.

## Limits of configurability

What can be changed **without code deploy** (via partner rule JSON):

- New **policy dimensions** under `policy.attributes.*` used in `when` conditions.
- Thresholds, membership lists (`IN` / `NOT_IN`), and messages for DENY rules.

What **requires code changes**:

- New **operators** or condition shapes (e.g. regex, cross-field comparisons, computed expressions like `amount * taxRate`).
- New **top-level request fields** (must extend `parseFinanceDecisionRequest` and types).
- **OR** inside a single rule’s `when` — conditions are **AND** only; model OR using separate rules (each DENY can match independently).
- **Persistence**, auditing, or multi-node consistency — out of scope for this POC.

## Dependencies

| Package | Role |
|---------|------|
| [express](https://expressjs.com/) | HTTP server and routing |
| [typescript](https://www.typescriptlang.org/) | Static typing |
| [tsx](https://github.com/privatenumber/tsx) | Run TypeScript in dev (`npm run dev`) |
| [jest](https://jestjs.io/) | Unit and integration tests |
| [supertest](https://github.com/ladjs/supertest) | HTTP assertions in tests |
| [@types/*](https://github.com/DefinitelyTyped/DefinitelyTyped) | Type definitions for Node, Express, Jest, Supertest |

Runtime production dependency is **express** only; the rest are dev/test tooling.

## LLMs

If you used an LLM during development, document a few representative prompts you used. Examples of prompts that match this codebase:

1. “Review this Express + TypeScript rules engine: should DENY rules short-circuit or collect all errors?”
2. “Write Jest integration tests for POST /finance/decision that cover partner defaults and rounding on the last installment.”
3. “List edge cases for quarterly installments when termMonths is not divisible by 3.”

Replace or extend with your own prompts if you used different ones.

## Scripts

| Script | Command |
|--------|---------|
| Dev (watch) | `npm run dev` |
| Compile | `npm run build` |
| Run compiled app | `npm start` (runs `dist/server.js`) |
| Typecheck only | `npm run typecheck` |
| Tests | `npm test` |

Before submission, run **`npm run build`** and **`npm test`** and confirm both succeed.

## Project layout

| Area | Role |
|------|------|
| `src/server.ts` | App wiring, `/health`, mounts routes |
| `src/routes/` | Finance and admin route definitions |
| `src/controllers/` | HTTP parsing and status codes |
| `src/services/financeDecisionService.ts` | Orchestrates rules + installments |
| `src/engine/rulesEngine.ts` | Condition evaluation |
| `src/engine/installmentCalculator.ts` | Payment schedule |
| `src/config/` | In-memory partner store and seed data |
| `src/validation/` | Request parsing for finance decisions |
| `src/types/` | Shared types |
| `docs/openapi.yaml` | OpenAPI 3 description of the HTTP API |
