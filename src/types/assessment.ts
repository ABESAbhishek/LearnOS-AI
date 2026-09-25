import type { TopicDifficulty } from "@/types/course";
import { BASELINE_ASSESSMENT_QUESTIONS } from "@/lib/assessment-bank";

/**
 * Canonical Question model for diagnostic assessments.
 */
export interface Question {
  id?: string;
  topic: string;
  subtopic?: string;
  conceptTested?: string;
  difficulty: string;
  prompt: string;
  options: string[];
  correctOption: number;
  explanation?: string;
  misconception?: string;
  estimatedSkillLevel?: number;
}

export type AssessmentQuestion = Question;

export const CANONICAL_QUESTIONS: Question[] = BASELINE_ASSESSMENT_QUESTIONS;

export interface AssessmentEvidence {
  questionId: string;
  topic: string;
  subtopic: string;
  difficulty: TopicDifficulty;
  selectedOption: number;
  correct: boolean;
  timeSpentSeconds?: number;
}

export interface GenerateAssessmentBatchRequest {
  courseName?: string;
  topics?: Array<{
    name: string;
    subtopics?: string[];
    difficulty?: string;
  }>;
  useSample?: boolean;
}

export interface GenerateAssessmentBatchResponse {
  questions: Question[];
  source: "gemini" | "baseline";
  message: string;
  model?: string;
  latencyMs?: number;
  error?: string;
}

export interface GenerateQuestionRequest {
  courseName?: string;
  targetTopic?: string;
  targetSubtopic?: string;
  targetDifficulty?: TopicDifficulty;
  currentMastery?: number;
  previousEvidence?: AssessmentEvidence[];
  useSample?: boolean;
  topics?: Array<{
    name: string;
    subtopics?: string[];
    difficulty?: string;
  }>;
}

export interface GenerateQuestionResponse {
  question?: Question;
  questions?: Question[];
  source: "gemini" | "baseline";
  message: string;
  model?: string;
  latencyMs?: number;
  error?: string;
}

/**
 * Validates that an unknown object conforms strictly to the Question model:
 * - non-empty topic, difficulty, prompt
 * - exactly 4 non-empty string options
 * - integer correctOption between 0 and 3
 */
export function validateQuestion(data: unknown): data is Question {
  if (!data || typeof data !== "object") return false;
  const q = data as Record<string, unknown>;

  if (typeof q.topic !== "string" || q.topic.trim().length === 0) return false;
  if (typeof q.difficulty !== "string" || q.difficulty.trim().length === 0) return false;
  if (typeof q.prompt !== "string" || q.prompt.trim().length === 0) return false;

  if (!Array.isArray(q.options) || q.options.length !== 4) return false;
  for (const opt of q.options) {
    if (typeof opt !== "string" || opt.trim().length === 0) return false;
  }

  if (
    typeof q.correctOption !== "number" ||
    !Number.isInteger(q.correctOption) ||
    q.correctOption < 0 ||
    q.correctOption > 3
  ) {
    return false;
  }

  return true;
}

/**
 * Validates a batch assessment object containing an array of at least 8 valid questions.
 */
export function validateBatchQuestions(data: unknown): data is { questions: Question[] } {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  if (!Array.isArray(d.questions) || d.questions.length < 8) return false;

  for (let i = 0; i < 8; i++) {
    if (!validateQuestion(d.questions[i])) {
      return false;
    }
  }

  return true;
}

/**
 * Normalizes a Question to ensure all fields are safely present and sanitized.
 */
export function normalizeQuestion(raw: Question, index: number): Question {
  const options = Array.isArray(raw.options) && raw.options.length === 4
    ? raw.options.map((opt) => String(opt).trim())
    : ["Option A", "Option B", "Option C", "Option D"];

  let correctOption = 0;
  if (
    typeof raw.correctOption === "number" &&
    Number.isInteger(raw.correctOption) &&
    raw.correctOption >= 0 &&
    raw.correctOption < options.length
  ) {
    correctOption = raw.correctOption;
  }

  return {
    id: raw.id?.trim() || `q-${index + 1}`,
    topic: raw.topic.trim(),
    subtopic: raw.subtopic?.trim() || "Core Concepts",
    conceptTested: raw.conceptTested?.trim() || `Understanding of ${raw.topic.trim()}`,
    difficulty: raw.difficulty.trim() || "Foundational",
    prompt: raw.prompt.trim(),
    options,
    correctOption,
    explanation: raw.explanation?.trim() || `Diagnostic check for ${raw.topic.trim()}.`,
    misconception: raw.misconception?.trim(),
    estimatedSkillLevel: typeof raw.estimatedSkillLevel === "number" ? raw.estimatedSkillLevel : 50,
  };
}

/**
 * Backward compatibility: Validates that an unknown object conforms to AssessmentQuestion.
 */
export function validateAssessmentQuestion(data: unknown): data is AssessmentQuestion {
  return validateQuestion(data);
}

/**
 * Backward compatibility: Normalizes raw structured data into a guaranteed valid AssessmentQuestion.
 */
export function normalizeAssessmentQuestion(raw: unknown, fallback: AssessmentQuestion): AssessmentQuestion {
  if (!raw || typeof raw !== "object") return fallback;
  const r = raw as Record<string, unknown>;

  const id = typeof r.id === "string" && r.id.trim().length > 0 ? r.id.trim() : (fallback.id || "q-1");
  const topic = typeof r.topic === "string" && r.topic.trim().length > 0 ? r.topic.trim() : fallback.topic;
  const subtopic = typeof r.subtopic === "string" && r.subtopic.trim().length > 0 ? r.subtopic.trim() : (fallback.subtopic || "Core Concepts");
  const conceptTested = typeof r.conceptTested === "string" && r.conceptTested.trim().length > 0 ? r.conceptTested.trim() : (fallback.conceptTested || `Test ${topic}`);

  const difficulty = typeof r.difficulty === "string" && r.difficulty.trim().length > 0 ? r.difficulty.trim() : fallback.difficulty;
  const prompt = typeof r.prompt === "string" && r.prompt.trim().length > 0 ? r.prompt.trim() : fallback.prompt;

  let options: string[] = fallback.options;
  if (Array.isArray(r.options) && r.options.length === 4) {
    const validOpts = r.options.filter((o: unknown) => typeof o === "string" && o.trim().length > 0) as string[];
    if (validOpts.length === 4) {
      options = validOpts;
    }
  }

  let correctOption = fallback.correctOption;
  if (typeof r.correctOption === "number" && r.correctOption >= 0 && r.correctOption < options.length) {
    correctOption = Math.floor(r.correctOption);
  }

  const explanation = typeof r.explanation === "string" && r.explanation.trim().length > 0 ? r.explanation.trim() : (fallback.explanation || "Diagnostic explanation");
  const misconception = typeof r.misconception === "string" ? r.misconception.trim() : undefined;
  const estimatedSkillLevel = typeof r.estimatedSkillLevel === "number" ? r.estimatedSkillLevel : undefined;

  return {
    id,
    topic,
    subtopic,
    conceptTested,
    difficulty,
    prompt,
    options,
    correctOption,
    explanation,
    misconception,
    estimatedSkillLevel,
  };
}
