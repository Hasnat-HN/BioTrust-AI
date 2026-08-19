# Architecture

## System shape

```mermaid
flowchart TD
  R["Researcher"] --> Q["Scientific question"]
  Q --> P["Structured analysis plan"]
  P --> A["Optional AI proposal"]
  A --> D{"Accept / Modify / Reject"}
  D --> P
  P --> C["Controlled computation layer"]
  C --> O["Executed outputs + hashes"]
  O --> V["Deterministic validation and rules"]
  O --> S["Sanitized result summary"]
  S --> AR["Adversarial AI reviewer"]
  V --> L["Claim ledger"]
  AR --> L
  L --> E["Evidence profile"]
  E --> X["Reproducible report and audit export"]
```

## Components

- **Frontend:** Next.js-compatible TypeScript UI. The hosted MVP uses immutable synthetic seed records.
- **Application API:** FastAPI with Pydantic boundary validation and append-only provenance semantics.
- **Database:** SQLite for local development; PostgreSQL is the intended production system of record.
- **Computation:** future isolated R/Python jobs launched only from allowlisted workflow specifications.
- **Rules:** deterministic privacy, evidence, interpretation, and leakage checks.
- **AI adapter:** future provider-neutral interface. It can receive only the output of the Context Inspector.

## Data flow

```mermaid
sequenceDiagram
  participant U as Researcher
  participant W as Web application
  participant C as Secure computation
  participant R as Rule engine
  participant A as External AI
  U->>W: Confirm structured plan
  W->>C: Plan + local dataset reference
  C->>C: Process raw data locally
  C-->>W: Results, hashes, sanitized summaries
  W->>R: Metadata + claims
  R-->>W: Deterministic warnings and evidence profile
  W->>U: Inspect outbound context preview
  alt Standard Mode and explicitly approved
    W->>A: Allowlisted sanitized payload
    A-->>W: Schema-validated proposal or critique
  else No External AI Mode
    W-->>W: Block request and record hash-only attempt
  end
```

## Authority model

Generated prose is never the source of truth. The authority order is: executed output → structured analysis record → deterministic validation → approved researcher decision → AI explanation.

## Major unresolved decisions

- Approved secure compute backends and job isolation profile
- Institutional identity and authorization model
- Controlled vocabulary for sensitive metadata
- Method Card curation and review governance
- Retention policy for stdout, stderr, and sanitized summaries
