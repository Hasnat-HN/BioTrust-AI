from fastapi.testclient import TestClient

from backend.app.main import app


client = TestClient(app)


def test_health_and_seeded_synthetic_project() -> None:
    health = client.get("/health")
    assert health.status_code == 200
    assert health.json()["privacy_default"] == "NO_EXTERNAL_AI_MODE"
    projects = client.get("/api/projects")
    assert projects.status_code == 200
    assert projects.json()[0]["name"] == "Synthetic transcriptomic association study"


def test_claim_requires_supporting_result() -> None:
    response = client.post("/api/claims", json={"text": "A supported claim with no result.", "claim_type": "INFERENCE", "status": "SUPPORTED", "supporting_results": []})
    assert response.status_code == 422


def test_context_preview_route_blocks_raw_matrix() -> None:
    response = client.post("/api/privacy/context-preview", json={"provider": "mock", "purpose": "review", "mode": "STANDARD_MODE", "context": {"method_name": "cameraPR", "raw_matrix": [[1, 2]]}, "user_approved": True})
    assert response.status_code == 200
    body = response.json()
    assert body["sanitized_payload"] == {"method_name": "cameraPR"}
    assert body["blocked_fields"] == ["raw_matrix"]


def test_built_in_methods_include_multiple_rnaseq_workflows() -> None:
    response = client.get("/api/methods")
    assert response.status_code == 200
    names = {method["name"] for method in response.json()}
    assert {"limma-voom", "edgeR quasi-likelihood", "DESeq2 Wald test"} <= names


def test_researcher_method_is_forced_to_review_required() -> None:
    response = client.post("/api/methods", json={
        "id": "MTH-CUSTOM-TEST",
        "name": "Synthetic custom method",
        "package": "syntheticPackage",
        "function": "fit_synthetic",
        "category": "Other",
        "scientific_question_answered": "Does a synthetic feature differ?",
        "questions_not_answered": ["Causality"],
        "assumptions": ["Synthetic inputs"],
        "failure_modes": ["Mis-specified input"],
        "interpretation_rules": ["Do not overinterpret"],
        "curation_status": "VERIFIED",
    })
    assert response.status_code == 201
    assert response.json()["curation_status"] == "REVIEW_REQUIRED"
    assert response.json()["origin"] == "CUSTOM"


def test_built_in_method_cannot_be_deleted() -> None:
    response = client.delete("/api/methods/MTH-EDGER-QL")
    assert response.status_code == 403
