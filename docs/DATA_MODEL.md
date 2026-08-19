# Data model

## Core entities

- `Project`: privacy mode, ownership, status, timestamps.
- `Dataset`: modality, local reference, schema summary, content hash, synthetic flag.
- `AnalysisPlan`: scientific question, population, roles, formula, preprocessing, method, parameters, validation and sensitivity plans, creator.
- `AnalysisRun`: immutable execution record and status.
- `MethodCard`: structured scientific method knowledge and curation status.
- `ProvenanceEvent`: append-only event linked to plans, runs, claims, and artifacts.
- `Claim`: classified scientific statement with supporting results, limitations, warnings, and status.
- `ValidationCheck` and `SensitivityAnalysis`: planned and executed challenge records.
- `EvidenceAssessment`: deterministic rule results and overall state.
- `Artifact`: hash-addressed output or report.
- `AIProposal`: immutable proposal lifecycle.
- `AIContextRecord`: hash-only outbound context audit.

## Invariants

- Accepted AI proposals are not rewritten; acceptance adds a `USER_CHOICE` record.
- Provenance events are append-only.
- Dataset hashes and analysis-plan hashes are immutable once used by a run.
- A claim must reference at least one supporting result or explicitly be `UNSUPPORTED`.
- Evidence assessment stores rule versions and inputs, not just a display state.
- Raw dataset content is not stored in `AIContextRecord`.

## Production persistence

PostgreSQL should enforce foreign keys, immutable run snapshots, unique content hashes per project scope, and append-only provenance through restricted database roles or triggers. SQLite is sufficient for early local development but is not the target concurrent production store.
