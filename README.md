# finance-payments-api

HTTP API that answers whether a transaction is **financeable** for a given partner, applies **partner-specific deny rules**, and—when approved—returns an **installment plan** (split schedule with rounding handled on the last payment).

Built with **Node.js**, **Express 5**, and **TypeScript**.

## What it does

1. **Partner rule sets** — Each partner has a configurable list of rules. Rules match when **all** conditions in `when` are true for the incoming request.
2. **Deny semantics** — Matching rules with `effect: "DENY"` collect errors. If any DENY rule matches, the decision is not financeable and errors are returned.
3. **Installments** — If nothing denies the request, the API computes payment count from `termMonths`, optional `paymentFrequency` (`MONTHLY`, `QUARTERLY`, `ANNUALLY`), and `amount`, and returns a per-payment breakdown.

Rule fields can reference `amount`, `termMonths`, `paymentFrequency`, `policy.policyId`, and `policy.attributes.<key>` (see `src/engine/rulesEngine.ts`). Operators include `EQ`, `NE`, `GT`, `GTE`, `LT`, `LTE`, `IN`, and `NOT_IN`.

## Storage

Partner configurations live in an **in-memory map** (`src/config/partnerRules.ts`). They are **not persisted** across process restarts. On startup, the server seeds the store from `src/config/defaultRuleSet.ts` (demo partner `partner-123`).

## API

Base path: `/api/v1`. JSON body for `POST` endpoints unless noted.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Liveness: status, timestamp, uptime |
| `POST` | `/finance/decision` | Evaluate a finance decision for `partnerId`, `amount`, and `policy` |
| `GET` | `/partners` | List all partner rule sets |
| `GET` | `/partners/:partnerId/rules` | Get one partner’s rule set |
| `PUT` | `/partners/:partnerId/rules` | Upsert a `PartnerRuleSet` (body must include `rules` array; `partnerId` is taken from the URL) |
| `DELETE` | `/partners/:partnerId/rules` | Remove a partner’s rule set |

### Decision request (summary)

Required: `partnerId` (string), `amount` (number), `policy.attributes` (object). Optional: `termMonths`, `paymentFrequency`, `policy.policyId`.

Defaults for term and frequency when computing installments come from the partner’s `defaults` in the rule set, then fall back to 12 months and `MONTHLY` if unset.

### Responses

- **200** — Decision JSON: `financeable`, `errors`, and optionally `installments` when financeable.
- **400** — Validation failure (`financeable: false`, `errors`).
- **404** — Unknown partner on decision (`UNKNOWN_PARTNER`).
- **500** — Unhandled errors (wrapped by middleware).

## Run locally

```bash
npm install
npm run dev
```

Server listens on `http://localhost:3000` unless `PORT` is set.

Other scripts: `npm run build`, `npm start` (runs compiled `dist/server.js`), `npm run typecheck`.

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
