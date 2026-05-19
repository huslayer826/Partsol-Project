"""Structured JSON logging with request_id propagation via contextvars."""

import contextvars
import datetime
import logging
import os
import sys
from typing import Any

from pythonjsonlogger import jsonlogger


DEFAULT_LOG_LEVEL = "INFO"

# Set by RequestIDMiddleware and consumed by RequestIDFilter so that logs
# emitted anywhere during request handling (uvicorn, app, libraries) are
# tagged with the originating request_id without threading it through every
# logger call.
request_id_var: contextvars.ContextVar[str | None] = contextvars.ContextVar(
    "request_id", default=None
)


class RequestIDFilter(logging.Filter):
    """Stamp every record with the current request_id from the contextvar."""

    def filter(self, record: logging.LogRecord) -> bool:
        rid = request_id_var.get()
        if rid is not None:
            record.request_id = rid
        return True


class ISOJsonFormatter(jsonlogger.JsonFormatter):
    """JsonFormatter that emits ISO 8601 UTC timestamps and a renamed `level`."""

    def add_fields(
        self,
        log_record: dict[str, Any],
        record: logging.LogRecord,
        message_dict: dict[str, Any],
    ) -> None:
        super().add_fields(log_record, record, message_dict)
        log_record["timestamp"] = (
            datetime.datetime.fromtimestamp(record.created, tz=datetime.timezone.utc)
            .isoformat()
            .replace("+00:00", "Z")
        )
        log_record["level"] = record.levelname
        log_record.pop("asctime", None)
        log_record.pop("levelname", None)


def configure_logging(log_level: str | None = None) -> None:
    """Configure root and uvicorn loggers to emit one JSON record per line on stdout."""
    resolved = (log_level or os.environ.get("LOG_LEVEL") or DEFAULT_LOG_LEVEL).upper()

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(ISOJsonFormatter("%(name)s %(message)s"))
    handler.addFilter(RequestIDFilter())

    # Route warnings.warn() through logging so they don't show up as raw
    # multi-line stderr noise next to our JSON lines.
    logging.captureWarnings(True)

    root = logging.getLogger()
    root.setLevel(resolved)
    root.handlers = [handler]

    for name in ("uvicorn", "uvicorn.error", "uvicorn.access"):
        uv = logging.getLogger(name)
        uv.handlers = [handler]
        uv.propagate = False
        uv.setLevel(resolved)
