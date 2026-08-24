# Controlled execution layer

BioTrust can execute two curated differential-expression workflows inside a controlled Docker boundary:

- `edger_qlf`: edgeR quasi-likelihood testing with `filterByExpr`, TMM normalization, dispersion estimation, and `glmQLFTest`
- `deseq2_wald`: DESeq2 Wald testing with a declared count prefilter and an explicit comparison contrast

The public web application executes its fixed synthetic fixture in the browser and can export a scientific PDF, result CSV, and audit JSON. Real inputs are accepted by the locally running FastAPI service at `http://localhost:8000`. The frontend is also ready to connect to a separately deployed online service, but that connection must not be enabled until authentication, isolated execution, retention controls, and an explicit CORS allowlist are in place.

## Input contract

The count matrix must be a UTF-8 CSV whose first column is `feature_id`. Every other column is a unique sample identifier, and every count must be a non-negative integer.

```csv
feature_id,Control_1,Control_2,Treated_1,Treated_2
GENE_A,120,132,402,385
GENE_B,260,248,255,268
```

The metadata must be a UTF-8 CSV with one unique `sample_id` row for every count-matrix sample. The selected condition and covariate column names must contain only letters, numbers, and underscores, starting with a letter.

```csv
sample_id,condition,batch
Control_1,control,A
Control_2,control,B
Treated_1,treated,A
Treated_2,treated,B
```

BioTrust requires at least two replicates in both selected groups and exact agreement between the two sample sets. Default limits are 50 MB per file, 50,000 features, 500 samples, and 15 minutes of runtime.

## Security boundary

The API accepts only method identifiers from a fixed allowlist. It does not accept R code, shell commands, formulas, file paths, or package names from the requester. The process is started with an argument array and `shell=False`, and runs in a fresh temporary directory that is deleted when the request finishes. Docker runs the API with dropped Linux capabilities, a read-only root filesystem, and a bounded temporary filesystem.

For each completed run, the response records SHA-256 hashes for both inputs and the result, the exact design, sample and feature counts, retained feature count, R and package versions, execution time, warnings, and the gene-level result table.

### Online deployment gate

GitHub Pages hosts static browser files; it does not run the R/Bioconductor container. An online real-data workflow therefore needs a separate HTTPS computation service. Before setting the GitHub repository variable `BIOTRUST_API_URL`, the service must have all of the following:

1. User authentication and per-user authorization.
2. Isolated jobs with CPU, memory, upload-size, and runtime limits.
3. Encrypted transport and encrypted temporary storage.
4. A documented automatic-deletion period for inputs and outputs.
5. Rate limiting, abuse protection, and cost limits.
6. Logs that exclude raw data, sample identifiers, and result values.
7. `BIOTRUST_ALLOWED_ORIGINS` restricted to the exact production web origin.
8. A privacy notice and researcher confirmation before upload.

The API URL is public configuration, not a secret. Credentials, signing keys, and provider tokens must never be embedded in the GitHub Pages build. See [ONLINE_DEPLOYMENT.md](ONLINE_DEPLOYMENT.md) for the exact release sequence.

## Add another executable method

Adding a Method Card does not make a method executable. A new executable method requires all of the following:

1. A stable identifier added to the backend allowlist.
2. A fixed adapter in `backend/runners` with no arbitrary-code input.
3. Validation rules for its input and design contract.
4. Tests for successful execution, rejection paths, and audit output.
5. Curator review of the method assumptions and official documentation.

This separation lets the knowledge library grow without silently widening the computation boundary.
