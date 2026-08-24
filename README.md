# BioTrust AI

## The Idea

As I started using AI more extensively in bioinformatics and biostatistics, I began to see both its potential and its limitations. It can accelerate analysis, suggest methods, generate code, and help interpret complex results. But scientific work needs more than a convincing answer. It needs a clear and defensible record of how that answer was reached.

Through my own experience, and from seeing other researchers face similar challenges, I noticed that AI-assisted analysis can quickly become difficult to trace. Methods may be suggested without enough context, assumptions can remain hidden, alternative approaches may be overlooked, and interpretations can go beyond what the data actually support. It can also become unclear which decisions came from the researcher and which were suggested by AI.

BioTrust AI is an attempt to make that process more transparent. The idea is to preserve the benefits of AI while making every important analytical decision, assumption, result, validation step, limitation, and interpretation visible, traceable, and easier to evaluate.

The aim is simple: AI should help researchers reason through an analysis, not become a black box they are expected to trust.

**Live web application:** [Open BioTrust AI](https://hasnat-hn.github.io/BioTrust-AI/)

The public application runs the complete synthetic workflow in the browser and produces downloadable PDF, CSV, and JSON records. Private dataset uploads remain disabled unless a separately secured computation service is connected. Run the project locally to execute real count matrices within the controlled Docker boundary.

The default worked case asks whether a synthetic T-cell-inflamed expression program is associated with synthetic PD-1 response in melanoma. The researcher must review the estimand, seven clinical and technical covariates, assumptions, reference levels, sensitivity threshold, and claim ceiling before any data are generated or analyzed.

## What is implemented

- Interactive Next.js/Vinext research workspace that ships with synthetic demonstration data and connects to the local controlled execution API for real datasets
- Deterministic melanoma tumor-microenvironment case with 180 synthetic tumors, 1,200 generic expression features, and no real patient or gene data
- Multivariable score and feature models adjusting for age, recorded sex, disease stage, biopsy site, prior systemic therapy, tumor purity, and sequencing batch
- Structured analysis-plan builder with an exact formula preview
- AI proposal lifecycle with explicit accept, modify, and reject actions
- Result-review and adversarial-review surface
- Evidence-synthesis engine that connects adjustment effects, sensitivity results, program coherence, contradictions, claim boundaries, and next analyses back to cited evidence IDs
- Claim ledger with scientific statement classifications
- Searchable Method Card library
- 18 built-in Method Cards including edgeR, DESeq2, limma, camera, ROAST, fgsea, dream, SVA, ComBat-seq, regression, correlation, and PCA
- Researcher-created Method Cards with local persistence, JSON import/export, and mandatory review labeling
- Append-only provenance timeline and sanitized JSON audit export
- AI Context Inspector with `NO_EXTERNAL_AI_MODE`
- FastAPI foundation for projects, datasets, analysis plans, claims, context previews, and evidence assessment
- Controlled edgeR quasi-likelihood and DESeq2 Wald execution adapters for real RNA-seq count matrices
- Strict CSV validation, method allowlisting, temporary input handling, SHA-256 audit hashes, software versions, and downloadable results
- Nine-step guided analysis flow explaining what the researcher does, what BioTrust checks, why each step matters, and what still needs review
- Downloadable scientific PDF report with the question, method rationale, decision trail, result preview, limitations, software versions, and hashes
- Deterministic privacy, claim-warning, and evidence rules with tests

## Run locally with Docker

```bash
git clone https://github.com/Hasnat-HN/BioTrust-AI.git
cd BioTrust-AI
docker compose up --build
```

Open `http://localhost:3000`. Raw research data are not required by the synthetic demonstration and must not be committed to this repository.

Open **Run analysis** in the sidebar. You can start with [`examples/counts.csv`](examples/counts.csv) and [`examples/metadata.csv`](examples/metadata.csv), then select `condition`, `control`, and `treated`. The Docker backend contains the pinned Bioconductor execution environment.

See [the controlled execution guide](docs/EXECUTION_LAYER.md) for the accepted CSV format, limits, security boundary, and method-extension process.

## Local development

Frontend:

```bash
npm install
npm run dev
```

Backend:

```bash
python3 -m venv .venv
.venv/bin/pip install -r backend/requirements.txt
.venv/bin/uvicorn backend.app.main:app --reload --port 8000
```

Verification:

```bash
npm test
.venv/bin/pytest backend/tests
```

The hosted application is frontend-contained unless the repository variable `BIOTRUST_API_URL` points to an authenticated controlled runner whose CORS policy explicitly permits the GitHub Pages origin. Do not configure a public unauthenticated endpoint for private research data. The current evidence-synthesis engine is a transparent local rule system. Its optional neural adapter is deliberately marked `NOT_CONNECTED`; any future model must receive only sanitized summaries, cite executed evidence records, and require researcher approval. Custom Method Cards document methods but do not make arbitrary code executable.

## Ownership and permitted use

Copyright © 2026 Hasnat Noor. All rights reserved. This repository is publicly viewable for evaluation and demonstration, but it is not open-source software. Copying, modification, redistribution, publication, sublicensing, resale, commercial exploitation, derivative works, and competing use are not permitted without prior written permission. See [LICENSE](LICENSE) for the full proprietary notice.
