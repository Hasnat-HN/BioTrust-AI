from backend.app.models import EvidenceInput
from backend.app.rules import assess_evidence, review_claim


def rule_ids(text: str, metadata: dict) -> set[str]:
    return {warning.rule_id for warning in review_claim(text, metadata)}


def test_association_to_causation_warning() -> None:
    assert "ASSOCIATION_TO_CAUSATION" in rule_ids("Exposure_A causes the molecular pattern.", {"study_design": "cross_sectional"})


def test_gene_set_is_not_cell_abundance() -> None:
    assert "GENE_SET_TO_CELL_ABUNDANCE" in rule_ids("Cell_State_A abundance decreases.", {"result_type": "gene_set_enrichment"})


def test_leakage_and_multiple_testing_are_critical() -> None:
    warnings = review_claim("A predictive signature was observed.", {"features_selected_on_full_data": True, "multiple_testing_required": True, "multiple_testing_applied": False})
    assert {warning.rule_id for warning in warnings} == {"FEATURE_SELECTION_BEFORE_CROSS_VALIDATION", "MULTIPLE_TESTING_MISSING"}
    assert all(warning.severity == "CRITICAL" for warning in warnings)


def test_supported_evidence_is_rule_based() -> None:
    assessment = assess_evidence(EvidenceInput(claim_id="CLM-TEST", provenance_complete=True, statistical_checks_passed=True, multiple_testing_applied=True, sensitivity_checks=1, some_confounders_evaluated=True, prespecified=True, reproducible=True))
    assert assessment.overall_state == "SUPPORTED"
    assert assessment.dimensions["PROVENANCE"] == 2
    assert assessment.dimensions["ROBUSTNESS"] == 1


def test_external_replication_requires_full_chain() -> None:
    assessment = assess_evidence(EvidenceInput(claim_id="CLM-TEST", provenance_complete=True, statistical_checks_passed=True, multiple_testing_applied=True, sensitivity_checks=2, major_confounders_evaluated=True, prespecified=True, reproducible=True, external_replication_level=2))
    assert assessment.overall_state == "EXTERNALLY_REPLICATED"
