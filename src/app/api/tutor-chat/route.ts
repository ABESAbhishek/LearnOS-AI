import { NextRequest, NextResponse } from "next/server";
import { Type } from "@google/genai";
import { getConfiguredProviders, routeAIRequest } from "@/lib/ai-router";
import { protectAPIRequest, readLimitedJSON, RequestBodyError } from "@/lib/api-protection";
import { isPlainRecord } from "@/lib/api-validation";
import { mapTutorCitations, tutorSystemInstruction, validateTutorChatRequest, validateTutorProviderAnswer } from "@/lib/tutor-chat";
import type { TutorChatRequest, TutorChatResponse } from "@/types/document";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_REQUEST_BYTES = 72 * 1024;
const CHAT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    answer: { type: Type.STRING },
    answerType: { type: Type.STRING, enum: ["source", "general", "unsupported"] },
    citations: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          sourceId: { type: Type.STRING },
          evidence: { type: Type.STRING },
        },
        required: ["sourceId", "evidence"],
      },
    },
    suggestedPrompt: { type: Type.STRING },
  },
  required: ["answer", "answerType", "citations", "suggestedPrompt"],
};

export async function GET(request: NextRequest) {
  const protection = protectAPIRequest(request, {
    key: "tutor-chat-status",
    limit: 60,
    maxBodyBytes: 1_024,
  });
  if (protection) return NextResponse.json({ error: protection.message }, { status: protection.status });
  return NextResponse.json({ available: getConfiguredProviders().length > 0 });
}

export async function POST(request: NextRequest) {
  const protection = protectAPIRequest(request, {
    key: "tutor-chat",
    limit: 18,
    maxBodyBytes: MAX_REQUEST_BYTES,
  });
  if (protection) {
    return NextResponse.json({ error: protection.message }, {
      status: protection.status,
      headers: protection.retryAfterSeconds ? { "Retry-After": String(protection.retryAfterSeconds) } : undefined,
    });
  }

  try {
    const rawBody = await readLimitedJSON(request, MAX_REQUEST_BYTES);
    if (!isPlainRecord(rawBody) || !validateTutorChatRequest(rawBody)) {
      return NextResponse.json({ error: "Tutor request is invalid or exceeds the context limits." }, { status: 400 });
    }
    const body = rawBody as TutorChatRequest;
    const configuredProviders = getConfiguredProviders();
    if (!configuredProviders.length) {
      return NextResponse.json({ error: "No AI provider is configured. Add a provider key on the server to use live tutor chat." }, { status: 503 });
    }

    const baseline = {
      answer: "The tutor could not reach an AI provider. Please retry in a moment.",
      answerType: body.sourceMode === "documents" ? "unsupported" as const : "general" as const,
      citations: [],
      suggestedPrompt: "Try asking again",
    };
    const prompt = JSON.stringify({
      question: body.question,
      recentConversation: body.history.slice(-8),
      learningContext: {
        route: body.route,
        currentTopic: body.topic,
        learningObjective: body.objective,
        currentPriorityTopic: body.weakestTopic,
        masteryPercent: body.weakestMastery,
      },
      sourceMode: body.sourceMode,
      retrievedSourceRecords: body.sources.map((source) => ({
        sourceId: source.id,
        documentId: source.documentId,
        fileName: source.documentName,
        page: source.pageNumber,
        section: source.sectionTitle,
        excerpt: source.text,
      })),
    });

    const result = await routeAIRequest<typeof baseline>({
      prompt,
      systemInstruction: tutorSystemInstruction(),
      jsonSchema: CHAT_SCHEMA,
      baselineFallback: baseline,
      validator: (value): value is typeof baseline => validateTutorProviderAnswer(value, body),
      timeoutMs: 15_000,
    });

    console.info("[TutorChat] operation", JSON.stringify({
      provider: result.source,
      model: result.model,
      latencyMs: result.latencyMs,
      sourceMode: body.sourceMode,
      sourceCount: body.sources.length,
      attempts: result.attempts?.map((attempt) => ({ provider: attempt.provider, status: attempt.status, latencyMs: attempt.latencyMs })),
    }));

    if (result.source === "baseline" || !validateTutorProviderAnswer(result.data, body)) {
      return NextResponse.json({ error: "The tutor could not get a validated response. Please retry." }, { status: 503 });
    }

    const response: TutorChatResponse = {
      answer: result.data.answer.trim(),
      answerType: result.data.answerType,
      citations: mapTutorCitations(result.data.citations, body.sources),
      suggestedPrompt: result.data.suggestedPrompt?.trim().slice(0, 180) || undefined,
      source: result.source,
      model: result.model,
      latencyMs: result.latencyMs,
      message: body.sourceMode === "documents" ? "Answered from the retrieved document excerpts." : "General learning response.",
    };
    return NextResponse.json<TutorChatResponse>(response);
  } catch (error) {
    if (error instanceof RequestBodyError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[TutorChat] request failed");
    return NextResponse.json({ error: "Tutor request failed. Please try again." }, { status: 500 });
  }
}
