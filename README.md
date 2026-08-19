# BioTrust AI

## The Idea

As I started using AI more extensively in bioinformatics and biostatistics, I began to see both its potential and its limitations. It can accelerate analysis, suggest methods, generate code, and help interpret complex results. But scientific work needs more than a convincing answer. It needs a clear and defensible record of how that answer was reached.

Through my own experience, and from seeing other researchers face similar challenges, I noticed that AI-assisted analysis can quickly become difficult to trace. Methods may be suggested without enough context, assumptions can remain hidden, alternative approaches may be overlooked, and interpretations can go beyond what the data actually support. It can also become unclear which decisions came from the researcher and which were suggested by AI.

BioTrust AI is an attempt to make that process more transparent. The idea is to preserve the benefits of AI while making every important analytical decision, assumption, result, validation step, limitation, and interpretation visible, traceable, and easier to evaluate.

The aim is simple: AI should help researchers reason through an analysis, not become a black box they are expected to trust.

**Live web demonstration:** [Open BioTrust AI](https://hasnat-hn.github.io/BioTrust-AI/)

The live demonstration is safe for public exploration and does not accept private datasets. Run the project locally to execute real count matrices within the controlled Docker boundary.

## What is implemented

- Interactive Next.js/Vinext research workspace that ships with synthetic demonstration data and connects to the local controlled execution API for real datasets
- Structured analysis-plan builder with an exact formula preview
- AI proposal lifecycle with explicit accept, modify, and reject actions
- “Can I trust this result?” evidence and adversarial-review surface
- Claim ledger with scientific statement classifications
- Searchable Method Card library
- 18 built-in Method Cards including edgeR, DESeq2, limma, camera, ROAST, fgsea, dream, SVA, ComBat-seq, regression, correlation, and PCA
- Researcher-created Method Cards with local persistence, JSON import/export, and mandatory review labeling
- Append-only provenance timeline and sanitized JSON audit export
- AI Context Inspector with `NO_EXTERNAL_AI_MODE`
- FastAPI foundation for projects, datasets, analysis plans, claims, context previews, and evidence assessment
- Controlled edgeR quasi-likelihood and DESeq2 Wald execution adapters for real RNA-seq count matrices
- Strict CSV validation, method allowlisting, temporary input handling, SHA-256 audit hashes, software versions, and downloadable results
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

The hosted demonstration is intentionally frontend-contained and does not receive raw research data. Real count-matrix execution is local-only through the controlled edgeR and DESeq2 adapters. No real AI provider is connected; custom Method Cards document methods but do not make arbitrary code executable.
