import { NextRequest, NextResponse } from "next/server";
import { routeAIRequest, sanitizeErrorMessage } from "@/lib/ai-router";
import {
  BATCH_ASSESSMENT_SYSTEM_INSTRUCTION,
  BATCH_ASSESSMENT_SCHEMA,
} from "@/lib/prompts";
import {
  type Question,
  type GenerateAssessmentBatchRequest,
  type GenerateAssessmentBatchResponse,
  CANONICAL_QUESTIONS,
  validateBatchQuestions,
  normalizeQuestion,
} from "@/types/assessment";
import { buildCourseBaselineAssessmentQuestions } from "@/lib/assessment-bank";
import { isBoundedString, isPlainRecord, validateTopicInputs } from "@/lib/api-validation";
import { protectAPIRequest, readLimitedJSON, RequestBodyError } from "@/lib/api-protection";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const protection = protectAPIRequest(req, { key: "generate-assessment", limit: 20, maxBodyBytes: 64 * 1024 });
  if (protection) {
    return NextResponse.json({ error: protection.message }, {
      status: protection.status,
      headers: protection.retryAfterSeconds ? { "Retry-After": String(protection.retryAfterSeconds) } : undefined,
    });
  }

  try {
    const rawBody = await readLimitedJSON(req, 64 * 1024);
    if (!isPlainRecord(rawBody) ||
      (rawBody.useSample !== undefined && typeof rawBody.useSample !== "boolean") ||
      (rawBody.courseName !== undefined && !isBoundedString(rawBody.courseName, 160)) ||
      (rawBody.topics !== undefined && !validateTopicInputs(rawBody.topics, 64))) {
      return NextResponse.json({ error: "Assessment request is invalid." }, { status: 400 });
    }
    const body = rawBody as unknown as GenerateAssessmentBatchRequest;

    // If deterministic sample requested explicitly
    if (Boolean(body.useSample)) {
      return NextResponse.json<GenerateAssessmentBatchResponse>({
        questions: CANONICAL_QUESTIONS,
        source: "baseline",
        message: "Baseline DSA diagnostic questions loaded.",
      });
    }

    const courseName =
      typeof body.courseName === "string" && body.courseName.trim().length > 0
        ? body.courseName.trim()
        : "Data Structures & Algorithms";
    const baselineQuestions = body.topics?.length
      ? buildCourseBaselineAssessmentQuestions(body.topics)
      : CANONICAL_QUESTIONS;

    let topicsSummary = "";
    if (Array.isArray(body.topics) && body.topics.length > 0) {
      topicsSummary = body.topics
        .filter((t) => typeof t.name === "string" && t.name.trim().length > 0)
        .map((t) => {
          const sub =
            Array.isArray(t.subtopics) && t.subtopics.length > 0
              ? `: ${t.subtopics.join(", ")}`
              : "";
          const diff = t.difficulty ? ` [${t.difficulty}]` : "";
          return `- ${t.name}${diff}${sub}`;
        })
        .join("\n");
    }

    if (!topicsSummary) {
      topicsSummary = [
        "- Arrays [Foundational]: Indexing, memory layout, prefix sums",
        "- Linked Lists [Intermediate]: Pointers, singly/doubly linked, reversal",
        "- Stacks [Foundational]: LIFO, parenthesis matching, stack frames",
        "- Queues [Foundational]: FIFO, circular queues, BFS support",
        "- Trees [Intermediate]: Binary search trees, traversals, height",
        "- Hashing [Intermediate]: Hash tables, collision resolution, chaining",
        "- Graphs [Advanced]: Adjacency lists, BFS, DFS, shortest path",
        "- Sorting / Searching [Intermediate]: Binary search invariants, mergesort",
      ].join("\n");
    }

    const prompt = `Course: ${courseName}

Syllabus Topics to Cover:
${topicsSummary}

Generate a comprehensive diagnostic assessment of EXACTLY 8 multiple-choice questions grounded in these syllabus topics.
Ensure:
1. The "questions" array contains EXACTLY 8 questions.
2. Each question's topic matches one of the syllabus topics.
3. Each question has exactly 4 options.
4. correctOption is an integer between 0 and 3.
5. Questions diagnose conceptual understanding and common student misconceptions.`;

    const aiResult = await routeAIRequest<{ questions: Question[] }>({
      prompt,
      systemInstruction: BATCH_ASSESSMENT_SYSTEM_INSTRUCTION,
      jsonSchema: BATCH_ASSESSMENT_SCHEMA,
      baselineFallback: { questions: baselineQuestions },
      validator: validateBatchQuestions,
    });

    const allowedTopics = new Set((body.topics || []).map((topic) => topic.name.toLowerCase()));
    if (
      aiResult.source !== "baseline" &&
      aiResult.data &&
      Array.isArray(aiResult.data.questions) &&
      aiResult.data.questions.length >= 8 &&
      (allowedTopics.size === 0 || aiResult.data.questions.slice(0, 8).every((item) => allowedTopics.has(item.topic.toLowerCase())))
    ) {
      const normalized = aiResult.data.questions.slice(0, 8).map(normalizeQuestion);
      return NextResponse.json<GenerateAssessmentBatchResponse>({
        questions: normalized,
        source: aiResult.source,
        message: `Diagnostic assessment of 8 questions generated via ${aiResult.source.toUpperCase()} (${aiResult.model}).`,
        model: aiResult.model,
        latencyMs: aiResult.latencyMs,
      });
    }

    // Baseline fallback
    return NextResponse.json<GenerateAssessmentBatchResponse>({
      questions: baselineQuestions,
      source: "baseline",
      message: "Deterministic baseline diagnostic questions active.",
      model: aiResult.model,
      latencyMs: aiResult.latencyMs,
    });
  } catch (err) {
    if (err instanceof RequestBodyError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    sanitizeErrorMessage(err);
    return NextResponse.json<GenerateAssessmentBatchResponse>({
      questions: CANONICAL_QUESTIONS,
      source: "baseline",
      message: "Deterministic baseline diagnostic questions active.",
      error: "Assessment generation failed. Deterministic questions are available.",
    });
  }
}
