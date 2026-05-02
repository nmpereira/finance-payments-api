# HTTP examples

Copy the **Request body** blocks into `POST`/`PUT` calls. Base URL: `http://localhost:3000` (override with `PORT`). Use `Content-Type: application/json` for bodies.

Unless noted, examples assume the **seeded** partner `partner-123` from [`src/config/defaultRuleSet.ts`](../src/config/defaultRuleSet.ts) (fresh server after `npm run dev`).

---

### Finance decision — approved (installments)

**POST** `/api/v1/finance/decision`

**Request body**

```json
{
  "partnerId": "partner-123",
  "amount": 1200,
  "policy": {
    "policyId": "POL-001",
    "attributes": {
      "paymentMethod": "ACH",
      "businessType": "hotel"
    }
  }
}
```

**Expected response** — **200 OK**

```json
{
  "financeable": true,
  "errors": [],
  "installments": {
    "termMonths": 12,
    "paymentFrequency": "MONTHLY",
    "numberOfPayments": 12,
    "payments": [
      { "sequence": 1, "amount": 100 },
      { "sequence": 2, "amount": 100 },
      { "sequence": 3, "amount": 100 }
    ]
  }
}
```

The `payments` array has 12 entries; sequences 4–12 match sequence 3 (`100` each). The sum of all payments equals `1200`.

---

### Finance decision — denied (DENY rule)

Rule: Google Wallet + hotel + amount **>** `100000` → not financeable.

**POST** `/api/v1/finance/decision`

**Request body**

```json
{
  "partnerId": "partner-123",
  "amount": 150000,
  "policy": {
    "policyId": "POL-002",
    "attributes": {
      "paymentMethod": "GOOGLE_WALLET",
      "businessType": "hotel"
    }
  }
}
```

**Expected response** — **200 OK** (`financeable` false; no `installments`)

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

---

### Finance decision — validation error

**POST** `/api/v1/finance/decision`

**Request body** (missing required `amount`)

```json
{
  "partnerId": "partner-123",
  "policy": {
    "policyId": "POL-003",
    "attributes": {
      "paymentMethod": "ACH",
      "businessType": "hotel"
    }
  }
}
```

**Expected response** — **400 Bad Request**

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

---

### Finance decision — unknown partner

**POST** `/api/v1/finance/decision`

**Request body**

```json
{
  "partnerId": "no-such-partner",
  "amount": 1000,
  "policy": {
    "policyId": "POL-004",
    "attributes": {}
  }
}
```

**Expected response** — **404 Not Found**

```json
{
  "financeable": false,
  "errors": [
    {
      "code": "UNKNOWN_PARTNER",
      "message": "No rule set configured for partnerId=no-such-partner"
    }
  ]
}
```

---

### Upsert partner rules

**PUT** `/api/v1/partners/acme-corp/rules`

**Request body**

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

**Expected response** — **200 OK**

```json
{
  "message": "Rule set updated.",
  "partnerId": "acme-corp"
}
```

---

### Finance decision — using `acme-corp` rules (after upsert)

Run **Upsert partner rules** for `acme-corp` first (same process / session) so the partner exists. The upsert example installs a single DENY rule: amounts **greater than** `250000` are rejected.

#### Approved — amount under the limit

**POST** `/api/v1/finance/decision`

**Request body**

```json
{
  "partnerId": "acme-corp",
  "amount": 1200,
  "policy": {
    "policyId": "ACM-001",
    "attributes": {}
  }
}
```

**Expected response** — **200 OK**

```json
{
  "financeable": true,
  "errors": [],
  "installments": {
    "termMonths": 12,
    "paymentFrequency": "MONTHLY",
    "numberOfPayments": 12,
    "payments": [
      { "sequence": 1, "amount": 100 },
      { "sequence": 2, "amount": 100 },
      { "sequence": 3, "amount": 100 }
    ]
  }
}
```

The `payments` array has 12 entries of `100`; the sum equals `1200`.

#### Denied — amount over the limit

**POST** `/api/v1/finance/decision`

**Request body**

```json
{
  "partnerId": "acme-corp",
  "amount": 300000,
  "policy": {
    "policyId": "ACM-002",
    "attributes": {}
  }
}
```

**Expected response** — **200 OK** (`financeable` false)

```json
{
  "financeable": false,
  "errors": [
    {
      "code": "MAX_AMOUNT",
      "message": "Maximum financed amount is 250000"
    }
  ]
}
```

---

### Finance decision — quarterly frequency override

Same seeded partner `partner-123`; request overrides term and frequency for installment math.

**POST** `/api/v1/finance/decision`

**Request body**

```json
{
  "partnerId": "partner-123",
  "amount": 1200,
  "termMonths": 12,
  "paymentFrequency": "QUARTERLY",
  "policy": {
    "policyId": "POL-005",
    "attributes": {
      "paymentMethod": "ACH",
      "businessType": "hotel"
    }
  }
}
```

**Expected response** — **200 OK**

```json
{
  "financeable": true,
  "errors": [],
  "installments": {
    "termMonths": 12,
    "paymentFrequency": "QUARTERLY",
    "numberOfPayments": 4,
    "payments": [
      { "sequence": 1, "amount": 300 },
      { "sequence": 2, "amount": 300 },
      { "sequence": 3, "amount": 300 },
      { "sequence": 4, "amount": 300 }
    ]
  }
}
```

---

### Health check

**GET** `/health`

No body.

**Expected response** — **200 OK** — JSON includes `status`, `timestamp`, `uptimeSeconds` (values vary by time and process).
