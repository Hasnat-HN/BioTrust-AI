# Local-first deployment

BioTrust AI is designed to look like a web application while running on a researcher’s own workstation or institutional server.

```text
Researcher browser
        ↓
http://localhost:3000
        ↓
BioTrust frontend + local FastAPI service
        ↓
Approved local / institutional computation
        ↓
Raw research data remain inside the local boundary
```

Start the full local stack with:

```bash
docker compose up --build
```

Then open `http://localhost:3000`. The structured API is available at `http://localhost:8000/docs`.

The current repository contains the interface, structured API, deterministic privacy and evidence rules, Method Card management, tests, and synthetic demonstration. A real R/Python scientific job runner remains a later controlled-compute phase; the current interface never exposes arbitrary shell execution and must not be represented as executing production RNA-seq analyses.

For institutional deployment, place the same containers behind institutional authentication and storage, then add a reviewed compute adapter for local Docker, Slurm, SGE, Kubernetes, Nextflow, or another approved environment.
