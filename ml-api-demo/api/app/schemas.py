"""Pydantic v2 request and response models for the ML inference API."""

from typing import Annotated

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    model_validator,
)


BoundedText = Annotated[str, StringConstraints(min_length=1, max_length=5000)]


class PredictRequest(BaseModel):
    text: BoundedText | None = None
    texts: list[BoundedText] | None = Field(default=None, min_length=1, max_length=32)

    @model_validator(mode="after")
    def _exactly_one_input(self) -> "PredictRequest":
        if self.text is not None and self.texts is not None:
            raise ValueError("Provide either 'text' or 'texts', not both.")
        if self.text is None and self.texts is None:
            raise ValueError("One of 'text' or 'texts' must be provided.")
        return self

    def as_list(self) -> list[str]:
        if self.text is not None:
            return [self.text]
        assert self.texts is not None
        return list(self.texts)


class Prediction(BaseModel):
    label: str
    score: float


class PredictResponse(BaseModel):
    predictions: list[Prediction]
    model: str
    inference_ms: float


class HealthResponse(BaseModel):
    # model_loaded would otherwise trip Pydantic's model_ protected namespace warning.
    model_config = ConfigDict(protected_namespaces=())

    status: str
    model_loaded: bool
    model: str


class ModelInfoResponse(BaseModel):
    model: str
    task: str
    num_labels: int
    labels: list[str]


class ErrorResponse(BaseModel):
    detail: str
    error_type: str
