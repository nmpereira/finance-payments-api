# Architecture

```mermaid
flowchart TB
  subgraph clients [Clients]
    Agency[B2B_API_consumer]
  end
  subgraph express [Express_app]
    AM[authMiddleware]
    HR[health_route]
    FR[finance_routes]
    AR[admin_routes]
  end
  subgraph controllers [Controllers]
    FC[financeController]
    AC[adminController]
  end
  subgraph domain [Domain]
    FDS[financeDecisionService]
    RE[rulesEngine]
    IC[installmentCalculator]
    VAL[parseFinanceDecisionRequest]
  end
  subgraph config [In_memory_config]
    PR[partnerRules_Map]
    SEED[defaultRuleSet_seed]
  end
  Agency --> AM
  AM --> HR
  AM --> FR
  AM --> AR
  FR --> FC
  AR --> AC
  FC --> VAL
  FC --> FDS
  AC --> PR
  FDS --> RE
  FDS --> IC
  FDS --> PR
  SEED --> PR
```

- **HTTP**: `authMiddleware` is a no-op placeholder for this POC.
- **Finance flow**: Validate JSON → load partner rule set → evaluate DENY rules → if financeable, compute installments (defaults: request overrides, then partner `defaults`, then 12 months + `MONTHLY`).
- **Admin flow**: CRUD partner rule sets into the in-memory map only (no database).
