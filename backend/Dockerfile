FROM bioconductor/bioconductor_docker:RELEASE_3_23

USER root
ENV DEBIAN_FRONTEND=noninteractive
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PATH="/opt/biotrust-venv/bin:${PATH}"
WORKDIR /app
RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-pip python3-venv \
    && rm -rf /var/lib/apt/lists/*
COPY backend/requirements.txt ./backend/requirements.txt
RUN python3 -m venv /opt/biotrust-venv \
    && pip install --no-cache-dir -r backend/requirements.txt
RUN R --vanilla -q -e 'BiocManager::install(c("edgeR", "DESeq2"), ask = FALSE, update = FALSE)' \
    && R --vanilla -q -e 'stopifnot(requireNamespace("edgeR", quietly = TRUE), requireNamespace("DESeq2", quietly = TRUE))'
COPY backend ./backend
EXPOSE 8000
CMD ["uvicorn", "backend.app.main:app", "--host", "0.0.0.0", "--port", "8000"]
