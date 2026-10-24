const DIFFICULTIES = new Set(["Foundational", "Beginner", "Intermediate", "Advanced"]);

export function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function isBoundedString(value: unknown, maxLength: number, allowEmpty = false): value is string {
  return typeof value === "string" && value.trim().length <= maxLength && (allowEmpty || value.trim().length > 0);
}

export interface ValidatedTopicInput {
  name: string;
  subtopics?: string[];
  difficulty?: string;
}

export function validateTopicInputs(value: unknown, maxTopics = 64): value is ValidatedTopicInput[] {
  if (!Array.isArray(value) || value.length > maxTopics) return false;
  return value.every((item) => {
    if (!isPlainRecord(item) || !isBoundedString(item.name, 120)) return false;
    if (item.subtopics !== undefined && (!Array.isArray(item.subtopics) || item.subtopics.length > 20 || !item.subtopics.every((subtopic) => isBoundedString(subtopic, 120)))) return false;
    if (item.difficulty !== undefined && (typeof item.difficulty !== "string" || !DIFFICULTIES.has(item.difficulty))) return false;
    return true;
  });
}

export function validateScoreMap(value: unknown, topics: readonly string[] = []): value is Record<string, number> {
  if (!isPlainRecord(value) || Object.keys(value).length > 64) return false;
  return Object.entries(value).every(([topic, score]) =>
    topic.trim().length > 0 && topic.length <= 120 &&
    (topics.length === 0 || topics.some((allowed) => allowed.toLowerCase() === topic.toLowerCase())) &&
    typeof score === "number" && Number.isFinite(score) && score >= 0 && score <= 100
  );
}

export function validateTutorExplainInput(value: unknown): value is Record<string, unknown> {
  if (!isPlainRecord(value)) return false;
  if (value.topic !== undefined && !isBoundedString(value.topic, 120)) return false;
  if (value.mastery !== undefined && (typeof value.mastery !== "number" || !Number.isFinite(value.mastery) || value.mastery < 0 || value.mastery > 100)) return false;
  if (value.weakAreas !== undefined && (!Array.isArray(value.weakAreas) || value.weakAreas.length > 20 || !value.weakAreas.every((area) => isBoundedString(area, 120)))) return false;
  if (value.question !== undefined && !isBoundedString(value.question, 500)) return false;
  if (value.stage !== undefined && (typeof value.stage !== "number" || !Number.isInteger(value.stage) || value.stage < 0 || value.stage > 2)) return false;
  return value.useSample === undefined || typeof value.useSample === "boolean";
}

export function validateAdaptPlanInput(value: unknown): value is Record<string, unknown> {
  if (!isPlainRecord(value)) return false;
  if (value.topics !== undefined && (!Array.isArray(value.topics) || value.topics.length > 64 || !value.topics.every((topic) => isBoundedString(topic, 120)))) return false;
  if (value.weakTopics !== undefined && (!Array.isArray(value.weakTopics) || value.weakTopics.length > 20 || !value.weakTopics.every((topic) => isBoundedString(topic, 120)))) return false;
  if (value.currentFocus !== undefined && !isBoundedString(value.currentFocus, 500)) return false;
  const topics = Array.isArray(value.topics) ? value.topics as string[] : [];
  if (value.knowledgeScores !== undefined && !validateScoreMap(value.knowledgeScores, topics)) return false;
  if (topics.length > 0 && Array.isArray(value.weakTopics) && !value.weakTopics.every((topic) => topics.some((allowed) => allowed.toLowerCase() === String(topic).toLowerCase()))) return false;
  const tutorProgress = isPlainRecord(value.tutorProgress) ? value.tutorProgress : null;
  const tutorTopic = tutorProgress && typeof tutorProgress.topic === "string" ? tutorProgress.topic : null;
  if (value.tutorProgress !== undefined) {
    if (!tutorProgress || (tutorProgress.completed !== undefined && typeof tutorProgress.completed !== "boolean")) return false;
    if (tutorProgress.topic !== undefined && !isBoundedString(tutorProgress.topic, 120)) return false;
  }
  if (topics.length > 0 && tutorTopic && !topics.some((allowed) => allowed.toLowerCase() === tutorTopic.toLowerCase())) return false;
  return true;
}
