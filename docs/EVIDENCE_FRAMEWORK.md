# Deterministic evidence framework

Each applicable dimension is scored from structured metadata: `0` unresolved or absent, `1` partial, `2` satisfied. `NOT_APPLICABLE` is stored explicitly.

| Dimension | Score 2 requires |
| --- | --- |
| Provenance | Dataset, plan, code, environment, and output hashes are present |
| Statistical appropriateness | Method requirements and declared assumptions pass checks |
| Multiple testing | Required correction and testing family are recorded |
| Robustness | Multiple relevant sensitivity checks completed |
| Held-out validation | Leak-free held-out evaluation succeeds when prediction is claimed |
| Independent support | Independently constructed reference evidence supports the claim |
| External replication | A separate eligible dataset reproduces the result |
| Confounding resolution | Major plausible confounders have been evaluated |
| Pre-specification | Question, population, model, and test family were pre-specified |
| Reproducibility | The analysis can be reproduced from its bundle and eligible input |

## Overall states

- `EXPLORATORY`: provenance or statistical appropriateness is incomplete, or a major warning remains.
- `SUPPORTED`: core provenance, appropriateness, and multiple-testing requirements are satisfied.
- `ROBUST_WITHIN_DATASET`: supported plus relevant sensitivity and confounding checks.
- `INTERNALLY_VALIDATED`: robust plus leak-free held-out validation where applicable.
- `EXTERNALLY_REPLICATED`: internally valid or non-predictive robust evidence reproduced in an eligible external dataset.

An LLM may explain the profile but cannot change scores, applicability, rule versions, or overall state.
