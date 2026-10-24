import type { AIProviderAdapter, AIProviderRequest, AIProviderResult } from "@/lib/ai/types";
import { sanitizeErrorMessage, extractAndParseJSON } from "@/lib/ai/sanitizer";
import { readLimitedResponseJSON, readLimitedResponseText } from "@/lib/ai/response-reader";

export const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
export const GROQ_FALLBACK_MODEL = process.env.GROQ_FALLBACK_MODEL || "openai/gpt-oss-20b";
const GROQ_ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";

export const groqAdapter: AIProviderAdapter = {
  id: "groq",
  name: "Groq Cloud Free",
  defaultModel: GROQ_MODEL,

  isConfigured(): boolean {
    const key = process.env.GROQ_API_KEY;
    return Boolean(
      typeof key === "string" &&
        key.trim().length > 0 &&
        !key.includes("YOUR_GROQ_API_KEY")
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
        source: "groq",
        model: GROQ_MODEL,
        latencyMs: 0,
        error: "GROQ_API_KEY is not configured in environment.",
      };
    }

    const key = process.env.GROQ_API_KEY!.trim();

    try {
      const timeoutMs = req.timeoutMs ?? 10000;
      const messages: Array<{ role: "system" | "user"; content: string }> = [];

      let systemPrompt = req.systemInstruction
        ? `${req.systemInstruction}\n\nIMPORTANT: You must respond ONLY with a single valid, well-formed JSON object. Do not include markdown wrappers, markdown codeblocks, or any explanatory text.`
        : "You are a precise educational AI. You must respond ONLY with a single valid, well-formed JSON object. Do not include markdown codeblocks or conversational text.";

      if (req.jsonSchema) {
        systemPrompt += `\n\nJSON SCHEMA REQUIREMENTS:\nYour JSON response must adhere strictly to this schema definition:\n${JSON.stringify(req.jsonSchema)}`;
      }

      messages.push({ role: "system", content: systemPrompt });

      let userPrompt = req.prompt ?? "";
      if (req.pdfData && !userPrompt) {
        userPrompt = "Analyze the syllabus material and generate the required structured JSON.";
      }
      messages.push({ role: "user", content: userPrompt });

      let chosenModel = GROQ_MODEL;
      let response: Response;

      const callGroq = async (modelName: string) => {
        const requestPayload = {
          model: modelName,
          messages,
          response_format: { type: "json_object" },
          temperature: 0.2,
        };
        return fetch(GROQ_ENDPOINT, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestPayload),
          signal: AbortSignal.timeout(timeoutMs),
        });
      };

      response = await callGroq(chosenModel);

      // If rate limited (429) or model temporarily unavailable, try fallback model if available
      if ((response.status === 429 || response.status === 503) && GROQ_FALLBACK_MODEL && GROQ_FALLBACK_MODEL !== chosenModel) {
        chosenModel = GROQ_FALLBACK_MODEL;
        response = await callGroq(chosenModel);
      }

      if (!response.ok) {
        const errorText = await readLimitedResponseText(response, 8 * 1024).catch(() => "");
        throw new Error(
          `Groq API responded with status ${response.status}: ${errorText.slice(0, 300)}`
        );
      }

      const responseData = (await readLimitedResponseJSON(response)) as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      const rawText = responseData.choices?.[0]?.message?.content?.trim() ?? "";
      if (!rawText) {
        throw new Error("Empty response received from Groq API.");
      }

      const parsed = extractAndParseJSON<unknown>(rawText);

      if (validator && !validator(parsed)) {
        return {
          success: false,
          rawText,
          source: "groq",
          model: chosenModel,
          latencyMs: Date.now() - startTime,
          error: "Groq structured output failed schema validation.",
        };
      }

      return {
        success: true,
        data: parsed as T,
        rawText,
        source: "groq",
        model: chosenModel,
        latencyMs: Date.now() - startTime,
      };
    } catch (err) {
      const sanitized = sanitizeErrorMessage(err);
      return {
        success: false,
        source: "groq",
        model: GROQ_MODEL,
        latencyMs: Date.now() - startTime,
        error: sanitized,
      };
    }
  },
};
