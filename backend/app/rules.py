from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from .models import EvidenceAssessment, EvidenceInput


@dataclass(frozen=True)
class WarningRecord:
    rule_id: str
    severity: str
    trigger: str
    explanation: str
    scientific_consequence: str
    recommended_action: str


def review_claim(text: str, metadata: dict[str, Any] | None = None) -> list[WarningRecord]:
    metadata = metadata or {}
    lower = text.lower()
    warnings: list[WarningRecord] = []

    if any(word in lower for word in ("causes", "caused by", "drives", "leads to")) and metadata.get("study_design") != "causal":
        warnings.append(WarningRecord("ASSOCIATION_TO_CAUSATION", "HIGH", "causal wording without causal design", "Association does not establish causation.", "The interpretation exceeds the design.", "Use associative wording and identify a suitable causal validation design."))
    if any(word in lower for word in ("progresses", "progression", "over time")) and metadata.get("study_design") == "cross_sectional":
        warnings.append(WarningRecord("CROSS_SECTIONAL_TO_PROGRESSION", "HIGH", "temporal wording in a cross-sectional analysis", "Cross-sectional differences do not measure change over time.", "Temporal interpretation is unsupported.", "Use longitudinal data or remove progression language."))
    if "abundance" in lower and metadata.get("result_type") == "gene_set_enrichment":
        warnings.append(WarningRecord("GENE_SET_TO_CELL_ABUNDANCE", "HIGH", "abundance language from gene-set enrichment", "Enrichment may reflect composition, transcriptional state, or both.", "Measured abundance is being implied without measurement.", "Describe the signed gene-set shift and seek independent proportion measurements."))
    if ("no effect" in lower or "no association" in lower) and metadata.get("result") == "non_significant":
        warnings.append(WarningRecord("NON_SIGNIFICANCE_TO_NO_EFFECT", "CAUTION", "absence claim from non-significance", "Non-significance does not prove an effect is absent.", "The claim may ignore uncertainty and power.", "Report the estimate and interval, and use equivalence testing when appropriate."))
    if metadata.get("multiple_testing_required") and not metadata.get("multiple_testing_applied"):
        warnings.append(WarningRecord("MULTIPLE_TESTING_MISSING", "CRITICAL", "multiple comparisons without declared correction", "Unadjusted significance is unreliable across a test family.", "The false-positive burden is uncontrolled.", "Declare the test family and apply a suitable correction."))
    if metadata.get("features_selected_on_full_data"):
        warnings.append(WarningRecord("FEATURE_SELECTION_BEFORE_CROSS_VALIDATION", "CRITICAL", "full-dataset feature selection before folds", "Held-out samples influenced the learned feature set.", "Performance estimates are optimistically biased.", "Repeat feature selection independently inside every training fold."))
    if metadata.get("internal_validation_presented_as_external"):
        warnings.append(WarningRecord("INTERNAL_VALIDATION_AS_EXTERNAL_REPLICATION", "HIGH", "internal validation labeled external", "Internal resampling is not independent dataset replication.", "Evidence strength is overstated.", "Label the result internally validated until an eligible external dataset is tested."))
    return warnings


def assess_evidence(values: EvidenceInput) -> EvidenceAssessment:
    dimensions: dict[str, int | str] = {
        "PROVENANCE": 2 if values.provenance_complete else 0,
        "STATISTICAL_APPROPRIATENESS": 2 if values.statistical_checks_passed and not values.statistical_caveats else (1 if values.statistical_checks_passed else 0),
        "MULTIPLE_TESTING": 2 if not values.multiple_testing_required or values.multiple_testing_applied else 0,
        "ROBUSTNESS": 2 if values.sensitivity_checks >= 2 else (1 if values.sensitivity_checks == 1 else 0),
        "HELD_OUT_VALIDATION": "NOT_APPLICABLE" if not values.held_out_required else (2 if values.held_out_valid else 0),
        "INDEPENDENT_REFERENCE_SUPPORT": min(2, max(0, values.independent_support_level)),
        "EXTERNAL_DATASET_REPLICATION": min(2, max(0, values.external_replication_level)),
        "CONFOUNDING_RESOLUTION": 2 if values.major_confounders_evaluated else (1 if values.some_confounders_evaluated else 0),
        "PRE_SPECIFICATION": 2 if values.prespecified else 0,
        "REPRODUCIBILITY": 2 if values.reproducible else 0,
    }

    core_supported = all(dimensions[key] == 2 for key in ("PROVENANCE", "STATISTICAL_APPROPRIATENESS", "MULTIPLE_TESTING"))
    robust = core_supported and dimensions["ROBUSTNESS"] == 2 and dimensions["CONFOUNDING_RESOLUTION"] == 2
    internally_valid = robust and dimensions["HELD_OUT_VALIDATION"] in (2, "NOT_APPLICABLE")
    if internally_valid and dimensions["EXTERNAL_DATASET_REPLICATION"] == 2:
        state = "EXTERNALLY_REPLICATED"
    elif internally_valid and values.held_out_required:
        state = "INTERNALLY_VALIDATED"
    elif robust:
        state = "ROBUST_WITHIN_DATASET"
    elif core_supported:
        state = "SUPPORTED"
    else:
        state = "EXPLORATORY"

    explanations = {key: f"Deterministic score: {score}" for key, score in dimensions.items()}
    return EvidenceAssessment(claim_id=values.claim_id, rule_version="1.0.0", dimensions=dimensions, overall_state=state, explanations=explanations)
