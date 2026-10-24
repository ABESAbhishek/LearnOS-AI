export type AIProviderId = "gemini" | "groq" | "cerebras";

export type AISource = AIProviderId | "baseline";

export interface AIProviderRequest {
  prompt?: string;
  systemInstruction?: string;
  pdfData?: {
    mimeType: string;
    base64Data: string;
  };
  jsonSchema?: unknown;
  timeoutMs?: number;
}

export interface AIProviderResult<T = unknown> {
  success: boolean;
  data?: T;
  rawText?: string;
  source: AIProviderId;
  model: string;
  latencyMs: number;
  error?: string;
}

export interface AIProviderAdapter {
  id: AIProviderId;
  name: string;
  defaultModel: string;
  isConfigured: () => boolean;
  generateStructured: <T>(
    req: AIProviderRequest,
    validator?: (data: unknown) => data is T
  ) => Promise<AIProviderResult<T>>;
}

export interface AIRouterOptions<T> {
  prompt?: string;
  systemInstruction?: string;
  pdfData?: {
    mimeType: string;
    base64Data: string;
  };
  jsonSchema?: unknown;
  baselineFallback: T;
  validator?: (data: unknown) => data is T;
  timeoutMs?: number;
  overrideOrder?: AIProviderId[];
}

export interface ProviderAttemptLog {
  provider: AIProviderId;
  status: "success" | "error" | "timeout" | "invalid_schema" | "skipped";
  model?: string;
  latencyMs?: number;
  error?: string;
}

export interface AIRouterResult<T> {
  data: T;
  source: AISource;
  model: string;
  latencyMs: number;
  message?: string;
  error?: string;
  attempts?: ProviderAttemptLog[];
}
