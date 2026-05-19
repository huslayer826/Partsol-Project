"""Request ID middleware: tag every request, emit start/finish logs, set header."""

import logging
import time
import uuid

from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response

from app.logging_config import request_id_var


logger = logging.getLogger(__name__)


class RequestIDMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self,
        request: Request,
        call_next: RequestResponseEndpoint,
    ) -> Response:
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        # No manual reset: each request runs in its own asyncio Task with a
        # fresh copy of the context, so the var dies with the task. Leaving it
        # set lets downstream logs in the same task (e.g. uvicorn.access,
        # which emits after dispatch returns) still see the request_id.
        request_id_var.set(request_id)
        start = time.perf_counter()
        method = request.method
        path = request.url.path

        logger.info("request.start", extra={"method": method, "path": path})

        try:
            response = await call_next(request)
        except Exception:
            duration_ms = (time.perf_counter() - start) * 1000.0
            logger.exception(
                "request.error",
                extra={
                    "method": method,
                    "path": path,
                    "duration_ms": duration_ms,
                },
            )
            raise

        duration_ms = (time.perf_counter() - start) * 1000.0
        response.headers["X-Request-ID"] = request_id
        logger.info(
            "request.finish",
            extra={
                "method": method,
                "path": path,
                "status_code": response.status_code,
                "duration_ms": duration_ms,
            },
        )
        return response
