/**
 * Security & Data Sanitization for Multi-Provider AI System
 * Ensures absolute prevention of API key leaks and robust JSON parsing.
 */

export function sanitizeErrorMessage(err: unknown): string {
  let message = err instanceof Error ? err.message : String(err ?? "Unknown error");

  const keysToRedact = [
    process.env.GEMINI_API_KEY,
    process.env.GROQ_API_KEY,
    process.env.CEREBRAS_API_KEY,
  ];

  for (const key of keysToRedact) {
    if (typeof key === "string" && key.trim().length > 5) {
      message = message.split(key.trim()).join("[REDACTED_API_KEY]");
    }
  }

  // Also mask standard Bearer authorization patterns if present
  message = message.replace(/Bearer\s+[a-zA-Z0-9_\-\.]{8,}/gi, "Bearer [REDACTED_TOKEN]");

  return message;
}

/**
 * Extracts and parses JSON from model responses, handling potential markdown
 * wrappers (```json ... ```) or conversational preambles/postambles from open models.
 */
export function extractAndParseJSON<T>(rawText: string): T {
  let cleaned = rawText.trim();

  // Strip leading and trailing markdown backticks
  if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```(?:json)?\s*/i, "");
    cleaned = cleaned.replace(/\s*```$/, "");
    cleaned = cleaned.trim();
  }

  // Find outermost JSON object or array bounds
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  const firstBracket = cleaned.indexOf("[");
  const lastBracket = cleaned.lastIndexOf("]");

  const hasObject = firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace;
  const hasArray = firstBracket !== -1 && lastBracket !== -1 && lastBracket > firstBracket;

  if (hasObject && (!hasArray || firstBrace < firstBracket)) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  } else if (hasArray) {
    cleaned = cleaned.slice(firstBracket, lastBracket + 1);
  }

  return JSON.parse(cleaned) as T;
}
