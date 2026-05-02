# finance-payments-api

HTTP API that answers whether a transaction is **financeable** for a given partner, applies **partner-specific deny rules**, and—when approved—returns an **installment plan** (split schedule with rounding handled on the last payment).

Built with **Node.js**, **Express 5**, and **TypeScript**.

## Documentation

| Doc | Contents |
|-----|----------|
| [docs/architecture.md](docs/architecture.md) | Component diagram (Mermaid) and request flows |
| [docs/reference.md](docs/reference.md) | API examples, assumptions, configurability limits, dependencies, LLMs, scripts, project layout |
| [docs/openapi.yaml](docs/openapi.yaml) | OpenAPI 3 description |

## Quick start

```bash
npm install
npm run dev
```

Server: `http://localhost:3000` unless **`PORT`** is set.

Run **`npm run build`** and **`npm test`** before submitting. Other scripts: `npm start`, `npm run typecheck`.

## API (summary)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/health` | Health check |
| `POST` | `/api/v1/finance/decision` | Financing decision + installments when eligible |
| `GET` | `/api/v1/partners` | List partner rule sets |
| `GET` | `/api/v1/partners/:partnerId/rules` | Get one rule set |
| `PUT` | `/api/v1/partners/:partnerId/rules` | Upsert rule set |
| `DELETE` | `/api/v1/partners/:partnerId/rules` | Remove rule set |

Partner rules and defaults live **in memory** (seeded on startup; not persisted across restarts). See [reference](docs/reference.md) for request fields, JSON examples, and responses.
