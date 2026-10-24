/**
 * Central AI Router for LearnOS AI
 * Orchestrates multi-provider fallback using 100% free-tier AI APIs:
 * Gemini Free -> Groq Free -> Cerebras Free -> Deterministic Baseline
 */

import { geminiAdapter } from "@/lib/ai/providers/gemini";
import { groqAdapter } from "@/lib/ai/providers/groq";
import { cerebrasAdapter } from "@/lib/ai/providers/cerebras";
import type {
  AIProviderAdapter,
  AIProviderId,
  AIRouterOptions,
  AIRouterResult,
  ProviderAttemptLog,
} from "@/lib/ai/types";
import { sanitizeErrorMessage } from "@/lib/ai/sanitizer";

export * from "@/lib/ai/types";
export { sanitizeErrorMessage } from "@/lib/ai/sanitizer";

const ADAPTERS: Record<AIProviderId, AIProviderAdapter> = {
  gemini: geminiAdapter,
  groq: groqAdapter,
  cerebras: cerebrasAdapter,
};

const DEFAULT_ORDER: AIProviderId[] = ["gemini", "groq", "cerebras"];

/**
 * Resolves the configured provider order from environment or overrides.
 */
export function getProviderOrder(overrideOrder?: AIProviderId[]): AIProviderId[] {
  if (overrideOrder && overrideOrder.length > 0) {
    return overrideOrder.filter((id) => id in ADAPTERS);
  }

  const envOrder = process.env.AI_PROVIDER_ORDER;
  if (typeof envOrder === "string" && envOrder.trim().length > 0) {
    const parsed = envOrder
      .split(",")
      .map((item) => item.trim().toLowerCase())
      .filter((item): item is AIProviderId => item in ADAPTERS);

    if (parsed.length > 0) {
      return parsed;
    }
  }

  return DEFAULT_ORDER;
}

/**
 * Returns the list of providers that have valid API keys in the environment.
 */
export function getConfiguredProviders(overrideOrder?: AIProviderId[]): AIProviderId[] {
  const order = getProviderOrder(overrideOrder);
  return order.filter((id) => ADAPTERS[id]?.isConfigured());
}

/**
 * Central execution router for all LearnOS educational features.
 * Routes through configured providers in order with a strict 10s per-provider timeout,
 * validates schema, and falls back to deterministic local baseline if all fail.
 */
export async function routeAIRequest<T>({
  prompt,
  systemInstruction,
  pdfData,
  jsonSchema,
  baselineFallback,
  validator,
  timeoutMs = 10000,
  overrideOrder,
}: AIRouterOptions<T>): Promise<AIRouterResult<T>> {
  const overallStartTime = Date.now();
  const configuredProviders = getConfiguredProviders(overrideOrder);
  const attempts: ProviderAttemptLog[] = [];

  // If no providers are configured in the environment, return baseline immediately (0ms overhead)
  if (configuredProviders.length === 0) {
    return {
      data: baselineFallback,
      source: "baseline",
      model: "deterministic-baseline",
      latencyMs: Date.now() - overallStartTime,
      message: "No AI provider keys configured. Operating in deterministic baseline mode.",
      attempts: [],
    };
  }

  for (const providerId of configuredProviders) {
    const adapter = ADAPTERS[providerId];
    if (!adapter) continue;

    const attemptStartTime = Date.now();

    try {
      const result = await adapter.generateStructured<T>(
        {
          prompt,
          systemInstruction,
          pdfData,
          jsonSchema,
          timeoutMs,
        },
        validator
      );

      const attemptLatency = Date.now() - attemptStartTime;

      if (result.success && result.data !== undefined) {
        attempts.push({
          provider: providerId,
          status: "success",
          model: result.model,
          latencyMs: attemptLatency,
        });

        return {
          data: result.data,
          source: providerId,
          model: result.model,
          latencyMs: Date.now() - overallStartTime,
          message: `Generated via ${adapter.name} (${result.model}).`,
          attempts,
        };
      }

      // Record non-successful attempt (e.g. 429, 503, invalid JSON, or schema validation failed)
      attempts.push({
        provider: providerId,
        status: result.error?.includes("schema validation")
          ? "invalid_schema"
          : result.error?.includes("aborted") || result.error?.includes("timeout")
          ? "timeout"
          : "error",
        model: result.model,
        latencyMs: attemptLatency,
        error: result.error || "Unknown provider error",
      });
    } catch (err) {
      const sanitized = sanitizeErrorMessage(err);
      attempts.push({
        provider: providerId,
        status: sanitized.includes("aborted") || sanitized.includes("timeout")
          ? "timeout"
          : "error",
        model: adapter.defaultModel,
        latencyMs: Date.now() - attemptStartTime,
        error: sanitized,
      });
    }
  }

  // All configured providers failed or returned invalid responses -> Return deterministic baseline
  const totalLatency = Date.now() - overallStartTime;
  const failureSummary = attempts
    .map((a) => `${a.provider}: ${a.error || a.status}`)
    .join(" | ");

  return {
    data: baselineFallback,
    source: "baseline",
    model: "deterministic-baseline",
    latencyMs: totalLatency,
    message: "All configured AI providers failed. Using deterministic baseline fallback.",
    error: failureSummary,
    attempts,
  };
}

/**
 * Diagnostic test helper for all free AI providers.
 */
export async function testMultiProviderConnection(): Promise<{
  configuredProviders: AIProviderId[];
  providerOrder: AIProviderId[];
  activeSource: string;
  results: Record<string, { configured: boolean; model: string; ok: boolean; latencyMs?: number; error?: string }>;
}> {
  const providerOrder = getProviderOrder();
  const configuredProviders = getConfiguredProviders();
  const results: Record<string, { configured: boolean; model: string; ok: boolean; latencyMs?: number; error?: string }> = {};

  for (const id of providerOrder) {
    const adapter = ADAPTERS[id];
    const isConfig = adapter.isConfigured();

    if (!isConfig) {
      results[id] = {
        configured: false,
        model: adapter.defaultModel,
        ok: false,
        error: "API key not configured in environment.",
      };
      continue;
    }

    const start = Date.now();
    try {
      const res = await adapter.generateStructured<{ status: string }>(
        {
          prompt: "Return a JSON object: {\"status\": \"ok\"}",
          timeoutMs: 8000,
        },
        (data): data is { status: string } =>
          typeof data === "object" && data !== null && "status" in data
      );

      results[id] = {
        configured: true,
        model: res.model,
        ok: res.success,
        latencyMs: Date.now() - start,
        error: res.error,
      };
    } catch (err) {
      results[id] = {
        configured: true,
        model: adapter.defaultModel,
        ok: false,
        latencyMs: Date.now() - start,
        error: sanitizeErrorMessage(err),
      };
    }
  }

  const activeProvider = configuredProviders.find((id) => results[id]?.ok) ?? "baseline";

  return {
    configuredProviders,
    providerOrder,
    activeSource: activeProvider,
    results,
  };
}
