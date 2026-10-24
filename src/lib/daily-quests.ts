import type { AssessmentHistoryEntry, GamificationState, LearningEvidence, NoteLearningItem } from "../types/learning";

export type DailyQuestId = "practice-three" | "diagnostic" | "note-review";

export interface DailyQuestProgress {
  id: DailyQuestId;
  title: string;
  detail: string;
  href: string;
  progress: number;
  target: number;
  complete: boolean;
  claimed: boolean;
  rewardXP: number;
}

function occurredOn(value: string | undefined, date: string): boolean {
  if (!value) return false;
  const parsed = new Date(value);
  return Number.isFinite(parsed.getTime()) && localDateKey(parsed) === date;
}

function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function getDailyQuests(input: {
  evidence: readonly LearningEvidence[];
  assessmentHistory: readonly AssessmentHistoryEntry[];
  noteItems: readonly NoteLearningItem[];
  gamification: GamificationState;
}, date = localDateKey()): DailyQuestProgress[] {
  const dailyEvidence = new Set(input.evidence.filter((item) => occurredOn(item.recordedAt, date)).map((item) => item.eventId));
  const diagnosticDone = input.assessmentHistory.some((item) => occurredOn(item.completedAt, date));
  const noteReviewDone = input.noteItems.some((item) => Boolean(item.completedAt) && occurredOn(item.completedAt, date));
  const definitions = [
    { id: "practice-three" as const, title: "Answer three learning questions", detail: "Practice or assess a topic to build today's evidence.", href: "/assessment", progress: Math.min(3, dailyEvidence.size), target: 3 },
    { id: "diagnostic" as const, title: "Complete a diagnostic", detail: "Finish an assessment attempt and review your feedback.", href: "/assessment", progress: diagnosticDone ? 1 : 0, target: 1 },
    { id: "note-review" as const, title: "Review a Note2Learn quiz", detail: "Complete a saved note quiz to reinforce a concept.", href: "/note2learn", progress: noteReviewDone ? 1 : 0, target: 1 },
  ];

  return definitions.map((quest) => {
    const rewardId = `daily-quest:${date}:${quest.id}`;
    const complete = quest.progress >= quest.target;
    return {
      ...quest,
      complete,
      claimed: input.gamification.rewardedEventIds.includes(rewardId),
      rewardXP: 15,
    };
  });
}
