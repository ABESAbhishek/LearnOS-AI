import type { LearningEvidence } from "@/types/learning";

export const MAX_ACTIVITY_MASTERY_CHANGE = 8;
export const MIN_MASTERY = 5;
export const MAX_MASTERY = 98;

export function isValidAnswerSelection(
  topic: unknown,
  selectedOption: unknown,
  optionCount: number,
  allowedTopics: readonly string[],
): topic is string {
  return typeof topic === "string" &&
    topic.trim().length > 0 &&
    topic.length <= 120 &&
    allowedTopics.some((allowed) => allowed.toLowerCase() === topic.trim().toLowerCase()) &&
    typeof selectedOption === "number" &&
    Number.isInteger(selectedOption) &&
    selectedOption >= 0 &&
    selectedOption < optionCount;
}

export function upsertLearningEvidence(
  previous: readonly LearningEvidence[],
  next: LearningEvidence,
): LearningEvidence[] {
  if (!next.eventId || !next.activityId || !next.topic || !next.questionId) return [...previous];
  return [...previous.filter((entry) => entry.eventId !== next.eventId), next].slice(-2_000);
}

/**
 * Provisional evidence estimate. Each activity uses a Bayesian-style prior weight
 * of 20 observations and is capped at an 8 point change, so one answer is a small
 * signal and a whole assessment is still bounded. Recomputing from the baseline
 * makes replacing an answer idempotent.
 */
export function estimateMasteryFromEvidence(
  baseline: Record<string, number>,
  evidence: readonly LearningEvidence[],
): Record<string, number> {
  const scores: Record<string, number> = {};
  Object.entries(baseline).forEach(([topic, value]) => {
    if (Number.isFinite(value)) scores[topic] = clamp(value, MIN_MASTERY, MAX_MASTERY);
  });

  const grouped = new Map<string, LearningEvidence[]>();
  for (const item of evidence) {
    const topicKey = item.topic.trim();
    if (!topicKey || !Number.isInteger(item.selectedOption) || item.selectedOption < 0 || item.selectedOption > 3) continue;
    const groupKey = `${topicKey.toLowerCase()}\u0000${item.activityId}`;
    const group = grouped.get(groupKey) ?? [];
    group.push(item);
    grouped.set(groupKey, group);
  }

  const activities = [...grouped.values()].sort((a, b) => {
    const firstA = a.map((item) => item.recordedAt).sort()[0] || "";
    const firstB = b.map((item) => item.recordedAt).sort()[0] || "";
    return firstA.localeCompare(firstB);
  });

  for (const activity of activities) {
    const topic = activity[0].topic.trim();
    const current = scores[topic] ?? 60;
    const accuracy = activity.filter((item) => item.correct).length / activity.length;
    const confidence = activity.length / (activity.length + 20);
    const estimate = accuracy * 100;
    const rawChange = (estimate - current) * confidence;
    const maxChange = MAX_ACTIVITY_MASTERY_CHANGE;
    const next = clamp(current + clamp(rawChange, -maxChange, maxChange), MIN_MASTERY, MAX_MASTERY);
    scores[topic] = Math.round(next);
  }

  return scores;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
