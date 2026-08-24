# Online product release plan

This document separates what works publicly today from what must exist before BioTrust accepts private research data online.

## What works on the public site now

The GitHub Pages application is a no-login public demonstration. A visitor can:

1. Open the Overview without seeing preloaded results.
2. Read the complete nine-step analysis path.
3. Explicitly run the fixed synthetic fixture.
4. Review the result table and visible decision trail.
5. Download a scientific PDF, complete CSV, and audit JSON.
6. Inspect Method Cards, claims, evidence rules, and provenance.

No private file is sent anywhere in this mode.

## What “real analysis online” means

GitHub Pages remains the public frontend. A separate controlled service runs the existing FastAPI and R/Bioconductor container.

```text
Researcher browser
  → authenticated HTTPS request
  → upload validation and authorization
  → isolated BioTrust analysis job
  → edgeR or DESeq2 allowlisted runner
  → structured result + hashes + PDF-ready record
  → automatic deletion under the declared retention policy
```

The AI layer never receives the raw matrix, metadata, participant identifiers, or unrestricted result table.

## Required decisions before deployment

The repository owner must decide and document:

- Hosting region and provider.
- Whether any human-subject, clinical, or regulated data are permitted.
- Maximum upload size, sample count, feature count, and runtime.
- Input and result retention period; the recommended default is immediate input deletion after the job and result deletion within 24 hours.
- Authentication providers; email magic link plus Google and GitHub are the planned options.
- Who can create accounts during the first private pilot.
- Monthly spending limit and per-user run quota.
- Incident contact and deletion-request process.

## Recommended first production architecture

- **Frontend:** GitHub Pages at `https://hasnat-hn.github.io/BioTrust-AI/`.
- **Computation:** a managed container service capable of running the existing Bioconductor image. Google Cloud Run is the initial recommendation because it accepts containers and can scale to zero.
- **Authentication:** a managed identity provider that issues short-lived tokens; do not place a shared API token in browser code.
- **Job state:** a small database containing only user, job status, timestamps, policy acknowledgements, and hashes.
- **Files:** encrypted temporary object storage with lifecycle deletion; never commit uploads or write raw values to logs.
- **Isolation:** one constrained job per analysis, no shell input, fixed method allowlist, read-only container image, bounded temporary storage.

## Exact implementation sequence

1. Create the cloud project, region, billing budget, and alerts.
2. Deploy a private health-only revision of the container.
3. Add authentication and verify tokens on every real-data request.
4. Replace synchronous uploads with isolated jobs and expiring download links.
5. Add automatic input/output deletion and test it.
6. Add rate limits, quotas, audit events, and privacy-safe monitoring.
7. Run security, validation, concurrency, timeout, and deletion tests using synthetic fixtures only.
8. Configure `BIOTRUST_ALLOWED_ORIGINS=https://hasnat-hn.github.io` on the API.
9. Set the GitHub repository variable `BIOTRUST_API_URL` to the secured HTTPS endpoint.
10. Rebuild GitHub Pages and run a private pilot before permitting wider access.

## Release rule

The real-data upload controls must remain disabled whenever the API health check fails or no approved endpoint is configured. A public, unauthenticated real-data endpoint is not an acceptable intermediate release.
