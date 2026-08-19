# BioTrust AI

> Don’t trust the AI. Trust the evidence trail.

BioTrust AI is a local-first research-software MVP for inspectable, reproducible, and scientifically conservative AI-assisted bioinformatics. It keeps raw research data inside the computation boundary and makes method choices, user decisions, deterministic warnings, provenance, and claims independently auditable.

## What is implemented

- Interactive Next.js/Vinext research workspace that ships with synthetic demonstration data and is designed for local analysis of real datasets once a controlled computation adapter is connected
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
- Deterministic privacy, claim-warning, and evidence rules with tests

## Run locally with Docker

```bash
git clone https://github.com/Hasnat-HN/biotrust-ai.git
cd biotrust-ai
docker compose up --build
```

Open `http://localhost:3000`. Raw research data are not required by the synthetic demonstration and must not be committed to this repository.

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

The hosted demonstration is intentionally frontend-contained. The FastAPI service is the local development foundation for secure computation integration. No real AI provider or production bioinformatics job runner is connected in this MVP; custom Method Cards document methods but do not make arbitrary code executable.
