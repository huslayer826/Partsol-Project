"""Gunicorn configuration for the ML inference API."""

import os


bind = "0.0.0.0:8000"
workers = int(os.getenv("WORKERS", 4))
worker_class = "uvicorn.workers.UvicornWorker"
timeout = 120
keepalive = 5
preload_app = True
accesslog = "-"
errorlog = "-"
loglevel = os.getenv("LOG_LEVEL", "info").lower()
