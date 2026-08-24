from __future__ import annotations

import csv
import hashlib
import io
import os
import re
import shutil
import subprocess
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field


RUNNER_PATH = Path(__file__).resolve().parents[1] / "runners" / "differential_expression.R"
SAFE_COLUMN = re.compile(r"^[A-Za-z][A-Za-z0-9_]*$")
INTEGER_COUNT = re.compile(r"^[0-9]+$")

MAX_UPLOAD_BYTES = int(os.getenv("BIOTRUST_MAX_UPLOAD_MB", "50")) * 1024 * 1024
MAX_FEATURES = int(os.getenv("BIOTRUST_MAX_FEATURES", "50000"))
MAX_SAMPLES = int(os.getenv("BIOTRUST_MAX_SAMPLES", "500"))
EXECUTION_TIMEOUT_SECONDS = int(os.getenv("BIOTRUST_EXECUTION_TIMEOUT_SECONDS", "900"))


METHODS: dict[str, dict[str, str]] = {
    "edger_qlf": {
        "id": "edger_qlf",
        "name": "edgeR quasi-likelihood",
        "package": "edgeR",
        "entry_point": "glmQLFTest",
        "filtering": "edgeR::filterByExpr",
        "multiple_testing": "Benjamini-Hochberg FDR",
    },
    "deseq2_wald": {
        "id": "deseq2_wald",
        "name": "DESeq2 Wald test",
        "package": "DESeq2",
        "entry_point": "results",
        "filtering": "At least 10 counts in at least 2 samples",
        "multiple_testing": "Benjamini-Hochberg FDR",
    },
}


class ExecutionValidationError(ValueError):
    """Raised before computation when an input violates the controlled contract."""


class ExecutionUnavailableError(RuntimeError):
    """Raised when the local R/Bioconductor runtime is unavailable."""


class ExecutionFailedError(RuntimeError):
    """Raised when the allowlisted runner returns a failed analysis."""


class ResultRow(BaseModel):
    feature_id: str
    log2_fold_change: float | None = None
    statistic: float | None = None
    p_value: float | None = None
    adjusted_p_value: float | None = None


class ExecutionResponse(BaseModel):
    execution_id: str
    status: str
    method: str
    comparison: str
    reference: str
    design: str
    sample_count: int
    feature_count: int
    retained_feature_count: int
    input_hashes: dict[str, str]
    output_hash: str
    software_versions: dict[str, str]
    warnings: list[str] = Field(default_factory=list)
    generated_at: datetime
    results: list[ResultRow]


class ValidatedInputs(BaseModel):
    sample_ids: list[str]
    feature_count: int
    metadata_rows: list[dict[str, str]]


def available_methods() -> list[dict[str, str]]:
    return list(METHODS.values())


def runtime_status() -> dict[str, Any]:
    rscript = os.getenv("BIOTRUST_RSCRIPT", "Rscript")
    deployment_mode = os.getenv("BIOTRUST_EXECUTION_MODE", "local").strip().lower()
    return {
        "status": "ready" if shutil.which(rscript) else "unavailable",
        "rscript": rscript,
        "runner": str(RUNNER_PATH),
        "methods": list(METHODS),
        "deployment_mode": deployment_mode,
        "local_only": deployment_mode != "online",
        "temporary_storage": True,
        "raw_data_ai_access": False,
    }


def _decode_csv(payload: bytes, label: str) -> tuple[list[str], list[list[str]]]:
    if not payload:
        raise ExecutionValidationError(f"{label} is empty")
    if len(payload) > MAX_UPLOAD_BYTES:
        raise ExecutionValidationError(f"{label} exceeds the {MAX_UPLOAD_BYTES // (1024 * 1024)} MB limit")
    try:
        text = payload.decode("utf-8-sig")
    except UnicodeDecodeError as exc:
        raise ExecutionValidationError(f"{label} must be UTF-8 encoded") from exc
    reader = csv.reader(io.StringIO(text, newline=""))
    try:
        header = next(reader)
    except StopIteration as exc:
        raise ExecutionValidationError(f"{label} has no header") from exc
    header = [column.strip() for column in header]
    rows = []
    for line_number, row in enumerate(reader, start=2):
        if not row or all(not value.strip() for value in row):
            continue
        if len(row) != len(header):
            raise ExecutionValidationError(f"{label} row {line_number} has {len(row)} columns; expected {len(header)}")
        rows.append([value.strip() for value in row])
    return header, rows


def _validate_inputs(
    counts_payload: bytes,
    metadata_payload: bytes,
    condition_column: str,
    reference_level: str,
    comparison_level: str,
    covariates: list[str],
) -> ValidatedInputs:
    counts_header, count_rows = _decode_csv(counts_payload, "Count matrix")
    if not counts_header or counts_header[0] != "feature_id":
        raise ExecutionValidationError("Count matrix must start with a feature_id column")
    sample_ids = counts_header[1:]
    if len(sample_ids) < 4:
        raise ExecutionValidationError("Count matrix must contain at least four samples")
    if len(sample_ids) > MAX_SAMPLES:
        raise ExecutionValidationError(f"Count matrix exceeds the {MAX_SAMPLES}-sample limit")
    if any(not sample_id for sample_id in sample_ids) or len(set(sample_ids)) != len(sample_ids):
        raise ExecutionValidationError("Count matrix sample identifiers must be non-empty and unique")
    if not count_rows:
        raise ExecutionValidationError("Count matrix has no feature rows")
    if len(count_rows) > MAX_FEATURES:
        raise ExecutionValidationError(f"Count matrix exceeds the {MAX_FEATURES}-feature limit")
    feature_ids: set[str] = set()
    for line_number, row in enumerate(count_rows, start=2):
        feature_id = row[0]
        if not feature_id or feature_id in feature_ids:
            raise ExecutionValidationError(f"Feature identifiers must be non-empty and unique (row {line_number})")
        feature_ids.add(feature_id)
        if any(not INTEGER_COUNT.fullmatch(value) for value in row[1:]):
            raise ExecutionValidationError(f"Counts must be non-negative integers (row {line_number})")

    metadata_header, metadata_values = _decode_csv(metadata_payload, "Sample metadata")
    if "sample_id" not in metadata_header:
        raise ExecutionValidationError("Sample metadata must contain a sample_id column")
    if len(set(metadata_header)) != len(metadata_header):
        raise ExecutionValidationError("Sample metadata column names must be unique")
    if not SAFE_COLUMN.fullmatch(condition_column):
        raise ExecutionValidationError("Condition column must use letters, numbers, and underscores and start with a letter")
    if condition_column not in metadata_header:
        raise ExecutionValidationError(f"Condition column '{condition_column}' was not found in sample metadata")
    for covariate in covariates:
        if not SAFE_COLUMN.fullmatch(covariate):
            raise ExecutionValidationError(f"Covariate '{covariate}' is not a safe column identifier")
        if covariate not in metadata_header:
            raise ExecutionValidationError(f"Covariate '{covariate}' was not found in sample metadata")
    if condition_column in covariates:
        raise ExecutionValidationError("Condition column cannot also be a covariate")
    if len(set(covariates)) != len(covariates):
        raise ExecutionValidationError("Covariates must be unique")
    if not reference_level or not comparison_level or reference_level == comparison_level:
        raise ExecutionValidationError("Reference and comparison levels must be present and different")

    metadata_rows = [dict(zip(metadata_header, row, strict=True)) for row in metadata_values]
    metadata_ids = [row["sample_id"] for row in metadata_rows]
    if any(not sample_id for sample_id in metadata_ids) or len(set(metadata_ids)) != len(metadata_ids):
        raise ExecutionValidationError("Metadata sample identifiers must be non-empty and unique")
    missing = sorted(set(sample_ids) - set(metadata_ids))
    extra = sorted(set(metadata_ids) - set(sample_ids))
    if missing or extra:
        details = []
        if missing:
            details.append(f"{len(missing)} sample(s) missing from metadata")
        if extra:
            details.append(f"{len(extra)} extra metadata sample(s)")
        raise ExecutionValidationError("Count matrix and metadata samples do not match: " + "; ".join(details))
    ordered_rows = {row["sample_id"]: row for row in metadata_rows}
    metadata_rows = [ordered_rows[sample_id] for sample_id in sample_ids]

    levels = [row[condition_column] for row in metadata_rows]
    if reference_level not in levels or comparison_level not in levels:
        raise ExecutionValidationError("Reference and comparison levels must exist in the condition column")
    if levels.count(reference_level) < 2 or levels.count(comparison_level) < 2:
        raise ExecutionValidationError("Each compared condition must have at least two biological replicates")
    if any(not row[column] for row in metadata_rows for column in [condition_column, *covariates]):
        raise ExecutionValidationError("Condition and covariate values cannot be empty")

    return ValidatedInputs(sample_ids=sample_ids, feature_count=len(count_rows), metadata_rows=metadata_rows)


def _write_normalized_metadata(path: Path, rows: list[dict[str, str]]) -> None:
    with path.open("w", encoding="utf-8", newline="") as handle:
        writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
        writer.writeheader()
        writer.writerows(rows)


def _parse_optional_float(value: str | None) -> float | None:
    if value is None or value.strip().upper() in {"", "NA", "NAN"}:
        return None
    return float(value)


def _parse_results(path: Path) -> list[ResultRow]:
    with path.open(encoding="utf-8", newline="") as handle:
        rows = [
            ResultRow(
                feature_id=row["feature_id"],
                log2_fold_change=_parse_optional_float(row.get("log2_fold_change")),
                statistic=_parse_optional_float(row.get("statistic")),
                p_value=_parse_optional_float(row.get("p_value")),
                adjusted_p_value=_parse_optional_float(row.get("adjusted_p_value")),
            )
            for row in csv.DictReader(handle)
        ]
    rows.sort(
        key=lambda row: (
            row.adjusted_p_value is None,
            row.adjusted_p_value if row.adjusted_p_value is not None else float("inf"),
            row.p_value if row.p_value is not None else float("inf"),
        )
    )
    return rows


def _parse_audit(path: Path) -> dict[str, str]:
    audit: dict[str, str] = {}
    with path.open(encoding="utf-8") as handle:
        for line in handle:
            key, separator, value = line.rstrip("\n").partition("\t")
            if separator:
                audit[key] = value
    return audit


def execute_differential_expression(
    *,
    method: str,
    counts_payload: bytes,
    metadata_payload: bytes,
    condition_column: str,
    reference_level: str,
    comparison_level: str,
    covariates: list[str],
) -> ExecutionResponse:
    if method not in METHODS:
        raise ExecutionValidationError(f"Method must be one of: {', '.join(METHODS)}")
    validated = _validate_inputs(counts_payload, metadata_payload, condition_column, reference_level, comparison_level, covariates)
    rscript = os.getenv("BIOTRUST_RSCRIPT", "Rscript")
    if not shutil.which(rscript):
        raise ExecutionUnavailableError("Rscript is unavailable. Start BioTrust with Docker to use the controlled Bioconductor runtime.")

    with tempfile.TemporaryDirectory(prefix="biotrust-execution-") as temporary_directory:
        workdir = Path(temporary_directory)
        counts_path = workdir / "counts.csv"
        metadata_path = workdir / "metadata.csv"
        results_path = workdir / "results.csv"
        audit_path = workdir / "audit.tsv"
        counts_path.write_bytes(counts_payload)
        _write_normalized_metadata(metadata_path, validated.metadata_rows)
        command = [
            rscript,
            "--vanilla",
            str(RUNNER_PATH),
            str(counts_path),
            str(metadata_path),
            str(results_path),
            str(audit_path),
            method,
            condition_column,
            reference_level,
            comparison_level,
            ",".join(covariates),
        ]
        try:
            completed = subprocess.run(
                command,
                cwd=workdir,
                capture_output=True,
                text=True,
                timeout=EXECUTION_TIMEOUT_SECONDS,
                check=False,
                shell=False,
            )
        except subprocess.TimeoutExpired as exc:
            raise ExecutionFailedError(f"Analysis exceeded the {EXECUTION_TIMEOUT_SECONDS}-second limit") from exc
        if completed.returncode != 0:
            detail_lines = (completed.stderr or completed.stdout or "Controlled runner failed").strip().splitlines()
            detail = " ".join(detail_lines[-8:])
            raise ExecutionFailedError(detail[:500])
        if not results_path.is_file() or not audit_path.is_file():
            raise ExecutionFailedError("Controlled runner did not produce the required result and audit files")

        result_bytes = results_path.read_bytes()
        results = _parse_results(results_path)
        audit = _parse_audit(audit_path)
        warnings = [
            "Results are statistical associations and do not establish causality.",
            "Review dispersion, sample-level quality, model rank, and biological assumptions before making claims.",
        ]
        if audit.get("execution_note"):
            warnings.append(audit["execution_note"])
        design_terms = [*covariates, condition_column]
        return ExecutionResponse(
            execution_id=f"ANR-{uuid4().hex[:12]}",
            status="COMPLETE",
            method=method,
            comparison=comparison_level,
            reference=reference_level,
            design="~ " + " + ".join(design_terms),
            sample_count=len(validated.sample_ids),
            feature_count=validated.feature_count,
            retained_feature_count=int(audit.get("retained_feature_count", len(results))),
            input_hashes={
                "counts_sha256": hashlib.sha256(counts_payload).hexdigest(),
                "metadata_sha256": hashlib.sha256(metadata_payload).hexdigest(),
            },
            output_hash=hashlib.sha256(result_bytes).hexdigest(),
            software_versions={key.removeprefix("version_"): value for key, value in audit.items() if key.startswith("version_")},
            warnings=warnings,
            generated_at=datetime.now(timezone.utc),
            results=results,
        )
