import type {
  AssessmentHistoryEntry,
  GamificationState,
  LearningEvidence,
  NoteLearningItem,
  PersistedLearningState,
} from "@/types/learning";
import type { CourseModel, CourseTopic, TopicDifficulty, TopicImportance } from "@/types/course";
import type { PlanTask, PlanTaskKind } from "@/types/plan";
import type { AISource } from "@/lib/ai/types";

export const LEARNING_STORAGE_KEY = "learnos_learning_state";
const MAX_STORED_CHARS = 1_500_000;
const MAX_TOPICS = 64;
const MAX_EVIDENCE = 2_000;
const MAX_NOTES = 40;

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export type LoadStateResult = {
  state: PersistedLearningState;
  status: "missing" | "loaded" | "migrated" | "invalid" | "unavailable";
};

const SOURCE_VALUES: AISource[] = ["baseline", "gemini", "groq", "cerebras"];
const DIFFICULTIES: TopicDifficulty[] = ["Foundational", "Intermediate", "Advanced"];
const IMPORTANCE: TopicImportance[] = ["High", "Medium", "Low"];
const TASK_KINDS: PlanTaskKind[] = ["Warm up", "Focus topic", "Apply", "Reinforce", "Advanced"];
const EVIDENCE_KINDS = ["assessment", "tutor-practice", "note2learn-quiz"] as const;

function record(value: unknown): Record<string, unknown> | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function cleanText(value: unknown, limit: number, fallback = ""): string {
  if (typeof value !== "string") return fallback;
  return value.trim().slice(0, limit);
}

function boundedNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function normalizeScoreMap(value: unknown, fallback: Record<string, number>, topics: readonly string[]): Record<string, number> {
  const source = record(value);
  const scores: Record<string, number> = {};
  const canonicalNames = new Map(topics.map((topic) => [topic.toLowerCase(), topic]));
  topics.forEach((topic) => {
    scores[topic] = typeof fallback[topic] === "number" ? fallback[topic] : 60;
  });
  if (!source) return scores;
  Object.entries(source).slice(0, MAX_TOPICS).forEach(([rawTopic, score]) => {
    const key = canonicalNames.get(cleanText(rawTopic, 120).toLowerCase());
    if (key && typeof score === "number" && Number.isFinite(score)) {
      scores[key] = Math.min(100, Math.max(0, Math.round(score)));
    }
  });
  return scores;
}

function normalizeCourseModel(value: unknown, fallback: CourseModel): CourseModel {
  const source = record(value);
  if (!source || !Array.isArray(source.topics)) return fallback;

  const topics: CourseTopic[] = source.topics.slice(0, MAX_TOPICS).flatMap((item, index) => {
    const topic = record(item);
    const name = cleanText(topic?.name, 120);
    if (!topic || !name) return [];
    const subtopics = Array.isArray(topic.subtopics)
      ? topic.subtopics.slice(0, 20).map((value) => cleanText(value, 120)).filter(Boolean)
      : [];
    const prerequisites = Array.isArray(topic.prerequisites)
      ? topic.prerequisites.slice(0, 20).map((value) => cleanText(value, 120)).filter(Boolean)
      : [];
    return [{
      name,
      subtopics,
      difficulty: DIFFICULTIES.includes(topic.difficulty as TopicDifficulty)
        ? (topic.difficulty as TopicDifficulty)
        : "Intermediate",
      prerequisites,
      importance: IMPORTANCE.includes(topic.importance as TopicImportance)
        ? (topic.importance as TopicImportance)
        : "Medium",
      studyOrder: boundedNumber(topic.studyOrder, 1, MAX_TOPICS, index + 1),
      frequency: boundedNumber(topic.frequency, 1, 10, 5),
    }];
  });
  const courseName = cleanText(source.courseName, 160, fallback.courseName);
  if (topics.length === 0) {
    if (source.topics.length === 0 && courseName !== fallback.courseName) {
      return {
        courseName,
        description: cleanText(source.description, 1_000, fallback.description || ""),
        topics: [],
        totalTopics: 0,
        totalSubtopics: 0,
        highPriorityCount: 0,
      };
    }
    return fallback;
  }

  return {
    courseName,
    description: cleanText(source.description, 1_000, fallback.description || ""),
    topics,
    totalTopics: topics.length,
    totalSubtopics: topics.reduce((sum, topic) => sum + topic.subtopics.length, 0),
    highPriorityCount: topics.filter((topic) => topic.importance === "High").length,
  };
}

function normalizePlanTasks(value: unknown, fallback: PlanTask[]): PlanTask[] {
  if (!Array.isArray(value)) return fallback;
  const tasks = value.slice(0, 12).flatMap((item, index) => {
    const task = record(item);
    const id = cleanText(task?.id, 100);
    const title = cleanText(task?.title, 180);
    const detail = cleanText(task?.detail, 600);
    if (!task || !id || !title || !detail) return [];
    return [{
      id,
      title,
      detail,
      duration: cleanText(task.duration, 40, "10 min"),
      kind: TASK_KINDS.includes(task.kind as PlanTaskKind) ? task.kind as PlanTaskKind : TASK_KINDS[index % TASK_KINDS.length],
      // Prior demo checkboxes were not tied to a verified learning attempt.
      done: false,
    }];
  });
  return tasks.length ? tasks : fallback;
}

function normalizeEvidence(value: unknown, topics: readonly string[]): LearningEvidence[] {
  if (!Array.isArray(value)) return [];
  const canonicalNames = new Map(topics.map((topic) => [topic.toLowerCase(), topic]));
  return value.slice(-MAX_EVIDENCE).flatMap((item) => {
    const evidence = record(item);
    const eventId = cleanText(evidence?.eventId, 180);
    const activityId = cleanText(evidence?.activityId, 180);
    const topicInput = cleanText(evidence?.topic, 120);
    const topic = canonicalNames.get(topicInput.toLowerCase()) || "";
    const questionId = cleanText(evidence?.questionId, 180);
    if (
      !evidence || !eventId || !activityId || !topic || !questionId ||
      !EVIDENCE_KINDS.includes(evidence.kind as typeof EVIDENCE_KINDS[number]) ||
      typeof evidence.selectedOption !== "number" || !Number.isInteger(evidence.selectedOption) ||
      evidence.selectedOption < 0 || evidence.selectedOption > 3 ||
      typeof evidence.correct !== "boolean"
    ) return [];
    return [{
      eventId,
      activityId,
      kind: evidence.kind as LearningEvidence["kind"],
      questionId,
      topic,
      selectedOption: evidence.selectedOption,
      correct: evidence.correct,
      recordedAt: cleanText(evidence.recordedAt, 40, new Date(0).toISOString()),
    }];
  });
}

function normalizeHistory(value: unknown): AssessmentHistoryEntry[] {
  if (!Array.isArray(value)) return [];
  return value.slice(-100).flatMap((item) => {
    const entry = record(item);
    const id = cleanText(entry?.id, 180);
    if (!entry || !id) return [];
    return [{
      id,
      completedAt: cleanText(entry.completedAt, 40, new Date(0).toISOString()),
      questionCount: boundedNumber(entry.questionCount, 0, 100, 0),
      attemptedCount: boundedNumber(entry.attemptedCount, 0, 100, 0),
      correctCount: boundedNumber(entry.correctCount, 0, 100, 0),
    }];
  });
}

function normalizeNoteItems(value: unknown): NoteLearningItem[] {
  if (!Array.isArray(value)) return [];
  return value.slice(-MAX_NOTES).flatMap((item) => {
    const note = record(item);
    const id = cleanText(note?.id, 180);
    const sourceName = cleanText(note?.sourceName, 180);
    const topic = cleanText(note?.topic, 160);
    const summary = cleanText(note?.summary, 8_000);
    if (!note || !id || !sourceName || !topic || !summary || !Array.isArray(note.flashcards) || !Array.isArray(note.quiz)) return [];
    const flashcards = note.flashcards.slice(0, 20).flatMap((rawCard) => {
      const card = record(rawCard);
      const front = cleanText(card?.front, 500);
      const back = cleanText(card?.back, 1_000);
      const cardId = cleanText(card?.id, 180);
      return card && front && back && cardId ? [{ id: cardId, front, back, mastered: card.mastered === true }] : [];
    });
    const quiz = note.quiz.slice(0, 10).flatMap((rawQuestion) => {
      const question = record(rawQuestion);
      const prompt = cleanText(question?.prompt, 800);
      const questionId = cleanText(question?.id, 180);
      const options = Array.isArray(question?.options)
        ? question.options.slice(0, 4).map((option) => cleanText(option, 400))
        : [];
      if (!question || !questionId || !prompt || options.length !== 4 || options.some((option) => !option)) return [];
      return [{
        id: questionId,
        prompt,
        options,
        correctOption: boundedNumber(question.correctOption, 0, 3, 0),
        explanation: cleanText(question.explanation, 1_000, "Review the source note for the key idea."),
      }];
    });
    const source = SOURCE_VALUES.includes(note.source as AISource) ? note.source as AISource : "baseline";
    const answersRecord = record(note.answers) || {};
    const answers: Record<string, number> = {};
    Object.entries(answersRecord).slice(0, 10).forEach(([key, value]) => {
      if (/^\d+$/.test(key) && typeof value === "number" && Number.isInteger(value) && value >= 0 && value < 4) answers[key] = value;
    });
    return flashcards.length && quiz.length ? [{
      id,
      sourceName,
      topic,
      summary,
      flashcards,
      quiz,
      source,
      createdAt: cleanText(note.createdAt, 40, new Date(0).toISOString()),
      answers,
      completedAt: cleanText(note.completedAt, 40) || undefined,
      quizScore: typeof note.quizScore === "number" ? boundedNumber(note.quizScore, 0, quiz.length, 0) : undefined,
    }] : [];
  });
}

function normalizeGamification(value: unknown, fallback: GamificationState): GamificationState {
  const state = record(value);
  if (!state) return fallback;
  const uniqueStrings = (input: unknown, max: number, maxLength = 180) => Array.isArray(input)
    ? [...new Set(input.map((value) => cleanText(value, maxLength)).filter(Boolean))].slice(-max)
    : [];
  const lastActivityDate = cleanText(state.lastActivityDate, 10);
  return {
    xp: boundedNumber(state.xp, 0, 1_000_000, fallback.xp),
    currentStreak: boundedNumber(state.currentStreak, 0, 10_000, fallback.currentStreak),
    bestStreak: boundedNumber(state.bestStreak, 0, 10_000, fallback.bestStreak),
    lastActivityDate: /^\d{4}-\d{2}-\d{2}$/.test(lastActivityDate) ? lastActivityDate : null,
    activityDates: uniqueStrings(state.activityDates, 400, 10).filter((date) => /^\d{4}-\d{2}-\d{2}$/.test(date)),
    rewardedEventIds: uniqueStrings(state.rewardedEventIds, 2_000),
    badges: uniqueStrings(state.badges, 100, 100),
  };
}

function normalizeVersionOne(value: Record<string, unknown>, fallback: PersistedLearningState): PersistedLearningState {
  const courseModel = normalizeCourseModel(value.courseModel, fallback.courseModel);
  const topicNames = courseModel.topics.map((topic) => topic.name);
  const scores = normalizeScoreMap(value.knowledgeScores, fallback.knowledgeScores, topicNames);
  const masteryBaseline = normalizeScoreMap(value.masteryBaseline, fallback.masteryBaseline, topicNames);
  const source = (key: string, defaultValue: AISource) => SOURCE_VALUES.includes(value[key] as AISource)
    ? value[key] as AISource
    : defaultValue;
  return {
    version: 1,
    courseModel,
    learningGoal: cleanText(value.learningGoal, 500, fallback.learningGoal),
    analysisSource: source("analysisSource", fallback.analysisSource),
    assessmentSource: source("assessmentSource", fallback.assessmentSource),
    tutorSource: source("tutorSource", fallback.tutorSource),
    planSource: source("planSource", fallback.planSource),
    knowledgeScores: scores,
    masteryBaseline,
    evidence: normalizeEvidence(value.evidence, topicNames),
    assessmentHistory: normalizeHistory(value.assessmentHistory),
    syllabusAnalyzed: typeof value.syllabusAnalyzed === "boolean" ? value.syllabusAnalyzed : fallback.syllabusAnalyzed,
    uploadedMaterialsCount: boundedNumber(value.uploadedMaterialsCount, 0, 100, fallback.uploadedMaterialsCount),
    assessmentCompleted: value.assessmentCompleted === true,
    tutorPracticeCompleted: value.tutorPracticeCompleted === true,
    lessonCompletedTopics: Array.isArray(value.lessonCompletedTopics)
      ? [...new Set(value.lessonCompletedTopics.map((topic) => cleanText(topic, 120)).filter(Boolean))].slice(0, MAX_TOPICS)
      : [],
    planAdapted: value.planAdapted === true,
    planTasks: normalizePlanTasks(value.planTasks, fallback.planTasks),
    isSampleData: typeof value.isSampleData === "boolean" ? value.isSampleData : fallback.isSampleData,
    noteItems: normalizeNoteItems(value.noteItems),
    gamification: normalizeGamification(value.gamification, fallback.gamification),
  };
}

export function normalizePersistedLearningState(
  value: unknown,
  fallback: PersistedLearningState,
): { state: PersistedLearningState; migrated: boolean } | null {
  const input = record(value);
  if (!input) return null;
  if (input.version === 1) return { state: normalizeVersionOne(input, fallback), migrated: false };

  // Version 0 is the pre-feature demo snapshot shape. Preserve recognized progress fields.
  if (input.version === 0) {
    return {
      state: normalizeVersionOne({
        ...fallback,
        ...input,
        version: 1,
        masteryBaseline: input.knowledgeScores ?? fallback.masteryBaseline,
        evidence: [],
        assessmentHistory: [],
        lessonCompletedTopics: [],
        isSampleData: true,
        noteItems: [],
        gamification: fallback.gamification,
      }, fallback),
      migrated: true,
    };
  }
  return null;
}

export function loadLearningState(
  storage: StorageLike,
  fallback: PersistedLearningState,
): LoadStateResult {
  try {
    const raw = storage.getItem(LEARNING_STORAGE_KEY);
    if (raw === null) return { state: fallback, status: "missing" };
    if (raw.length > MAX_STORED_CHARS) return { state: fallback, status: "invalid" };
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { state: fallback, status: "invalid" };
    }
    const normalized = normalizePersistedLearningState(parsed, fallback);
    if (!normalized) return { state: fallback, status: "invalid" };
    return { state: normalized.state, status: normalized.migrated ? "migrated" : "loaded" };
  } catch {
    return { state: fallback, status: "unavailable" };
  }
}

export function saveLearningState(storage: StorageLike, state: PersistedLearningState): boolean {
  try {
    const serialized = JSON.stringify(state);
    if (serialized.length > MAX_STORED_CHARS) return false;
    storage.setItem(LEARNING_STORAGE_KEY, serialized);
    return true;
  } catch {
    return false;
  }
}

export function clearLearningState(storage: StorageLike): boolean {
  try {
    storage.removeItem(LEARNING_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}
