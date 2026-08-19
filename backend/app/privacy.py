from __future__ import annotations

import hashlib
import json
from typing import Any

from .models import AIContextPreview, AIContextRequest, PrivacyMode


ALLOWED_FIELDS = {
    "scientific_question",
    "variable_roles",
    "analysis_specification",
    "method_name",
    "software_information",
    "sanitized_statistical_summary",
    "deterministic_warnings",
    "method_card",
    "validation_summary",
    "provenance_summary",
}

PROHIBITED_FIELDS = {
    "raw_matrix",
    "participant_rows",
    "participant_identifiers",
    "raw_genetic_data",
    "raw_expression_values",
    "clinical_notes",
    "genomic_variants",
    "uploaded_file_contents",
    "sensitive_metadata",
    "filenames",
    "hidden_metadata",
}


def _contains_prohibited_key(value: Any) -> bool:
    if isinstance(value, dict):
        return any(key in PROHIBITED_FIELDS or _contains_prohibited_key(item) for key, item in value.items())
    if isinstance(value, list):
        return any(_contains_prohibited_key(item) for item in value)
    return False


def build_context_preview(request: AIContextRequest) -> AIContextPreview:
    allowed: dict[str, Any] = {}
    blocked: list[str] = []

    for key, value in request.context.items():
        if key in ALLOWED_FIELDS and not _contains_prohibited_key(value):
            allowed[key] = value
        else:
            blocked.append(key)

    if request.mode == PrivacyMode.NO_EXTERNAL_AI_MODE:
        sanitized_payload: dict[str, Any] = {}
        status = "BLOCKED_BY_MODE"
    else:
        sanitized_payload = allowed
        status = "APPROVED" if request.user_approved and not blocked else "REQUIRES_REVIEW"

    canonical = json.dumps(sanitized_payload, sort_keys=True, separators=(",", ":"), default=str)
    payload_hash = hashlib.sha256(canonical.encode()).hexdigest()
    return AIContextPreview(
        provider=request.provider,
        purpose=request.purpose,
        mode=request.mode,
        allowed_fields=sorted(allowed),
        blocked_fields=sorted(blocked),
        sanitized_payload=sanitized_payload,
        payload_hash=payload_hash,
        user_approved=request.user_approved,
        status=status,
    )
