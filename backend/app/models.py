from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum
from typing import Any
from uuid import uuid4

from pydantic import BaseModel, Field


def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def new_id(prefix: str) -> str:
    return f"{prefix}-{uuid4().hex[:10]}"


class ClaimType(str, Enum):
    DATA = "DATA"
    METHOD = "METHOD"
    AI_CHOICE = "AI_CHOICE"
    USER_CHOICE = "USER_CHOICE"
    INFERENCE = "INFERENCE"
    HYPOTHESIS = "HYPOTHESIS"
    UNSUPPORTED = "UNSUPPORTED"


class ClaimStatus(str, Enum):
    SUPPORTED = "SUPPORTED"
    SUPPORTED_WITH_LIMITATIONS = "SUPPORTED_WITH_LIMITATIONS"
    HYPOTHESIS = "HYPOTHESIS"
    INSUFFICIENT_SUPPORT = "INSUFFICIENT_SUPPORT"


class ProposalStatus(str, Enum):
    PROPOSED = "PROPOSED"
    ACCEPTED = "ACCEPTED"
    MODIFIED = "MODIFIED"
    REJECTED = "REJECTED"


class PrivacyMode(str, Enum):
    STANDARD_MODE = "STANDARD_MODE"
    NO_EXTERNAL_AI_MODE = "NO_EXTERNAL_AI_MODE"


class Project(BaseModel):
    id: str = Field(default_factory=lambda: new_id("PRJ"))
    name: str
    description: str = ""
    privacy_mode: PrivacyMode = PrivacyMode.NO_EXTERNAL_AI_MODE
    created_at: datetime = Field(default_factory=now_utc)


class Dataset(BaseModel):
    id: str = Field(default_factory=lambda: new_id("DST"))
    project_id: str
    name: str
    modality: str
    content_hash: str
    schema_summary: dict[str, Any] = Field(default_factory=dict)
    synthetic: bool = True
    created_at: datetime = Field(default_factory=now_utc)


class AnalysisPlan(BaseModel):
    id: str = Field(default_factory=lambda: new_id("APL"))
    project_id: str
    scientific_question: str
    analysis_type: str
    dataset_id: str
    sample_population: str
    exposure: str
    outcome: str
    covariates: list[str] = Field(default_factory=list)
    formula: str
    preprocessing: list[dict[str, Any]] = Field(default_factory=list)
    method: str
    parameters: dict[str, Any] = Field(default_factory=dict)
    multiple_testing: dict[str, Any] = Field(default_factory=dict)
    validation_plan: list[str] = Field(default_factory=list)
    sensitivity_plan: list[str] = Field(default_factory=list)
    created_by: str = "researcher"
    confirmed: bool = False
    created_at: datetime = Field(default_factory=now_utc)


class AnalysisRun(BaseModel):
    id: str = Field(default_factory=lambda: new_id("ANR"))
    analysis_plan_id: str
    dataset_hashes: list[str]
    sample_selection_hash: str
    sample_count: int
    feature_count: int
    software_versions: dict[str, str]
    random_seed: int
    code_hash: str
    output_hashes: list[str]
    status: str
    created_at: datetime = Field(default_factory=now_utc)


class Claim(BaseModel):
    id: str = Field(default_factory=lambda: new_id("CLM"))
    analysis_run_id: str | None = None
    text: str
    claim_type: ClaimType
    supporting_results: list[str] = Field(default_factory=list)
    limitations: list[str] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    status: ClaimStatus
    created_by: str = "researcher"
    created_at: datetime = Field(default_factory=now_utc)


class MethodCard(BaseModel):
    id: str = Field(default_factory=lambda: new_id("MTH"))
    name: str
    package: str
    function: str
    category: str
    scientific_question_answered: str
    questions_not_answered: list[str]
    appropriate_when: list[str] = Field(default_factory=list)
    assumptions: list[str]
    failure_modes: list[str]
    alternatives: list[str] = Field(default_factory=list)
    validation_recommendations: list[str] = Field(default_factory=list)
    interpretation_rules: list[str]
    curation_status: str
    official_documentation: str | None = None
    origin: str = "BUILT_IN"


class ProvenanceEvent(BaseModel):
    id: str = Field(default_factory=lambda: new_id("PRV"))
    project_id: str
    event_type: str
    entity_id: str
    actor: str
    summary: str
    payload_hash: str | None = None
    created_at: datetime = Field(default_factory=now_utc)


class ValidationCheck(BaseModel):
    id: str = Field(default_factory=lambda: new_id("VAL"))
    analysis_run_id: str
    check_type: str
    status: str
    details: dict[str, Any] = Field(default_factory=dict)


class SensitivityAnalysis(BaseModel):
    id: str = Field(default_factory=lambda: new_id("SEN"))
    parent_analysis_run_id: str
    specification: dict[str, Any]
    result_summary: dict[str, Any] = Field(default_factory=dict)


class EvidenceAssessment(BaseModel):
    id: str = Field(default_factory=lambda: new_id("EVD"))
    claim_id: str
    rule_version: str
    dimensions: dict[str, int | str]
    overall_state: str
    explanations: dict[str, str]


class Artifact(BaseModel):
    id: str = Field(default_factory=lambda: new_id("ART"))
    analysis_run_id: str
    artifact_type: str
    content_hash: str
    sanitized: bool = True


class AIProposal(BaseModel):
    id: str = Field(default_factory=lambda: new_id("AIP"))
    project_id: str
    provider: str
    structured_context_hash: str
    proposed_method: str
    proposed_covariates: list[str] = Field(default_factory=list)
    reasoning_summary: str
    assumptions: list[str] = Field(default_factory=list)
    alternatives: list[str] = Field(default_factory=list)
    risks: list[str] = Field(default_factory=list)
    validation_suggestions: list[str] = Field(default_factory=list)
    status: ProposalStatus = ProposalStatus.PROPOSED
    created_at: datetime = Field(default_factory=now_utc)


class AIContextRequest(BaseModel):
    provider: str
    purpose: str
    mode: PrivacyMode
    context: dict[str, Any]
    user_approved: bool = False


class AIContextPreview(BaseModel):
    request_id: str = Field(default_factory=lambda: new_id("CTX"))
    provider: str
    purpose: str
    mode: PrivacyMode
    allowed_fields: list[str]
    blocked_fields: list[str]
    sanitized_payload: dict[str, Any]
    payload_hash: str
    user_approved: bool
    status: str
    created_at: datetime = Field(default_factory=now_utc)


class EvidenceInput(BaseModel):
    claim_id: str
    provenance_complete: bool
    statistical_checks_passed: bool
    statistical_caveats: bool = False
    multiple_testing_required: bool = True
    multiple_testing_applied: bool = False
    sensitivity_checks: int = 0
    held_out_required: bool = False
    held_out_valid: bool = False
    independent_support_level: int = 0
    external_replication_level: int = 0
    major_confounders_evaluated: bool = False
    some_confounders_evaluated: bool = False
    prespecified: bool = False
    reproducible: bool = False


class ClaimReviewInput(BaseModel):
    text: str
    metadata: dict[str, Any] = Field(default_factory=dict)
