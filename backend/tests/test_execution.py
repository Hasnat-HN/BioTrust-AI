from __future__ import annotations

import subprocess
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from backend.app import execution
from backend.app.main import app


client = TestClient(app)
COUNTS = b"""feature_id,C1,C2,T1,T2
gene_a,10,12,40,44
gene_b,30,28,31,29
"""
METADATA = b"""sample_id,condition,batch
C1,control,A
C2,control,B
T1,treated,A
T2,treated,B
"""


def test_execution_method_catalog_is_strictly_allowlisted() -> None:
    response = client.get("/api/execution/methods")
    assert response.status_code == 200
    assert {method["id"] for method in response.json()} == {"edger_qlf", "deseq2_wald"}


def test_controlled_execution_returns_audited_results(monkeypatch: pytest.MonkeyPatch) -> None:
    observed: dict = {}

    def fake_run(command: list[str], **kwargs: object) -> subprocess.CompletedProcess[str]:
        observed["command"] = command
        observed.update(kwargs)
        Path(command[5]).write_text(
            "feature_id,log2_fold_change,statistic,p_value,adjusted_p_value\n"
            "gene_a,1.9,8.2,0.001,0.002\n"
            "gene_b,0.1,0.2,0.8,0.8\n",
            encoding="utf-8",
        )
        Path(command[6]).write_text("version_R\t4.6.0\nversion_edgeR\t4.8.0\nretained_feature_count\t2\n", encoding="utf-8")
        return subprocess.CompletedProcess(command, 0, "", "")

    monkeypatch.setattr(execution.shutil, "which", lambda _: "/usr/bin/Rscript")
    monkeypatch.setattr(execution.subprocess, "run", fake_run)
    response = client.post(
        "/api/executions/run",
        data={
            "method": "edger_qlf",
            "condition_column": "condition",
            "reference_level": "control",
            "comparison_level": "treated",
            "covariates": "batch",
        },
        files={
            "counts_file": ("counts.csv", COUNTS, "text/csv"),
            "metadata_file": ("metadata.csv", METADATA, "text/csv"),
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "COMPLETE"
    assert body["design"] == "~ batch + condition"
    assert body["software_versions"] == {"R": "4.6.0", "edgeR": "4.8.0"}
    assert body["results"][0]["feature_id"] == "gene_a"
    assert len(body["input_hashes"]["counts_sha256"]) == 64
    assert observed["shell"] is False
    assert isinstance(observed["command"], list)


@pytest.mark.parametrize(
    ("field", "value", "expected"),
    [
        ("method", "arbitrary_r_code", "Method must be one of"),
        ("condition_column", "condition;system('id')", "Condition column must use"),
    ],
)
def test_execution_rejects_uncontrolled_inputs(field: str, value: str, expected: str) -> None:
    form = {
        "method": "edger_qlf",
        "condition_column": "condition",
        "reference_level": "control",
        "comparison_level": "treated",
        "covariates": "batch",
    }
    form[field] = value
    response = client.post(
        "/api/executions/run",
        data=form,
        files={
            "counts_file": ("counts.csv", COUNTS, "text/csv"),
            "metadata_file": ("metadata.csv", METADATA, "text/csv"),
        },
    )
    assert response.status_code == 422
    assert expected in response.json()["detail"]


def test_execution_rejects_mismatched_samples() -> None:
    bad_metadata = METADATA.replace(b"T2,treated,B", b"T3,treated,B")
    response = client.post(
        "/api/executions/run",
        data={
            "method": "deseq2_wald",
            "condition_column": "condition",
            "reference_level": "control",
            "comparison_level": "treated",
        },
        files={
            "counts_file": ("counts.csv", COUNTS, "text/csv"),
            "metadata_file": ("metadata.csv", bad_metadata, "text/csv"),
        },
    )
    assert response.status_code == 422
    assert "samples do not match" in response.json()["detail"]
