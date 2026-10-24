import { GoogleGenAI, type GenerateContentConfig, type ContentListUnion } from "@google/genai";
import type { AIProviderAdapter, AIProviderRequest, AIProviderResult } from "@/lib/ai/types";
import { sanitizeErrorMessage, extractAndParseJSON } from "@/lib/ai/sanitizer";

export const GEMINI_MODEL = "gemini-3.8-flash";

let genAIClient: GoogleGenAI | null = null;

function getClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key || key.includes("YOUR_GEMINI_API_KEY")) {
    return null;
  }
  if (!genAIClient) {
    genAIClient = new GoogleGenAI({ apiKey: key });
  }
  return genAIClient;
}

export const geminiAdapter: AIProviderAdapter = {
  id: "gemini",
  name: "Google Gemini Free",
  defaultModel: GEMINI_MODEL,

  isConfigured(): boolean {
    const key = process.env.GEMINI_API_KEY;
    return Boolean(
      typeof key === "string" &&
        key.trim().length > 0 &&
        !key.includes("YOUR_GEMINI_API_KEY")
    );
  },

  async generateStructured<T>(
    req: AIProviderRequest,
    validator?: (data: unknown) => data is T
  ): Promise<AIProviderResult<T>> {
    const startTime = Date.now();

    if (!this.isConfigured()) {
      return {
        success: false,
        source: "gemini",
        model: GEMINI_MODEL,
        latencyMs: 0,
        error: "GEMINI_API_KEY is not configured in environment.",
      };
    }

    const ai = getClient();
    if (!ai) {
      return {
        success: false,
        source: "gemini",
        model: GEMINI_MODEL,
        latencyMs: 0,
        error: "Failed to initialize Gemini client.",
      };
    }

    try {
      const timeoutMs = req.timeoutMs ?? 10000;
      const config: GenerateContentConfig = {
        responseMimeType: "application/json",
        abortSignal: AbortSignal.timeout(timeoutMs),
        maxOutputTokens: 8_192,
      };

      if (req.systemInstruction) {
        config.systemInstruction = req.systemInstruction;
      }

      if (req.jsonSchema) {
        config.responseSchema = req.jsonSchema as GenerateContentConfig["responseSchema"];
      }

      let contents: ContentListUnion | string;
      if (req.pdfData) {
        contents = [
          {
            inlineData: {
              mimeType: req.pdfData.mimeType,
              data: req.pdfData.base64Data,
            },
          },
          {
            text: req.prompt ?? "Analyze the document and produce the required structured JSON.",
          },
        ];
      } else {
        contents = req.prompt ?? "";
      }

      const response = await ai.models.generateContent({
        model: GEMINI_MODEL,
        contents,
        config,
      });

      const rawText = response.text?.trim() ?? "";
      if (!rawText) {
        throw new Error("Empty response received from Gemini.");
      }
      if (new TextEncoder().encode(rawText).byteLength > 512 * 1024) {
        throw new Error("Gemini response exceeded the size limit.");
      }

      const parsed = extractAndParseJSON<unknown>(rawText);

      if (validator && !validator(parsed)) {
        return {
          success: false,
          rawText,
          source: "gemini",
          model: GEMINI_MODEL,
          latencyMs: Date.now() - startTime,
          error: "Gemini structured output failed schema validation.",
        };
      }

      return {
        success: true,
        data: parsed as T,
        rawText,
        source: "gemini",
        model: GEMINI_MODEL,
        latencyMs: Date.now() - startTime,
      };
    } catch (err) {
      const sanitized = sanitizeErrorMessage(err);
      return {
        success: false,
        source: "gemini",
        model: GEMINI_MODEL,
        latencyMs: Date.now() - startTime,
        error: sanitized,
      };
    }
  },
};
