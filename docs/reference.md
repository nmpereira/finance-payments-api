# Reference

Companion to the root [README](../README.md). Copy/paste **request and response JSON** is in [`examples.md`](examples.md).

## Contents

- [Overview](#overview)
- [Endpoints](#endpoints)
- [Decision request fields](#decision-request-fields)
- [HTTP status summary](#http-status-summary)
- [Storage](#storage)
- [Assumptions](#assumptions)
- [Limits of configurability](#limits-of-configurability)
- [Dependencies](#dependencies)
- [LLMs](#llms)
- [Scripts](#scripts)
- [Project layout](#project-layout)

---

## Overview

### Behavior

Partners configure **DENY** rules. A rule applies when **every** condition in `when` matches the request. Any matching DENY adds an error; if there are errors, the decision is not financeable. **Approval is implicit** when no DENY rule matches—there is no separate allow rule type.

Installments are computed only when financeable, using `amount`, resolved `termMonths`, and `paymentFrequency` (see defaults below).

Rule conditions can read `amount`, `termMonths`, `paymentFrequency`, `policy.policyId`, and `policy.attributes.<key>` (see `src/engine/rulesEngine.ts`). Operators: `EQ`, `NE`, `GT`, `GTE`, `LT`, `LTE`, `IN`, `NOT_IN`. Use `operator` or `op` in JSON.

---

## Endpoints

Base path for routes below: `/api/v1`. JSON bodies use `Content-Type: application/json`.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check: status, timestamp, uptime (no `/api/v1` prefix) |
| `POST` | `/api/v1/finance/decision` | Evaluate a finance decision |
| `GET` | `/api/v1/partners` | List all partner rule sets |
| `GET` | `/api/v1/partners/:partnerId/rules` | Get one partner’s rule set |
| `PUT` | `/api/v1/partners/:partnerId/rules` | Upsert a partner rule set (`partnerId` from URL) |
| `DELETE` | `/api/v1/partners/:partnerId/rules` | Remove a partner’s rule set |

---

## Decision request fields

| Field | Type | Required |
|-------|------|----------|
| `partnerId` | string | yes |
| `amount` | number | yes |
| `termMonths` | number | no |
| `paymentFrequency` | `"MONTHLY"` \| `"QUARTERLY"` \| `"ANNUALLY"` | no |
| `policy.policyId` | string | no |
| `policy.attributes` | object (open map) | yes |

**Defaults for installments:** values from the request, else the partner rule set’s `defaults`, else **12** months and **MONTHLY**.

For worked examples (approved, denied, validation, unknown partner, admin PUT, quarterly override), see [`examples.md`](examples.md).

---

## HTTP status summary

| Status | When |
|--------|------|
| **200** | Decision JSON (`financeable`, `errors`; `installments` when financeable). Some denials still return **200** with `financeable: false`. |
| **400** | Body validation failed |
| **404** | Unknown `partnerId` on `/finance/decision` |
| **500** | Unhandled server error |

---

## Storage

Partner configuration is an **in-memory map** in `src/config/partnerRules.ts`—**not** persisted across restarts. Startup seeds from `src/config/defaultRuleSet.ts` (includes demo `partner-123`). Use `PUT /api/v1/partners/:partnerId/rules` to load or change rules without redeploying code.

---

## Assumptions

### Data and persistence

- **No datastore** — Restart clears in-memory changes unless you re-seed or call the admin API again.

### Policy attributes

- **`policy.attributes`** is an open map (e.g. `state`, `businessType`). Rules reference `policy.attributes.<key>` without API schema changes.
- **Missing keys** — If a rule references `policy.attributes.state` but the request omits `state`, that condition does not match; dependent DENY rules do not fire. Partners should send attributes their rules need.

### Request handling

- **Invalid `paymentFrequency`** — Values outside `MONTHLY` / `QUARTERLY` / `ANNUALLY` are ignored; defaults apply (see tests).
- **Term vs frequency** — `termMonths` is the financed term in months; payment count follows frequency (e.g. quarterly ⇒ `termMonths / 3`). Invalid combinations (non-integer payment counts) produce **500** from the installment calculator.

### Auth

- **`authMiddleware`** is a no-op for this POC. Production would use API keys, JWT, or mTLS.

---

## Limits of configurability

**Configurable without a code deploy** (partner rule JSON):

- New dimensions under `policy.attributes.*` in `when` conditions.
- Thresholds, `IN` / `NOT_IN` lists, and DENY messages.

**Requires code changes:**

- New **operators** or condition shapes (regex, cross-field math, etc.).
- New **top-level request fields** (extend validation and types).
- **OR** inside one rule’s `when` — only **AND** is supported; use multiple rules for OR-like behavior.
- **Persistence**, auditing, multi-node consistency — out of POC scope.

---

## Dependencies

| Package | Role |
|---------|------|
| [express](https://expressjs.com/) | HTTP server and routing |
| [typescript](https://www.typescriptlang.org/) | Static typing |
| [tsx](https://github.com/privatenumber/tsx) | Run TypeScript in dev (`npm run dev`) |
| [jest](https://jestjs.io/) | Unit and integration tests |
| [supertest](https://github.com/ladjs/supertest) | HTTP assertions in tests |
| [@types/*](https://github.com/DefinitelyTyped/DefinitelyTyped) | Type definitions for Node, Express, Jest, Supertest |

Runtime dependency: **express** only; other packages are dev/test tooling.

---

## LLMs

If you used an LLM during development, document a few representative prompts. Examples:

1. “Review this Express + TypeScript rules engine: should DENY rules short-circuit or collect all errors?”
2. “Write Jest integration tests for POST /finance/decision that cover partner defaults and rounding on the last installment.”
3. “List edge cases for quarterly installments when termMonths is not divisible by 3.”

Replace or extend with your own prompts.

---

## Scripts

| Script | Command |
|--------|---------|
| Dev (watch) | `npm run dev` |
| Compile | `npm run build` |
| Run compiled app | `npm start` (runs `dist/server.js`) |
| Typecheck only | `npm run typecheck` |
| Tests | `npm test` |

Before submission, run **`npm run build`** and **`npm test`**.

---

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
| `docs/examples.md` | Copy/paste HTTP request/response examples |
| `docs/architecture.md` | Architecture diagram and flows |
