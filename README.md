# Partsol-Project

ML deployment demo: containerized HuggingFace sentiment classification API
fronted by NGINX, with a Next.js operator UI and a demonstration Jupyter
notebook.

The runnable project lives in [`ml-api-demo/`](./ml-api-demo/). See
[`ml-api-demo/README.md`](./ml-api-demo/README.md) for the full architecture
write-up, model justification, API reference, notebook instructions, and
production notes.

## Recruiter Quick Start

Prerequisites:

- Docker Desktop or Docker Engine
- Docker Compose v2
- Port 80 available on your machine
- About 3 GB of free disk space for the container images and cached model

Run the full app:

```bash
git clone https://github.com/huslayer826/Partsol-Project.git
cd Partsol-Project
cd ml-api-demo
docker compose up --build
```

Then open:

- UI: http://localhost
- API health check: http://localhost/api/health

You can also test the inference API directly:

```bash
curl -X POST http://localhost/api/predict \
  -H 'Content-Type: application/json' \
  -d '{"text": "I love this product"}'
```

The first build downloads and caches the HuggingFace model inside the API image,
so the initial `docker compose up --build` can take a few minutes.

To stop the app:

```bash
docker compose down
```

If port 80 is already in use, edit `ml-api-demo/docker-compose.yml` and change
the nginx port mapping from `"80:80"` to another host port such as `"8080:80"`,
then open `http://localhost:8080`.
