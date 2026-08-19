# Product specification

## Product promise

BioTrust AI is an audit and trust layer for AI-assisted bioinformatics. It does not ask researchers to treat AI output as evidence. It records what was proposed, what the researcher approved, what code executed, what the data demonstrated, what deterministic checks found, and what uncertainty remains.

## Primary users

- Researchers planning and interpreting bioinformatics analyses
- Bioinformaticians reviewing methods, code, and provenance
- Statisticians auditing model assumptions and validation
- Research leads approving reproducible reports

## MVP workflow

1. Register a local dataset by metadata and hash.
2. Define the scientific question and sample population.
3. Construct a structured analysis plan.
4. Review an optional sanitized AI method proposal.
5. Accept, modify, or reject the proposal.
6. Confirm the exact formula, preprocessing, and multiple-testing family.
7. Execute in an approved local or secure computation layer.
8. Attach deterministic warnings, validation, and sensitivity records.
9. Classify claims and trace them to results.
10. Export a sanitized reproducibility and audit record.

## Non-goals

- Clinical diagnosis or treatment recommendations
- Autonomous scientific decision-making
- Unrestricted code or shell execution from the browser
- AI-generated confidence percentages
- Silent upload of raw research data to an AI provider
- Claims of mechanism or causality without suitable evidence

## MVP acceptance criteria

- Every visible claim has a classification and source.
- Every analysis plan exposes its exact formula before confirmation.
- AI proposals cannot execute or silently mutate a plan.
- Prohibited context cannot enter an AI payload.
- Evidence dimensions are derived from transparent rules.
- Demonstration content is synthetic and reproducible.
