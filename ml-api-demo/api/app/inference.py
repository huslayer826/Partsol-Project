"""ModelService wrapper around a HuggingFace text-classification pipeline."""

import logging
import os
from functools import lru_cache
from typing import Any

from transformers import pipeline


logger = logging.getLogger(__name__)

DEFAULT_MODEL = "distilbert-base-uncased-finetuned-sst-2-english"
TASK = "text-classification"


class ModelService:
    """Loads a HuggingFace text-classification model and serves predictions."""

    def __init__(self, model_name: str) -> None:
        self.model_name: str = model_name
        self.task: str = TASK
        logger.info("loading model %s on cpu", model_name)
        try:
            self.pipeline = pipeline(TASK, model=model_name, device=-1)
        except Exception:
            logger.exception("failed to load model %s", model_name)
            raise
        self._labels: list[str] = self._extract_labels()
        logger.info(
            "model %s loaded with %d label(s): %s",
            model_name,
            len(self._labels),
            self._labels,
        )

    def _extract_labels(self) -> list[str]:
        id2label: dict[int, str] = self.pipeline.model.config.id2label
        return [id2label[i] for i in sorted(id2label.keys())]

    @property
    def labels(self) -> list[str]:
        return list(self._labels)

    @property
    def num_labels(self) -> int:
        return len(self._labels)

    def predict(self, texts: list[str]) -> list[dict[str, Any]]:
        results = self.pipeline(texts)
        return list(results)


@lru_cache(maxsize=1)
def get_model_service() -> ModelService:
    """Return the singleton ModelService, loading the model on first call."""
    model_name = os.environ.get("MODEL_NAME", DEFAULT_MODEL)
    return ModelService(model_name)
