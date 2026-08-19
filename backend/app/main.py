from __future__ import annotations

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware

from .models import AIContextPreview, AIContextRequest, AnalysisPlan, Claim, ClaimReviewInput, Dataset, EvidenceAssessment, EvidenceInput, MethodCard, Project
from .execution import ExecutionFailedError, ExecutionResponse, ExecutionUnavailableError, ExecutionValidationError, available_methods, execute_differential_expression, runtime_status
from .privacy import build_context_preview
from .rules import assess_evidence, review_claim
from .store import seed_synthetic_demo, store


app = FastAPI(
    title="BioTrust AI API",
    version="0.1.0",
    description="Structured scientific provenance and privacy boundary for the BioTrust AI MVP.",
)
app.add_middleware(CORSMiddleware, allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"], allow_methods=["*"], allow_headers=["*"])
seed_synthetic_demo()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "privacy_default": "NO_EXTERNAL_AI_MODE"}


@app.get("/api/projects", response_model=list[Project])
def list_projects() -> list[Project]:
    return store.list("projects")


@app.post("/api/projects", response_model=Project, status_code=201)
def create_project(project: Project) -> Project:
    return store.add("projects", project)


@app.get("/api/datasets", response_model=list[Dataset])
def list_datasets() -> list[Dataset]:
    return store.list("datasets")


@app.post("/api/datasets", response_model=Dataset, status_code=201)
def create_dataset(dataset: Dataset) -> Dataset:
    if not store.get("projects", dataset.project_id):
        raise HTTPException(404, "Project not found")
    return store.add("datasets", dataset)


@app.get("/api/analysis-plans", response_model=list[AnalysisPlan])
def list_analysis_plans() -> list[AnalysisPlan]:
    return store.list("analysis_plans")


@app.post("/api/analysis-plans", response_model=AnalysisPlan, status_code=201)
def create_analysis_plan(plan: AnalysisPlan) -> AnalysisPlan:
    if not store.get("datasets", plan.dataset_id):
        raise HTTPException(404, "Dataset not found")
    return store.add("analysis_plans", plan)


@app.get("/api/claims", response_model=list[Claim])
def list_claims() -> list[Claim]:
    return store.list("claims")


@app.post("/api/claims", response_model=Claim, status_code=201)
def create_claim(claim: Claim) -> Claim:
    if claim.claim_type != "UNSUPPORTED" and not claim.supporting_results:
        raise HTTPException(422, "Supported claims require at least one supporting result")
    return store.add("claims", claim)


@app.get("/api/methods", response_model=list[MethodCard])
def list_methods() -> list[MethodCard]:
    return store.list("methods")


@app.get("/api/execution/methods")
def list_execution_methods() -> list[dict[str, str]]:
    return available_methods()


@app.get("/api/execution/health")
def execution_health() -> dict:
    return runtime_status()


@app.post("/api/executions/run", response_model=ExecutionResponse)
async def run_execution(
    method: str = Form(...),
    condition_column: str = Form(...),
    reference_level: str = Form(...),
    comparison_level: str = Form(...),
    covariates: str = Form(""),
    counts_file: UploadFile = File(...),
    metadata_file: UploadFile = File(...),
) -> ExecutionResponse:
    if not (counts_file.filename or "").lower().endswith(".csv") or not (metadata_file.filename or "").lower().endswith(".csv"):
        raise HTTPException(422, "Count matrix and metadata must be CSV files")
    counts_payload = await counts_file.read()
    metadata_payload = await metadata_file.read()
    selected_covariates = [item.strip() for item in covariates.split(",") if item.strip()]
    try:
        return execute_differential_expression(
            method=method,
            counts_payload=counts_payload,
            metadata_payload=metadata_payload,
            condition_column=condition_column.strip(),
            reference_level=reference_level.strip(),
            comparison_level=comparison_level.strip(),
            covariates=selected_covariates,
        )
    except ExecutionValidationError as exc:
        raise HTTPException(422, str(exc)) from exc
    except ExecutionUnavailableError as exc:
        raise HTTPException(503, str(exc)) from exc
    except ExecutionFailedError as exc:
        raise HTTPException(500, f"Controlled analysis failed: {exc}") from exc


@app.post("/api/methods", response_model=MethodCard, status_code=201)
def create_method(method: MethodCard) -> MethodCard:
    safe_method = method.model_copy(update={"curation_status": "REVIEW_REQUIRED", "origin": "CUSTOM"})
    return store.add("methods", safe_method)


@app.put("/api/methods/{method_id}", response_model=MethodCard)
def update_method(method_id: str, method: MethodCard) -> MethodCard:
    existing = store.get("methods", method_id)
    if not existing:
        raise HTTPException(404, "Method Card not found")
    if existing.origin != "CUSTOM":
        raise HTTPException(403, "Built-in Method Cards require the curated source workflow")
    safe_method = method.model_copy(update={"id": method_id, "curation_status": "REVIEW_REQUIRED", "origin": "CUSTOM"})
    return store.update("methods", method_id, safe_method)


@app.delete("/api/methods/{method_id}", status_code=204)
def delete_method(method_id: str) -> None:
    existing = store.get("methods", method_id)
    if not existing:
        raise HTTPException(404, "Method Card not found")
    if existing.origin != "CUSTOM":
        raise HTTPException(403, "Built-in Method Cards cannot be deleted")
    store.delete("methods", method_id)


@app.post("/api/privacy/context-preview", response_model=AIContextPreview)
def context_preview(request: AIContextRequest) -> AIContextPreview:
    return build_context_preview(request)


@app.post("/api/rules/review-claim")
def claim_review(request: ClaimReviewInput) -> list[dict[str, str]]:
    return [warning.__dict__ for warning in review_claim(request.text, request.metadata)]


@app.post("/api/evidence/assess", response_model=EvidenceAssessment)
def evidence_assessment(request: EvidenceInput) -> EvidenceAssessment:
    return assess_evidence(request)
