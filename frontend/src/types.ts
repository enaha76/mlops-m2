export interface HealthResponse {
  status: string;
  model_loaded: boolean;
  preprocessor_loaded: boolean;
  model_version: string;
  run_id: string;
}

export interface PredictRequest {
  age: number;
  job: string;
  marital: string;
  education: string;
  default: string;
  housing: string;
  loan: string;
  contact: string;
  month: string;
  poutcome: string;
  balance: number;
  day: number;
  duration: number;
  campaign: number;
  pdays: number;
  previous: number;
}

export interface PredictResponse {
  prediction: "yes" | "no";
  probability_yes: number;
  model_version: string;
  error?: string;
}

export interface WorklistEntry extends PredictResponse {
  clientId: string;
  age?: number;
  job?: string;
  addedAt: string;
}

export type Theme = "light" | "dark" | "system";

export interface UserSettings {
  threshold: number;
  theme: Theme;
  autoRefreshInterval: number;
  csvSeparator: "." | ",";
}
