# Extensible Method Library

BioTrust AI treats a method as structured scientific knowledge, not a label in a dropdown. Every Method Card declares its scientific question, non-answers, appropriate uses, assumptions, common failure modes, alternatives, validation, curation state, and official documentation.

## Built-in catalog

The MVP now includes 18 cards spanning:

- RNA-seq expression filtering and normalization-aware modeling
- limma-voom and empirical Bayes workflows
- edgeR quasi-likelihood negative-binomial GLMs
- DESeq2 Wald and likelihood-ratio tests
- competitive, self-contained, and preranked gene-set tests
- repeated-measures modeling with `dream`
- known and latent unwanted-variation approaches
- linear and logistic regression, Spearman correlation, and PCA
- multiple testing and leak-resistant cross-validation

Official starting points include the [edgeR User’s Guide](https://bioconductor.org/packages/release/bioc/vignettes/edgeR/inst/doc/edgeRUsersGuide.pdf), [DESeq2 vignette](https://bioconductor.org/packages/release/bioc/vignettes/DESeq2/inst/doc/DESeq2.html), [limma User’s Guide](https://bioconductor.org/packages/release/bioc/vignettes/limma/inst/doc/usersguide.pdf), [fgsea tutorial](https://bioconductor.org/packages/release/bioc/vignettes/fgsea/inst/doc/fgsea-tutorial.html), [variancePartition dream vignette](https://bioconductor.org/packages/release/bioc/vignettes/variancePartition/inst/doc/dream.html), and [sva vignette](https://bioconductor.org/packages/release/bioc/vignettes/sva/inst/doc/sva.pdf).

## Researcher-created cards

Researchers can add a Method Card in the interface or import a JSON Method Pack. Custom cards:

- remain on the local device in the hosted demonstration;
- are always forced to `REVIEW_REQUIRED`;
- are marked `CUSTOM` everywhere they appear;
- can be exported for review or team sharing;
- cannot enable execution by themselves.

The local FastAPI service also exposes CRUD endpoints for Method Cards. Built-in cards cannot be overwritten or deleted through those endpoints. A custom method becomes executable only after a separately reviewed adapter, allowlisted parameters, deterministic tests, provenance capture, and curator approval are implemented.

## Method Pack shape

```json
{
  "format": "biotrust-method-pack",
  "version": 1,
  "methods": [
    {
      "name": "Synthetic custom method",
      "package": "syntheticPackage",
      "fn": "fit_synthetic",
      "category": "Other",
      "question": "What scientific question does this method answer?",
      "notAnswered": ["Causality"],
      "appropriate": ["Synthetic inputs"],
      "assumptions": ["Inputs satisfy the declared schema"],
      "failureModes": ["Mis-specified input"],
      "alternatives": [],
      "validation": ["Compare against a verified reference implementation"]
    }
  ]
}
```
