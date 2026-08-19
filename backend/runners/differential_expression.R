args <- commandArgs(trailingOnly = TRUE)
if (length(args) != 9) {
  stop("Expected nine controlled runner arguments")
}

counts_path <- args[[1]]
metadata_path <- args[[2]]
results_path <- args[[3]]
audit_path <- args[[4]]
method <- args[[5]]
condition_column <- args[[6]]
reference_level <- args[[7]]
comparison_level <- args[[8]]
covariates <- if (nzchar(args[[9]])) strsplit(args[[9]], ",", fixed = TRUE)[[1]] else character(0)

if (!method %in% c("edger_qlf", "deseq2_wald")) {
  stop("Method is not in the controlled execution allowlist")
}

counts_frame <- read.csv(counts_path, check.names = FALSE, stringsAsFactors = FALSE)
metadata <- read.csv(metadata_path, check.names = FALSE, stringsAsFactors = FALSE)
feature_ids <- counts_frame[["feature_id"]]
count_matrix <- as.matrix(counts_frame[, setdiff(names(counts_frame), "feature_id"), drop = FALSE])
storage.mode(count_matrix) <- "integer"
rownames(count_matrix) <- feature_ids

metadata <- metadata[match(colnames(count_matrix), metadata[["sample_id"]]), , drop = FALSE]
rownames(metadata) <- metadata[["sample_id"]]
metadata[["biotrust_condition"]] <- relevel(factor(metadata[[condition_column]]), ref = reference_level)
for (covariate in covariates) {
  if (is.character(metadata[[covariate]])) metadata[[covariate]] <- factor(metadata[[covariate]])
}
design_formula <- reformulate(c(covariates, "biotrust_condition"))

if (method == "edger_qlf") {
  suppressPackageStartupMessages(library(edgeR))
  design <- model.matrix(design_formula, data = metadata)
  coefficient_name <- paste0("biotrust_condition", make.names(comparison_level))
  coefficient <- match(coefficient_name, colnames(design))
  if (is.na(coefficient)) stop("Requested comparison is not estimable in the model matrix")
  data <- DGEList(counts = count_matrix)
  keep <- filterByExpr(data, design = design)
  if (!any(keep)) stop("No features passed edgeR::filterByExpr")
  data <- data[keep, , keep.lib.sizes = FALSE]
  data <- calcNormFactors(data)
  data <- estimateDisp(data, design)
  fit <- glmQLFit(data, design, robust = TRUE)
  test <- glmQLFTest(fit, coef = coefficient)
  table <- topTags(test, n = Inf, sort.by = "none")$table
  output <- data.frame(
    feature_id = rownames(table),
    log2_fold_change = table$logFC,
    statistic = table$F,
    p_value = table$PValue,
    adjusted_p_value = table$FDR,
    check.names = FALSE
  )
  package_version <- as.character(packageVersion("edgeR"))
  package_name <- "edgeR"
} else {
  suppressPackageStartupMessages(library(DESeq2))
  keep <- rowSums(count_matrix >= 10L) >= 2L
  if (!any(keep)) stop("No features passed the DESeq2 independent count prefilter")
  data <- DESeqDataSetFromMatrix(
    countData = count_matrix[keep, , drop = FALSE],
    colData = metadata,
    design = design_formula
  )
  dispersion_note <- ""
  data <- tryCatch(
    DESeq(data, quiet = TRUE),
    error = function(error) {
      if (!grepl("all gene-wise dispersion estimates", conditionMessage(error), fixed = TRUE)) stop(error)
      fallback <- estimateSizeFactors(data)
      fallback <- estimateDispersionsGeneEst(fallback, quiet = TRUE)
      dispersions(fallback) <- mcols(fallback)$dispGeneEst
      dispersion_note <<- "DESeq2 used documented gene-wise dispersion estimates because the fitted dispersion trend was not estimable."
      nbinomWaldTest(fallback, quiet = TRUE)
    }
  )
  table <- results(data, contrast = c("biotrust_condition", comparison_level, reference_level))
  output <- data.frame(
    feature_id = rownames(table),
    log2_fold_change = table$log2FoldChange,
    statistic = table$stat,
    p_value = table$pvalue,
    adjusted_p_value = table$padj,
    check.names = FALSE
  )
  package_version <- as.character(packageVersion("DESeq2"))
  package_name <- "DESeq2"
}

write.csv(output, results_path, row.names = FALSE, na = "NA")
audit <- c(
  version_R = paste(R.version$major, R.version$minor, sep = "."),
  setNames(package_version, paste0("version_", package_name)),
  retained_feature_count = nrow(output),
  execution_note = if (exists("dispersion_note")) dispersion_note else ""
)
write.table(
  data.frame(key = names(audit), value = unname(audit)),
  audit_path,
  sep = "\t",
  row.names = FALSE,
  col.names = FALSE,
  quote = FALSE
)
