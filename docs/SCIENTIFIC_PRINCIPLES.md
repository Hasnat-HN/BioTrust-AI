# Scientific principles

## Statement classes

| Class | Meaning |
| --- | --- |
| `DATA` | Directly calculated or observed from the dataset |
| `METHOD` | Established statistical or computational procedure |
| `AI_CHOICE` | Methodological proposal created by an AI system |
| `USER_CHOICE` | Explicit researcher selection or approval |
| `INFERENCE` | Interpretation supported but not directly measured |
| `HYPOTHESIS` | Biological explanation requiring further testing |
| `UNSUPPORTED` | Statement not adequately supported by available evidence |

## Interpretation guards

The system warns on association presented as causation, cross-sectional difference presented as progression, enrichment presented as measured abundance, prediction presented as mechanism, correlation presented as mediation, statistical significance presented as biological importance, non-significance presented as no effect, training performance presented as validation, and internal validation presented as external replication.

## Claim trace

Every claim should resolve through `Claim → Result → Statistical test → Analysis specification → Parameters → Code → Software versions → Dataset hash`.

## Conservative language

The strongest supported wording is preferred over the most interesting wording. An adversarial review is stored separately from primary results and cannot modify those results.

## Method Cards

Each supported method declares the question answered, questions not answered, required inputs, assumptions, preprocessing requirements, multiple-testing considerations, common failure modes, alternatives, validation, references, and interpretation limits. Unverified references are never presented as verified.
