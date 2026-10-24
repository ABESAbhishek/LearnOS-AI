import type { AISource } from "@/lib/ai/types";
import type { CourseModel } from "@/types/course";
import type { PlanTask } from "@/types/plan";

export type EvidenceKind = "assessment" | "tutor-practice" | "note2learn-quiz";

export interface LearningEvidence {
  /** Stable within an activity; submitting the same answer again replaces this event. */
  eventId: string;
  activityId: string;
  kind: EvidenceKind;
  questionId: string;
  topic: string;
  selectedOption: number;
  correct: boolean;
  recordedAt: string;
}

export interface AssessmentHistoryEntry {
  id: string;
  completedAt: string;
  questionCount: number;
  attemptedCount: number;
  correctCount: number;
}

export interface NoteFlashcard {
  id: string;
  front: string;
  back: string;
  mastered: boolean;
}

export interface NoteQuizQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctOption: number;
  explanation: string;
}

export interface NoteLearningItem {
  id: string;
  sourceName: string;
  topic: string;
  summary: string;
  flashcards: NoteFlashcard[];
  quiz: NoteQuizQuestion[];
  source: AISource;
  createdAt: string;
  answers: Record<string, number>;
  completedAt?: string;
  quizScore?: number;
}

export interface GamificationState {
  xp: number;
  currentStreak: number;
  bestStreak: number;
  lastActivityDate: string | null;
  activityDates: string[];
  rewardedEventIds: string[];
  badges: string[];
}

export interface PersistedLearningState {
  version: 1;
  courseModel: CourseModel;
  learningGoal: string;
  analysisSource: AISource;
  assessmentSource: AISource;
  tutorSource: AISource;
  planSource: AISource;
  knowledgeScores: Record<string, number>;
  masteryBaseline: Record<string, number>;
  evidence: LearningEvidence[];
  assessmentHistory: AssessmentHistoryEntry[];
  syllabusAnalyzed: boolean;
  uploadedMaterialsCount: number;
  assessmentCompleted: boolean;
  tutorPracticeCompleted: boolean;
  lessonCompletedTopics: string[];
  planAdapted: boolean;
  planTasks: PlanTask[];
  isSampleData: boolean;
  noteItems: NoteLearningItem[];
  gamification: GamificationState;
}
