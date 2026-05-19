export interface Prediction {
  label: string;
  score: number;
}

export interface PredictResponse {
  predictions: Prediction[];
  model: string;
  inference_ms: number;
}

export interface HealthResponse {
  status: string;
  model_loaded: boolean;
  model: string;
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  text: string;
  prediction: Prediction;
  inference_ms: number;
}
