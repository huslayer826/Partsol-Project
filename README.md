# Partsol-Project

ML deployment demo: containerized HuggingFace sentiment classification API
fronted by NGINX, with a Next.js operator UI and a demonstration Jupyter
notebook.

The project lives in [`ml-api-demo/`](./ml-api-demo/) — see its
[README](./ml-api-demo/README.md) for the full write-up, architecture diagram,
model justification, API reference, and runbook.

## Quick Start

```bash
cd ml-api-demo
docker compose up --build
# open http://localhost
```
