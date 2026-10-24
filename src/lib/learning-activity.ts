import type { AssessmentHistoryEntry, LearningEvidence, NoteLearningItem } from "../types/learning";

export interface LearningActivity {
  id: string;
  title: string;
  detail: string;
  date: string;
  result?: "positive" | "review";
}

export function getLearningActivity(input: {
  evidence: readonly LearningEvidence[];
  assessmentHistory: readonly AssessmentHistoryEntry[];
  noteItems: readonly NoteLearningItem[];
}): LearningActivity[] {
  const activity: LearningActivity[] = [
    ...input.evidence.map((item) => ({
      id: `answer:${item.eventId}`,
      title: item.correct ? "Practice answer correct" : "Practice answer reviewed",
      detail: item.topic,
      date: item.recordedAt,
      result: item.correct ? "positive" as const : "review" as const,
    })),
    ...input.assessmentHistory.map((item) => ({
      id: `assessment:${item.id}`,
      title: "Diagnostic completed",
      detail: `${item.correctCount} of ${item.attemptedCount} answers correct`,
      date: item.completedAt,
    })),
    ...input.noteItems.filter((item) => item.completedAt).map((item) => ({
      id: `note:${item.id}`,
      title: "Note2Learn quiz completed",
      detail: `${item.topic} · ${item.quizScore ?? 0} of ${item.quiz.length} correct`,
      date: item.completedAt!,
    })),
  ];
  return activity
    .filter((item) => Number.isFinite(new Date(item.date).getTime()))
    .sort((left, right) => right.date.localeCompare(left.date))
    .slice(0, 40);
}
