# syntax=docker/dockerfile:1
# Three-stage build:
#   1. builder     — install Python deps into a venv at /opt/venv
#   2. model-cache — pre-download HuggingFace weights into /opt/hf-cache
#   3. runtime     — slim final image with venv + cache + app, runs as non-root

# ---------------------------------------------------------------------------
# Stage 1: builder
# ---------------------------------------------------------------------------
FROM python:3.11-slim AS builder

ENV PIP_DISABLE_PIP_VERSION_CHECK=1 \
    PIP_NO_CACHE_DIR=1 \
    PYTHONDONTWRITEBYTECODE=1

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY api/requirements.txt /tmp/requirements.txt
RUN pip install --upgrade pip && \
    pip install -r /tmp/requirements.txt

# ---------------------------------------------------------------------------
# Stage 2: model-cache — pre-download HF weights into /opt/hf-cache
# ---------------------------------------------------------------------------
FROM python:3.11-slim AS model-cache

ENV PATH="/opt/venv/bin:$PATH" \
    HF_HOME=/opt/hf-cache \
    PYTHONDONTWRITEBYTECODE=1

COPY --from=builder /opt/venv /opt/venv

ARG MODEL_NAME=distilbert-base-uncased-finetuned-sst-2-english
ENV MODEL_NAME=${MODEL_NAME}

RUN python -c "from transformers import pipeline; pipeline('text-classification', model='${MODEL_NAME}')"

# ---------------------------------------------------------------------------
# Stage 3: runtime
# ---------------------------------------------------------------------------
FROM python:3.11-slim

ENV PATH="/opt/venv/bin:$PATH" \
    HF_HOME=/opt/hf-cache \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Non-root user with UID 1000
RUN groupadd --system --gid 1000 appuser && \
    useradd --system --uid 1000 --gid 1000 --home-dir /app --shell /sbin/nologin appuser

# Venv is root-owned and world-readable — appuser can run from it.
COPY --from=builder /opt/venv /opt/venv

# HF cache must be owned by appuser so transformers can write lock/temp files.
COPY --from=model-cache --chown=appuser:appuser /opt/hf-cache /opt/hf-cache

WORKDIR /app

COPY --chown=appuser:appuser api/app /app/app
COPY --chown=appuser:appuser api/gunicorn_conf.py /app/gunicorn_conf.py

USER appuser

EXPOSE 8000

HEALTHCHECK --start-period=60s --interval=30s --timeout=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health').read()" || exit 1

CMD ["gunicorn", "-c", "gunicorn_conf.py", "app.main:app"]
