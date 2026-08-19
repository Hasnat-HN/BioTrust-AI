# BioTrust AI Agent Instructions

## Mission

Build software for auditable, reproducible, and scientifically conservative AI-assisted bioinformatics. Scientific integrity and data confidentiality take priority over feature count, speed, or UI polish.

## Confidentiality

Never insert confidential research information into this repository. Do not use real project names, disease-project details, cohorts, participant identifiers, unpublished sample counts, results, gene lists, effect sizes, figures, or biological interpretations.

Use synthetic and generic examples only. Approved terminology includes `Exposure_A`, `Exposure_B`, `Clinical_Score`, `Continuous_Trait`, `Group_A`, `Group_B`, `Tissue_A`, `Tissue_B`, `Cell_State_A`, `Cell_State_B`, and `Synthetic_Cohort`.

## Raw data boundary

Raw research data must not be sent to external AI systems by default. The AI reasoning layer operates only on explicit, structured, sanitized context. Never place raw matrices, sequencing data, participant metadata, variants, identifiers, or clinical records in AI prompts. Every outbound AI context must be inspectable before approval.

## Core scientific rule

Never treat LLM output as ground truth. Structured analysis objects, executed code, deterministic checks, and resulting outputs are authoritative. LLMs may propose, summarize, critique, and explain; they may not silently define scientific truth.

Every claim must be classified as one of `DATA`, `METHOD`, `AI_CHOICE`, `USER_CHOICE`, `INFERENCE`, `HYPOTHESIS`, or `UNSUPPORTED`. Never silently convert association to causation, cross-sectional association to progression, enrichment to cell abundance, prediction to mechanism, correlation to mediation, non-significance to no effect, or internal validation to external replication.

## AI proposals and user control

AI scientific output is always a proposal. The researcher must explicitly `ACCEPT`, `MODIFY`, or `REJECT` it before it changes an analysis plan. Preserve the original `AI_CHOICE`; acceptance creates an additional `USER_CHOICE` record.

## Reproducibility

Analysis runs capture the scientific question, dataset version and hashes, sample selection, preprocessing, model, parameters, software versions, code and output hashes, random seeds, execution environment, validations, sensitivity analyses, claims, and limitations.

## Evidence assessment

Evidence scoring is deterministic and rule-based. An LLM may explain the result but may not generate a hidden score or confidence percentage.

## Testing and security

Use deterministic synthetic fixtures. Test sample filtering, formula construction, multiple-testing correction, leakage controls, provenance, claim classification, evidence rules, and AI context blocking. Never expose arbitrary unrestricted shell execution. Treat uploaded files as untrusted. Never commit secrets.

## Workflow

Before a scientific feature: define the question, document assumptions, identify failure modes, implement the structured behavior, write tests, run tests, and document provenance implications. Do not silently change scientific behavior merely to satisfy a test.

BioTrust AI is research software. It is not clinical diagnosis, medical advice, or a replacement for statistical review.
