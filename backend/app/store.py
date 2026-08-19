from __future__ import annotations

from collections import defaultdict
from typing import Any, TypeVar

from pydantic import BaseModel

from .models import AnalysisPlan, Claim, Dataset, MethodCard, PrivacyMode, Project

T = TypeVar("T", bound=BaseModel)


class InMemoryStore:
    """Development-only store. Production will use PostgreSQL."""

    def __init__(self) -> None:
        self.tables: dict[str, dict[str, BaseModel]] = defaultdict(dict)

    def add(self, table: str, record: T) -> T:
        self.tables[table][record.id] = record
        return record

    def list(self, table: str) -> list[Any]:
        return list(self.tables[table].values())

    def get(self, table: str, record_id: str) -> Any | None:
        return self.tables[table].get(record_id)

    def update(self, table: str, record_id: str, record: T) -> T | None:
        if record_id not in self.tables[table]:
            return None
        self.tables[table][record_id] = record
        return record

    def delete(self, table: str, record_id: str) -> bool:
        return self.tables[table].pop(record_id, None) is not None


store = InMemoryStore()


def seed_synthetic_demo() -> None:
    if store.list("projects"):
        return
    project = store.add("projects", Project(id="PRJ-SYNTHETIC", name="Synthetic transcriptomic association study", description="Procedurally generated demonstration workspace", privacy_mode=PrivacyMode.NO_EXTERNAL_AI_MODE))
    dataset = store.add("datasets", Dataset(id="DST-SYNTHETIC", project_id=project.id, name="Synthetic_Cohort", modality="bulk_rna_seq", content_hash="sha256:8fb2d91c", schema_summary={"samples": 120, "features": 12000}, synthetic=True))
    store.add("analysis_plans", AnalysisPlan(id="APL-001", project_id=project.id, scientific_question="Which genes are associated with Exposure_A after adjustment for the pre-specified covariates?", analysis_type="transcriptomic_association", dataset_id=dataset.id, sample_population="Tissue == Tissue_A", exposure="Exposure_A", outcome="gene_expression", covariates=["Age", "Sex", "Technical_Batch"], formula="~ Exposure_A + Age + Sex + Technical_Batch", preprocessing=[{"operation": "filterByExpr"}, {"operation": "TMM"}, {"operation": "voom"}], method="limma-voom", parameters={"robust": True, "standardize_exposure": True}, multiple_testing={"method": "BH", "family": "all_retained_features"}, validation_plan=["design_rank_check"], sensitivity_plan=["remove_Technical_Batch"], confirmed=True))
    store.add("claims", Claim(id="CLM-004", analysis_run_id="ANR-001", text="Exposure_A and Clinical_Score are associated with a similar molecular expression pattern.", claim_type="INFERENCE", supporting_results=["RES-001", "RES-002"], limitations=["Exposure_A is not included in the Clinical_Score model"], warnings=["ASSOCIATION_TO_CAUSATION"], status="SUPPORTED_WITH_LIMITATIONS"))
    for method in [
        MethodCard(id="MTH-LIMMA-VOOM", name="limma-voom", package="limma", function="voom + lmFit", category="Differential expression", scientific_question_answered="Which genes are associated with a modeled exposure after declared covariate adjustment?", questions_not_answered=["Causality", "Mechanism"], appropriate_when=["Replicated RNA-seq counts"], assumptions=["Full-rank design", "Adequate mean–variance modeling"], failure_modes=["Unmodeled batch", "Sample misalignment"], alternatives=["edgeR quasi-likelihood", "DESeq2 Wald test"], validation_recommendations=["Inspect the voom trend", "Audit design rank"], interpretation_rules=["Association is not causation"], curation_status="VERIFIED", official_documentation="https://bioconductor.org/packages/release/bioc/vignettes/limma/inst/doc/usersguide.pdf"),
        MethodCard(id="MTH-EDGER-QL", name="edgeR quasi-likelihood", package="edgeR", function="glmQLFit + glmQLFTest", category="Differential expression", scientific_question_answered="Which genes show differential expression under a negative-binomial quasi-likelihood GLM?", questions_not_answered=["Causality", "Mechanism"], appropriate_when=["Raw counts with biological replication"], assumptions=["Adequate negative-binomial model", "Correct design and contrast"], failure_modes=["Rank-deficient design", "Incorrect contrast"], alternatives=["limma-voom", "DESeq2 Wald test"], validation_recommendations=["Inspect dispersion trends", "Audit contrasts"], interpretation_rules=["Effect direction follows the declared contrast"], curation_status="VERIFIED", official_documentation="https://bioconductor.org/packages/release/bioc/vignettes/edgeR/inst/doc/edgeRUsersGuide.pdf"),
        MethodCard(id="MTH-DESEQ2-WALD", name="DESeq2 Wald test", package="DESeq2", function="DESeq + results", category="Differential expression", scientific_question_answered="Does a declared model coefficient or contrast differ from zero for each gene?", questions_not_answered=["Causality", "External replication"], appropriate_when=["Integer counts with replicated samples"], assumptions=["Adequate size-factor and dispersion models", "Full-rank design"], failure_modes=["Ambiguous reference levels", "No replication"], alternatives=["edgeR quasi-likelihood", "limma-voom"], validation_recommendations=["Record resultsNames and contrast", "Inspect dispersion and MA plots"], interpretation_rules=["Separate hypothesis testing from fold-change shrinkage"], curation_status="VERIFIED", official_documentation="https://bioconductor.org/packages/release/bioc/vignettes/DESeq2/inst/doc/DESeq2.html"),
        MethodCard(id="MTH-CAMERAPR", name="cameraPR", package="limma", function="cameraPR", category="Gene-set testing", scientific_question_answered="Are genes in a predefined set more associated than genes outside it?", questions_not_answered=["Cell abundance", "Causality"], appropriate_when=["Genome-wide signed statistics"], assumptions=["Appropriate gene universe", "Independent gene-set definition"], failure_modes=["Circular set construction", "Biased universe"], alternatives=["camera", "ROAST", "fgsea"], validation_recommendations=["Audit set provenance", "Vary the gene universe"], interpretation_rules=["Enrichment is not measured abundance"], curation_status="VERIFIED", official_documentation="https://bioconductor.org/packages/release/bioc/vignettes/limma/inst/doc/usersguide.pdf"),
    ]:
        store.add("methods", method)
