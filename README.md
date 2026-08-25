# BioTrust AI

## The Idea

As I started using AI more extensively in bioinformatics and biostatistics, I began to see both its potential and its limitations. It can accelerate analysis, suggest methods, generate code, and help interpret complex results. But scientific work needs more than a convincing answer. It needs a clear and defensible record of how that answer was reached.

Through my own experience, and from seeing other researchers face similar challenges, I noticed that AI-assisted analysis can quickly become difficult to trace. Methods may be suggested without enough context, assumptions can remain hidden, alternative approaches may be overlooked, and interpretations can go beyond what the data actually support. It can also become unclear which decisions came from the researcher and which were suggested by AI.

BioTrust AI is an attempt to make that process more transparent. The idea is to preserve the benefits of AI while making every important analytical decision, assumption, result, validation step, limitation, and interpretation visible, traceable, and easier to evaluate.

The aim is simple: AI should help researchers reason through an analysis, not become a black box they are expected to trust.

**Live web application:** [Open BioTrust AI](https://hasnat-hn.github.io/BioTrust-AI/)

The public application runs entirely in the browser. It provides one complete synthetic example and a working **Analyze your data** path that reads a count matrix and sample metadata locally, profiles the study, lets the researcher choose the question and methods, executes selected JavaScript and R `stats` analyses, compares them, and exports PDF, CSV, and JSON records. Uploaded files are not sent to BioTrust or an external AI service.

The public navigation deliberately has only three destinations: **How it works**, **Example**, and **Analyze your data**. Example is the only built-in demonstration and uses a synthetic melanoma tumor-microenvironment study. Its bundled count matrix and metadata are loaded with one button, descriptive exploration runs automatically, and every JavaScript method, R method, supporting analysis, confirmation, execution, interpretation, and download stays together on that page.

## What is implemented

- Three-page public workflow: How it works, one Example, and Analyze your data
- Browser-local CSV/TSV loading for feature-by-sample counts plus sample metadata
- Automatic sample matching, input validation, matrix dimensions, zero rate, library-size graph, and metadata-variable detection
- Researcher-defined question, condition column, reference/comparison levels, and optional numeric or categorical covariates
- Selectable adjusted log-CPM regression, Welch, and Wilcoxon methods in JavaScript and genuine R through webR
- Multi-method comparison of effect direction, top features, and FDR calls with a question-matched recommendation
- Downloadable complete results CSV, audit JSON, and scientific PDF report
- One deterministic melanoma tumor-microenvironment example with 180 synthetic tumors and 1,200 generic features
- Optional synthetic program summaries, tumor-purity sensitivity, and bounded neural integration in the Example
- Controlled edgeR quasi-likelihood and DESeq2 Wald adapters for count-native analysis through the secured Docker runner
- Explicit interpretation boundaries: association is not causality, method agreement is not replication, and browser transformed-count methods are not edgeR or DESeq2

## Run locally with Docker

```bash
git clone https://github.com/Hasnat-HN/BioTrust-AI.git
cd BioTrust-AI
docker compose up --build
```

Open `http://localhost:3000`. Raw research data are not required by the synthetic demonstration and must not be committed to this repository.

Open **Example**, load its two bundled files, review the automatic exploration, then choose and confirm the analyses and methods to run. Open **Analyze your data** to load a real count matrix and metadata directly in the browser, inspect the structure, define the contrast and covariates, and choose JavaScript or R `stats` methods. The public browser path is limited to 500 samples and 5,000 features. The Docker backend contains the pinned Bioconductor environment for count-native edgeR and DESeq2 execution.

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
