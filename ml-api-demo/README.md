# ML Inference API Demo

Containerized HuggingFace model serving with parallel request handling and a polished frontend.

## Quick Start

```bash
docker compose up --build
# open http://localhost
```

Requirements:

- Docker (tested on Docker Desktop 29+)
- Docker Compose v2+
- ~3 GB free disk for the three container images
- Port 80 free on the host

## What This Is

A self-contained ML deployment demo answering the four deliverables from the brief:
a FastAPI service wraps a HuggingFace text-classification pipeline (model swappable
via `MODEL_NAME`), Gunicorn forks Uvicorn workers for parallel inference, and an
NGINX reverse proxy fronts both the API and a Next.js operator UI for live demos.
The repo also includes a Jupyter notebook (`notebook/demo.ipynb`) that exercises
the deployed API end-to-end with single predictions, a 50-request thread-pool load
test, edge-case validation, and a latency distribution chart. Model justification
is in [Model Choice: Why DistilBERT](#model-choice-why-distilbert).

## Architecture

```
                  ┌──────────────────────────────────────────────┐
                  │           docker compose (mlnet)              │
                  │                                                │
   client ──:80──► nginx ─┬─► /         ──► frontend (:3000)       │
                  │       │                 Next.js standalone     │
                  │       │                                        │
                  │       └─► /api/*    ──► api (:8000)            │
                  │                         FastAPI + gunicorn x4 │
                  │                         DistilBERT (CPU)       │
                  └──────────────────────────────────────────────┘
```

Only `nginx:80` is published to the host. The `api` and `frontend` services are
reachable only on the internal `mlnet` bridge network.

Request flow: the browser (or `curl`) hits `nginx` on port 80. NGINX inspects the
path: `/api/*` is prefix-stripped and proxied to the FastAPI container; everything
else falls through to the Next.js container. `X-Request-ID` is generated or
forwarded so every log line for a request shares one ID across nginx and the API.

Three containers, three concerns:

- **nginx** owns ingress — request logging, header rewriting, `/metrics` denial,
  WebSocket upgrade for HMR. Where TLS and rate limiting would go in production.
- **frontend** owns the operator UI. Standalone-output Next.js means the runtime
  image carries only the compiled output, not source or dev dependencies.
- **api** owns inference. FastAPI for ergonomic routes and validation, Gunicorn
  for prefork concurrency, Uvicorn workers for ASGI.

Each can be built, redeployed, and scaled independently.

## Model Choice: Why DistilBERT

Default model: `distilbert-base-uncased-finetuned-sst-2-english`.

- **Small footprint**: ~250 MB / 67 M params keeps the runtime container under
  1.8 GB and cold-start under 5 s.
- **Sub-100 ms CPU inference**: makes the parallel-handling demo legible — the
  notebook's load test shows p95 latency under 200 ms with 10 concurrent threads.
- **Visibly demonstrable**: binary positive / negative sentiment is something a
  non-technical viewer can sanity-check at a glance.
- **Quality / size trade-off**: distilled from BERT-base, retains ~95% of the
  teacher's accuracy on SST-2 at 40% of the size and ~60% of the inference cost.
- **Model-agnostic API**: the FastAPI service wraps
  `transformers.pipeline("text-classification", ...)`, so any HuggingFace
  text-classification model is a drop-in via the `MODEL_NAME` env var.

### Swapping models

Copy `.env.example` to `.env` and edit `MODEL_NAME`:

```bash
cp .env.example .env
# edit MODEL_NAME=... then
docker compose up --build
```

The api Dockerfile's `model-cache` stage downloads weights at **build** time, so
the runtime container never makes network calls and first-request latency stays
low. The build context picks up `MODEL_NAME` from the env via a build arg.

## API Reference

All endpoints below are reachable through nginx at `http://localhost/api/...`.

| Method | Path        | Purpose                                                |
|--------|-------------|--------------------------------------------------------|
| GET    | `/`         | Service identity (name, version, model)                |
| GET    | `/health`   | Readiness (200 with `model_loaded: true`, else 503)    |
| GET    | `/model`    | Model metadata (task, num_labels, labels)              |
| POST   | `/predict`  | Classify text or a batch of texts                      |
| GET    | `/metrics`  | Prometheus metrics (blocked at nginx; internal scrape) |

### `POST /predict`

Request body — exactly one of `text` or `texts`:

```json
{ "text": "I love this product" }
```

```json
{ "texts": ["good", "bad", "mediocre"] }
```

Constraints: each string 1–5000 chars, batches up to 32 items. Pydantic returns
422 for empty strings, oversize inputs, or `text` + `texts` together.

Sample request and response:

```bash
curl -X POST http://localhost/api/predict \
  -H 'Content-Type: application/json' \
  -d '{"text": "I love this product"}'
```

```json
{
  "predictions": [
    { "label": "POSITIVE", "score": 0.9998788833618164 }
  ],
  "model": "distilbert-base-uncased-finetuned-sst-2-english",
  "inference_ms": 51.92
}
```

Every response carries an `X-Request-ID` header that matches the `request_id`
field in the API's JSON logs and the `rid=` field in nginx's access log.

## Parallel Request Handling

- Gunicorn starts with `preload_app=True` and forks 4 Uvicorn workers
  (configurable via `WORKERS`).
- Each worker initializes the model on lifespan startup from the
  `model-cache` layer baked into the image — a ~2 s warm load from local disk,
  zero network calls.
- Linux's fork copy-on-write keeps the Python interpreter and FastAPI app code
  shared across workers; the model tensors themselves are per-worker.
- NGINX distributes requests across workers via its `upstream api` block.
- For higher throughput, raise `WORKERS=` and rebuild, or shape a multi-replica
  deployment with a proper upstream config (see "What I'd Add for Production").

## Observability

- **Structured logs**: every log line emitted by the API is one JSON object per
  line on stdout, parseable directly by ELK / Datadog / CloudWatch.
  `python_json_logger` formats `app.*` loggers and routes `warnings.warn()`
  through the same handler.
- **Per-request tracing**: `RequestIDMiddleware` mints a UUID v4 per request,
  attaches it to `request.state`, sets the `X-Request-ID` response header, and
  propagates the value through `contextvars` so the API's middleware logs and
  Uvicorn's access logs share the same `request_id`. NGINX forwards the header
  (or generates one) on the way in.
- **Prometheus metrics** at `/api/metrics` (blocked at the nginx edge — expected
  to be scraped over the docker network):
  - `http_requests_total` — labeled by method, handler, status
  - `http_request_duration_seconds` — full request latency histogram
  - `inference_duration_seconds` — custom histogram of model inference time,
    labeled by `model_name`
  - `model_load_failures_total` — counter incremented when model loading fails

## Project Structure

```
ml-api-demo/
├── api/                       # FastAPI + gunicorn service
│   ├── Dockerfile             # multi-stage build with pre-baked model cache
│   ├── gunicorn_conf.py       # preload_app, 4 workers, 120s timeout
│   ├── requirements.txt
│   └── app/
│       ├── main.py            # FastAPI app, routes, metrics, exception handler
│       ├── inference.py       # ModelService wrapper around HF pipeline
│       ├── schemas.py         # Pydantic request / response models
│       ├── middleware.py      # RequestIDMiddleware
│       └── logging_config.py  # JSON formatter + contextvar filter
├── frontend/                  # Next.js 14 (App Router) UI
│   ├── Dockerfile             # standalone output, non-root, ~224 MB final
│   ├── app/                   # routes
│   ├── components/            # Header, PredictForm, ResultCard, HistorySidebar, ...
│   ├── lib/                   # api client, types, localStorage helpers
│   └── ...
├── nginx/                     # NGINX reverse proxy
│   ├── Dockerfile
│   └── nginx.conf             # /api/ prefix strip, /metrics deny, frontend pass-through
├── notebook/
│   └── demo.ipynb             # exercises the deployed API end-to-end
├── docker-compose.yml         # ties the three services together
└── .env.example               # MODEL_NAME, WORKERS, LOG_LEVEL, ENVIRONMENT
```

## Running the Notebook

The notebook hits the deployed API at `http://localhost/api`, so the stack must
be running:

```bash
docker compose up -d

# In a Python env with: nbconvert ipykernel matplotlib requests
cd notebook
jupyter nbconvert --to notebook --execute --inplace demo.ipynb
```

The committed `demo.ipynb` already contains outputs from a clean run, so
reviewers can read it as a static artifact without re-executing.

## Performance Notes

Rough numbers from a modern laptop CPU (Apple M-series), 4 gunicorn workers, no
GPU:

- Single `/predict`: 30–80 ms typical
- 50 requests / 10 concurrent threads: wall-clock ~0.6 s, p50 ~110 ms, p95 ~165 ms, p99 ~190 ms
- API container memory: ~700 MB after startup (model + tokenizer + worker overhead)

GPU acceleration: the wrapper hard-codes CPU (`device=-1` in
`api/app/inference.py`). To move to CUDA, change to `device=0` and switch the
base image in `api/Dockerfile` to a CUDA-enabled torch image
(e.g., `pytorch/pytorch:2.4.1-cuda12.1-cudnn9-runtime`). Throughput would jump
roughly 5-10x depending on hardware.

## What I'd Add for Production

Intentionally out of scope for a take-home demo, but worth flagging as the
shortest line to production:

- **HTTPS**: terminate TLS at nginx with Let's Encrypt, or sit the stack behind
  a managed load balancer (ALB / Cloud Run / Fly).
- **Authentication**: API keys or OAuth via nginx's `auth_request`.
- **Rate limiting**: `limit_req_zone` in nginx, scoped per-API-key or per-IP.
- **Model versioning**: route by header to differently-versioned api containers
  for canary / A-B.
- **Autoscaling**: scrape `/api/metrics`, scale workers or replicas on
  `http_requests_total` rate or `inference_duration_seconds` p95.
- **Multi-process Prometheus**: enable `prometheus_client` multiprocess mode so
  one `/metrics` scrape sees the aggregate of all gunicorn workers, not just
  whichever worker answered the scrape.
- **Centralized logging**: ship the JSON log stream to a backend
  (Loki / Datadog / CloudWatch) so `request_id` is queryable across services.
- **Externalized model cache**: today the HF cache is baked into the image; for
  many models, mount a shared volume and lazy-load.
