import type { AssessmentQuestion } from "@/types/assessment";

export type BattleState = "invited" | "ready" | "in_progress" | "completed" | "cancelled" | "expired";
export type BattleQuestion = AssessmentQuestion & { id: string };

export interface BattleSession {
  id: string;
  topic: string;
  creatorId: string;
  opponentId: string;
  creatorAcceptedAt: string;
  opponentAcceptedAt: string | null;
  state: BattleState;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  questions: BattleQuestion[];
  answers: Record<string, Record<string, { selectedOption: number; submittedAt: string }>>;
}

export interface BattleResult {
  battleId: string;
  topic: string;
  scores: Array<{ userId: string; correctCount: number; questionCount: number }>;
  review: Array<{
    questionId: string;
    topic: string;
    prompt: string;
    options: string[];
    correctOption: number;
    explanation: string;
    answers: Array<{ userId: string; selectedOption: number; correct: boolean }>;
  }>;
}

function validId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0 && value.length <= 120;
}

function validDate(value: unknown): value is string {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

function validateQuestion(value: unknown, topic: string): value is BattleQuestion {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const question = value as Record<string, unknown>;
  if (!validId(question.id) || typeof question.topic !== "string" || question.topic.toLowerCase() !== topic.toLowerCase()) return false;
  if (typeof question.prompt !== "string" || question.prompt.trim().length === 0 || question.prompt.length > 1_000) return false;
  if (typeof question.difficulty !== "string" || question.difficulty.trim().length === 0 || question.difficulty.length > 40) return false;
  if (typeof question.subtopic !== "string" || question.subtopic.trim().length === 0 || question.subtopic.length > 120) return false;
  if (!Array.isArray(question.options) || question.options.length !== 4 ||
    !question.options.every((option) => typeof option === "string" && option.trim().length > 0 && option.length <= 300)) return false;
  if (new Set((question.options as string[]).map((option) => option.trim().toLocaleLowerCase())).size !== 4) return false;
  if (typeof question.correctOption !== "number" || !Number.isInteger(question.correctOption) || question.correctOption < 0 || question.correctOption > 3) return false;
  if (typeof question.explanation !== "string" || question.explanation.trim().length === 0 || question.explanation.length > 1_200) return false;
  return true;
}

export function validateBattleQuestionSet(value: unknown, topic: string): value is BattleQuestion[] {
  if (!Array.isArray(value) || value.length < 5 || value.length > 12 || !validId(topic)) return false;
  if (!value.every((question) => validateQuestion(question, topic.trim()))) return false;
  return new Set(value.map((question) => (question as { id: string }).id)).size === value.length;
}

export function createBattle(input: {
  id: string;
  creatorId: string;
  opponentId: string;
  topic: string;
  createdAt: string;
}): BattleSession | null {
  if (!validId(input.id) || !validId(input.creatorId) || !validId(input.opponentId) || input.creatorId === input.opponentId ||
    !validId(input.topic) || !validDate(input.createdAt)) return null;
  return {
    id: input.id,
    topic: input.topic.trim().slice(0, 120),
    creatorId: input.creatorId,
    opponentId: input.opponentId,
    creatorAcceptedAt: new Date(input.createdAt).toISOString(),
    opponentAcceptedAt: null,
    state: "invited",
    createdAt: new Date(input.createdAt).toISOString(),
    startedAt: null,
    completedAt: null,
    questions: [],
    answers: { [input.creatorId]: {}, [input.opponentId]: {} },
  };
}

export function acceptBattleInvite(session: BattleSession, actorId: string, acceptedAt: string): BattleSession | null {
  if (session.state !== "invited" || actorId !== session.opponentId || !validDate(acceptedAt) ||
    Date.parse(acceptedAt) < Date.parse(session.createdAt)) return null;
  return { ...session, opponentAcceptedAt: new Date(acceptedAt).toISOString(), state: "ready" };
}

export function declineBattleInvite(session: BattleSession, actorId: string): BattleSession | null {
  if (session.state !== "invited" || actorId !== session.opponentId) return null;
  return { ...session, state: "cancelled" };
}

export function startBattle(
  session: BattleSession,
  actorId: string,
  questions: unknown,
  startedAt: string,
): BattleSession | null {
  if (session.state !== "ready" || (actorId !== session.creatorId && actorId !== session.opponentId) ||
    !session.opponentAcceptedAt || !validDate(startedAt) || Date.parse(startedAt) < Date.parse(session.opponentAcceptedAt) ||
    !validateBattleQuestionSet(questions, session.topic)) return null;
  return {
    ...session,
    state: "in_progress",
    startedAt: new Date(startedAt).toISOString(),
    questions: questions.map((question) => ({ ...question, options: [...question.options] })),
    answers: { [session.creatorId]: {}, [session.opponentId]: {} },
  };
}

export function submitBattleAnswer(
  session: BattleSession,
  actorId: string,
  questionId: string,
  selectedOption: number,
  submittedAt: string,
): BattleSession | null {
  if (session.state !== "in_progress" || (actorId !== session.creatorId && actorId !== session.opponentId) || !validDate(submittedAt)) return null;
  const question = session.questions.find((candidate) => candidate.id === questionId);
  if (!question || !Number.isInteger(selectedOption) || selectedOption < 0 || selectedOption >= question.options.length) return null;
  if (!session.startedAt || Date.parse(submittedAt) < Date.parse(session.startedAt)) return null;
  if (session.answers[actorId]?.[questionId]) return null;

  const answers = {
    ...session.answers,
    [actorId]: {
      ...(session.answers[actorId] ?? {}),
      [questionId]: { selectedOption, submittedAt: new Date(submittedAt).toISOString() },
    },
  };
  const allAnswered = [session.creatorId, session.opponentId].every((userId) =>
    session.questions.every((item) => Boolean(answers[userId]?.[item.id])),
  );
  return {
    ...session,
    answers,
    state: allAnswered ? "completed" : "in_progress",
    completedAt: allAnswered ? new Date(submittedAt).toISOString() : null,
  };
}

export function cancelBattle(session: BattleSession, actorId: string): BattleSession | null {
  if (session.state !== "invited" && session.state !== "ready") return null;
  if (actorId !== session.creatorId && actorId !== session.opponentId) return null;
  return { ...session, state: "cancelled" };
}

export function expireBattle(session: BattleSession, now: Date, maxAgeMs = 24 * 60 * 60_000): BattleSession | null {
  if (!["invited", "ready", "in_progress"].includes(session.state) || !Number.isFinite(now.getTime()) ||
    !Number.isFinite(maxAgeMs) || maxAgeMs <= 0) return null;
  const createdAt = Date.parse(session.createdAt);
  if (!Number.isFinite(createdAt) || now.getTime() - createdAt < maxAgeMs) return null;
  return { ...session, state: "expired" };
}

/** Safe pre-submission view; answer keys and explanations stay server-side. */
export function getBattleQuestionForClient(question: BattleQuestion) {
  return {
    id: question.id,
    topic: question.topic,
    subtopic: question.subtopic,
    difficulty: question.difficulty,
    prompt: question.prompt,
    options: [...question.options],
  };
}

export function getBattleResults(session: BattleSession, actorId: string): BattleResult | null {
  if (session.state !== "completed" || (actorId !== session.creatorId && actorId !== session.opponentId)) return null;
  const participants = [session.creatorId, session.opponentId];
  const completeAndValid = session.questions.length >= 5 && session.questions.every((question) =>
    participants.every((userId) => {
      const answer = session.answers[userId]?.[question.id];
      return Boolean(answer && Number.isInteger(answer.selectedOption) && answer.selectedOption >= 0 && answer.selectedOption < question.options.length);
    }),
  );
  if (!completeAndValid) return null;
  const scores = participants.map((userId) => ({
    userId,
    questionCount: session.questions.length,
    correctCount: session.questions.filter((question) => session.answers[userId]?.[question.id]?.selectedOption === question.correctOption).length,
  }));
  return {
    battleId: session.id,
    topic: session.topic,
    scores,
    review: session.questions.map((question) => ({
      questionId: question.id,
      topic: question.topic,
      prompt: question.prompt,
      options: [...question.options],
      correctOption: question.correctOption,
      explanation: question.explanation || "",
      answers: participants.map((userId) => ({
        userId,
        selectedOption: session.answers[userId][question.id].selectedOption,
        correct: session.answers[userId][question.id].selectedOption === question.correctOption,
      })),
    })),
  };
}

export function createBattleRematch(session: BattleSession, newId: string, createdAt: string): BattleSession | null {
  if (session.state !== "completed") return null;
  return createBattle({
    id: newId,
    creatorId: session.creatorId,
    opponentId: session.opponentId,
    topic: session.topic,
    createdAt,
  });
}
