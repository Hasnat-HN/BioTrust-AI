from backend.app.models import AIContextRequest, PrivacyMode
from backend.app.privacy import build_context_preview


def test_no_external_ai_mode_always_has_empty_payload() -> None:
    preview = build_context_preview(AIContextRequest(provider="mock", purpose="method_review", mode=PrivacyMode.NO_EXTERNAL_AI_MODE, user_approved=True, context={"scientific_question": "Is Exposure_A associated with expression?", "method_name": "limma-voom"}))
    assert preview.status == "BLOCKED_BY_MODE"
    assert preview.sanitized_payload == {}
    assert preview.allowed_fields == ["method_name", "scientific_question"]


def test_prohibited_fields_never_enter_standard_payload() -> None:
    preview = build_context_preview(AIContextRequest(provider="mock", purpose="interpretation", mode=PrivacyMode.STANDARD_MODE, user_approved=True, context={"scientific_question": "Is Exposure_A associated with expression?", "raw_matrix": [[1, 2], [3, 4]], "participant_identifiers": ["Synthetic_P01"]}))
    assert set(preview.blocked_fields) == {"participant_identifiers", "raw_matrix"}
    assert set(preview.sanitized_payload) == {"scientific_question"}
    assert "raw_matrix" not in preview.sanitized_payload
    assert preview.status == "REQUIRES_REVIEW"


def test_nested_prohibited_field_blocks_parent_category() -> None:
    preview = build_context_preview(AIContextRequest(provider="mock", purpose="review", mode=PrivacyMode.STANDARD_MODE, context={"provenance_summary": {"method": "cameraPR", "filenames": ["sensitive-name.csv"]}}))
    assert preview.sanitized_payload == {}
    assert preview.blocked_fields == ["provenance_summary"]
