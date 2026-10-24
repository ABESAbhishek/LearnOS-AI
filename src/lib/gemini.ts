import { GoogleGenAI, type GenerateContentConfig, type ContentListUnion, Type } from "@google/genai";

/**
 * Pinned Gemini model for reproducible hackathon execution with flexible environment override.
 * Stable default: gemini-3.8-flash, with automatic fallback to gemini-3.1-flash-lite on transient/quota spikes.
 */
export const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
export const GEMINI_FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL || "gemini-3.1-flash-lite";

export type AISource = "gemini" | "baseline";

export interface AIResult<T> {
  data: T;
  source: AISource;
  model: string;
  latencyMs?: number;
  error?: string;
}

export interface GeminiTestResponse {
  configured: boolean;
  source: AISource;
  model: string;
  latencyMs?: number;
  message: string;
  sampleOutput?: unknown;
  error?: string;
}

export interface GenerateStructuredOptions<T> {
  prompt?: string;
  contents?: ContentListUnion | string;
  systemInstruction?: string;
  responseSchema?: GenerateContentConfig["responseSchema"];
  baselineFallback: T;
  validator?: (data: unknown) => data is T;
}

/**
 * Check whether GEMINI_API_KEY is configured on the server.
 * Never exposes the key string.
 */
export function isGeminiConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY;
  return Boolean(
    typeof key === "string" &&
      key.trim().length > 0 &&
      !key.includes("YOUR_GEMINI_API_KEY")
  );
}

/**
 * Safely sanitizes error messages so no API keys or credentials can ever leak.
 */
export function sanitizeErrorMessage(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err ?? "Unknown error");
  const key = process.env.GEMINI_API_KEY?.trim();
  if (key && key.length > 5) {
    return raw.split(key).join("[REDACTED_API_KEY]");
  }
  return raw;
}

// Server-side singleton instance
let genAIClient: GoogleGenAI | null = null;

export function getGeminiClient(): GoogleGenAI | null {
  if (!isGeminiConfigured()) {
    return null;
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY!.trim(),
    });
  }
  return genAIClient;
}

/**
 * Executes a structured Gemini generation using JSON schema output.
 * If Gemini is not configured, or if the request fails, or if validation fails,
 * it returns the deterministic baselineFallback with source: "baseline".
 * Uses a strict 10s timeout and bounded retry / fallback model.
 */
export async function generateStructuredWithFallback<T>({
  prompt,
  contents,
  systemInstruction,
  responseSchema,
  baselineFallback,
  validator,
}: GenerateStructuredOptions<T>): Promise<AIResult<T>> {
  const startTime = Date.now();

  if (!isGeminiConfigured()) {
    return {
      data: baselineFallback,
      source: "baseline",
      model: GEMINI_MODEL,
      latencyMs: Date.now() - startTime,
    };
  }

  const inputContents = contents ?? prompt;
  if (!inputContents) {
    return {
      data: baselineFallback,
      source: "baseline",
      model: GEMINI_MODEL,
      latencyMs: Date.now() - startTime,
      error: "No contents or prompt provided for generation",
    };
  }

  const ai = getGeminiClient();
  if (!ai) {
    return {
      data: baselineFallback,
      source: "baseline",
      model: GEMINI_MODEL,
      latencyMs: Date.now() - startTime,
      error: "Gemini client could not be initialized",
    };
  }

  const attemptCall = async (modelName: string): Promise<T> => {
    const config: GenerateContentConfig = {
      responseMimeType: "application/json",
      abortSignal: AbortSignal.timeout(10000), // Strict 10-second bound
    };

    if (systemInstruction) {
      config.systemInstruction = systemInstruction;
    }

    if (responseSchema) {
      config.responseSchema = responseSchema;
    }

    const response = await ai.models.generateContent({
      model: modelName,
      contents: inputContents,
      config,
    });

    const text = response.text?.trim();
    if (!text) {
      throw new Error("Empty response returned by Gemini model");
    }

    const parsed: unknown = JSON.parse(text);

    if (validator && !validator(parsed)) {
      throw new Error("Gemini response failed structural validation");
    }

    return parsed as T;
  };

  let chosenModel = GEMINI_MODEL;
  try {
    try {
      const data = await attemptCall(chosenModel);
      return {
        data,
        source: "gemini",
        model: chosenModel,
        latencyMs: Date.now() - startTime,
      };
    } catch (firstErr: unknown) {
      const errMsg = String((firstErr as { message?: string })?.message || firstErr);
      const isRecoverable = errMsg.includes("503") || errMsg.includes("UNAVAILABLE") || errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("NOT_FOUND") || errMsg.includes("404");

      if (isRecoverable && GEMINI_FALLBACK_MODEL && GEMINI_FALLBACK_MODEL !== chosenModel) {
        chosenModel = GEMINI_FALLBACK_MODEL;
        const data = await attemptCall(chosenModel);
        return {
          data,
          source: "gemini",
          model: chosenModel,
          latencyMs: Date.now() - startTime,
        };
      }

      throw firstErr;
    }
  } catch (err: unknown) {
    const sanitized = sanitizeErrorMessage(err);
    return {
      data: baselineFallback,
      source: "baseline",
      model: chosenModel,
      latencyMs: Date.now() - startTime,
      error: sanitized,
    };
  }
}

/**
 * Diagnostic test helper for the Gemini backend connection.
 */
export async function testGeminiConnection(): Promise<GeminiTestResponse> {
  const startTime = Date.now();
  const configured = isGeminiConfigured();

  if (!configured) {
    return {
      configured: false,
      source: "baseline",
      model: GEMINI_MODEL,
      latencyMs: Date.now() - startTime,
      message:
        "GEMINI_API_KEY is not set or empty in environment. LearnOS AI is operating in deterministic baseline mode.",
      sampleOutput: {
        status: "ready_baseline",
        echo: "LearnOS AI DSA demo profile is operational (deterministic fallback).",
      },
    };
  }

  try {
    const ai = getGeminiClient();
    if (!ai) {
      throw new Error("Failed to instantiate GoogleGenAI client");
    }

    let chosenModel = GEMINI_MODEL;
    const callTest = async (modelName: string) => {
      return ai.models.generateContent({
        model: modelName,
        contents:
          "Return a JSON object with keys 'status' (string: 'ok'), 'service' (string: 'LearnOS AI Gemini Service'), and 'timestamp' (string ISO date).",
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              status: { type: Type.STRING },
              service: { type: Type.STRING },
              timestamp: { type: Type.STRING },
            },
            required: ["status", "service", "timestamp"],
          },
        },
      });
    };

    let response;
    try {
      response = await callTest(chosenModel);
    } catch (firstErr) {
      const errMsg = String((firstErr as { message?: string })?.message || firstErr);
      const isRecoverable = errMsg.includes("503") || errMsg.includes("UNAVAILABLE") || errMsg.includes("429") || errMsg.includes("RESOURCE_EXHAUSTED") || errMsg.includes("NOT_FOUND") || errMsg.includes("404");
      if (isRecoverable && GEMINI_FALLBACK_MODEL && GEMINI_FALLBACK_MODEL !== chosenModel) {
        chosenModel = GEMINI_FALLBACK_MODEL;
        response = await callTest(chosenModel);
      } else {
        throw firstErr;
      }
    }

    const parsed = JSON.parse(response.text || "{}");

    return {
      configured: true,
      source: "gemini",
      model: chosenModel,
      latencyMs: Date.now() - startTime,
      message: `Successfully connected to Gemini API with model ${chosenModel}.`,
      sampleOutput: parsed,
    };
  } catch (err) {
    const sanitized = sanitizeErrorMessage(err);
    return {
      configured: true,
      source: "baseline",
      model: GEMINI_MODEL,
      latencyMs: Date.now() - startTime,
      message:
        "Gemini API call failed. Using deterministic baseline fallback.",
      error: sanitized,
      sampleOutput: {
        status: "fallback_baseline",
        echo: "LearnOS AI DSA demo profile is active.",
      },
    };
  }
}

export { Type };
