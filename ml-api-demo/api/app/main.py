"""FastAPI application exposing health, model info, and prediction endpoints."""

import logging
import os
import time
from contextlib import asynccontextmanager
from typing import Annotated, AsyncIterator

from fastapi import Depends, FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from app.inference import DEFAULT_MODEL, ModelService, get_model_service
from app.schemas import (
    ErrorResponse,
    HealthResponse,
    ModelInfoResponse,
    Prediction,
    PredictRequest,
    PredictResponse,
)


logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    get_model_service()
    yield


app = FastAPI(
    title="ML Inference API",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


ModelServiceDep = Annotated[ModelService, Depends(get_model_service)]


@app.get("/")
def root(service: ModelServiceDep) -> dict[str, str]:
    return {
        "name": "ML Inference API",
        "version": "1.0.0",
        "model": service.model_name,
        "status": "ok",
    }


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse | JSONResponse:
    # /health must not depend on get_model_service via Depends: if the model
    # failed to load, the dependency would raise before the endpoint runs and
    # we could never report 503.
    try:
        service = get_model_service()
    except Exception:
        logger.exception("health check: model service unavailable")
        model_name = os.environ.get("MODEL_NAME", DEFAULT_MODEL)
        return JSONResponse(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            content=HealthResponse(
                status="unavailable",
                model_loaded=False,
                model=model_name,
            ).model_dump(),
        )
    return HealthResponse(
        status="ok",
        model_loaded=True,
        model=service.model_name,
    )


@app.get("/model", response_model=ModelInfoResponse)
def model_info(service: ModelServiceDep) -> ModelInfoResponse:
    return ModelInfoResponse(
        model=service.model_name,
        task=service.task,
        num_labels=service.num_labels,
        labels=service.labels,
    )


@app.post("/predict", response_model=PredictResponse)
def predict(req: PredictRequest, service: ModelServiceDep) -> PredictResponse:
    texts = req.as_list()
    start = time.perf_counter()
    raw = service.predict(texts)
    elapsed_ms = (time.perf_counter() - start) * 1000.0
    predictions = [Prediction(label=r["label"], score=r["score"]) for r in raw]
    return PredictResponse(
        predictions=predictions,
        model=service.model_name,
        inference_ms=elapsed_ms,
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception(
        "unhandled exception on %s %s",
        request.method,
        request.url.path,
    )
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ErrorResponse(
            detail="Internal server error",
            error_type=type(exc).__name__,
        ).model_dump(),
    )
