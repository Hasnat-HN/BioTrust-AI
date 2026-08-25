# BioTrust AI

## The Idea

As I started using AI more extensively in bioinformatics and biostatistics, I began to see both its potential and its limitations. It can accelerate analysis, suggest methods, generate code, and help interpret complex results. But scientific work needs more than a convincing answer. It needs a clear and defensible record of how that answer was reached.

Through my own experience, and from seeing other researchers face similar challenges, I noticed that AI-assisted analysis can quickly become difficult to trace. Methods may be suggested without enough context, assumptions can remain hidden, alternative approaches may be overlooked, and interpretations can go beyond what the data actually support. It can also become unclear which decisions came from the researcher and which were suggested by AI.

BioTrust AI is an attempt to make that process more transparent. The idea is to preserve the benefits of AI while making every important analytical decision, assumption, result, validation step, limitation, and interpretation visible, traceable, and easier to evaluate.

The aim is simple: AI should help researchers reason through an analysis, not become a black box they are expected to trust.

**Live web application:** [Open BioTrust AI](https://hasnat-hn.github.io/BioTrust-AI/)

The public application runs the complete synthetic workflow in the browser and produces downloadable PDF, CSV, and JSON records. Private dataset uploads remain disabled unless a separately secured computation service is connected. Run the project locally to execute real count matrices within the controlled Docker boundary.

The site always opens on **How it works**. The next page, **Example**, asks which synthetic expression features and tumor-microenvironment programs are associated with synthetic PD-1 response in melanoma. Dataset inspection, selectable analysis modules, JavaScript methods, genuine browser-R methods, AI guidance, confirmation, execution, interpretation, and downloads all stay together on that one page.

## What is implemented

- Interactive Next.js/Vinext research workspace that ships with synthetic demonstration data and connects to the local controlled execution API for real datasets
- Deterministic melanoma tumor-microenvironment case with 180 synthetic tumors, 1,200 generic expression features, and no real patient or gene data
- Graphical pre-analysis profile of data type, dimensions, group sizes, library sizes, zero rate, tumor purity, batches, stage, biopsy site, and method-suitability checks
- Researcher-selectable analysis modules for JavaScript DGE, genuine R-package DGE, TME program summaries, tumor-purity sensitivity, and neural integration
- Researcher-selectable adjusted log-CPM regression, Welch screening, and Wilcoxon rank-sum screening; one method can run alone and two or more automatically activate comparison
- Real R 4.6 execution in the browser through webR, with selectable `stats` adjusted OLS, Welch, and Wilcoxon methods, package-version recording, complete 1,200-feature output, and R results CSV export
- Pairwise effect-rank agreement, sign concordance, top-feature overlap, FDR overlap, consensus features, and a question-matched method recommendation
- Multivariable score and feature models adjusting for age, recorded sex, disease stage, biopsy site, prior systemic therapy, tumor purity, and sequencing batch
- Analysis-plan builder embedded directly in Example whose question, modules, JavaScript methods, R methods, comparison depth, and purity threshold control the execution
- Local AI method guide that explains suitability, limitations, covariate capability, evidence boundaries, and the consequences of the researcher's current choices
- Result-review and adversarial-review surface
- Evidence-synthesis engine that connects method agreement, disagreement, covariate capability, neural prediction, claim boundaries, and next analyses back to cited evidence IDs
- Deterministic 13-input, 8-hidden-unit neural integration model with five-fold cross-validation, AUROC, balanced accuracy, Brier score, and explicitly non-causal weight-path sensitivity
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

Open **Example** to run the complete synthetic workflow, including the local webR methods. For a real count matrix, open **Controlled R runner** in the sidebar. You can start with [`examples/counts.csv`](examples/counts.csv) and [`examples/metadata.csv`](examples/metadata.csv), then select `condition`, `control`, and `treated`. The Docker backend contains the pinned Bioconductor execution environment.

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

The hosted application is frontend-contained unless the repository variable `BIOTRUST_API_URL` points to an authenticated controlled runner whose CORS policy explicitly permits the GitHub Pages origin. The webR engine downloads an R WebAssembly runtime and executes the synthetic matrix locally in the browser; it does not upload that matrix. Do not configure a public unauthenticated endpoint for private research data. The hosted neural engine operates only on the generated synthetic cohort and performs exploratory prediction; it is not a causal, mechanistic, diagnostic, or biomarker-validation tool. Count-native edgeR and DESeq2 execution remains inside the controlled R service because the public browser module uses transformed-count `stats` methods, not Bioconductor substitutes. Custom Method Cards document methods but do not make arbitrary code executable.

## Ownership and permitted use

Copyright © 2026 Hasnat Noor. All rights reserved. This repository is publicly viewable for evaluation and demonstration, but it is not open-source software. Copying, modification, redistribution, publication, sublicensing, resale, commercial exploitation, derivative works, and competing use are not permitted without prior written permission. See [LICENSE](LICENSE) for the full proprietary notice.
