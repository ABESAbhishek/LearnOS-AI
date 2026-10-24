"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";

import { BASELINE_DSA_COURSE, type CourseModel } from "@/types/course";
import {
  type PlanTask,
  INITIAL_PLAN_TASKS,
  ADAPTED_PLAN_TASKS,
} from "@/types/plan";
import type { AISource } from "@/lib/ai/types";
import type { LearningEvidence, AssessmentHistoryEntry, GamificationState, NoteLearningItem, PersistedLearningState } from "@/types/learning";
import { clearLearningState, loadLearningState, saveLearningState } from "@/lib/learning-persistence";
import { estimateMasteryFromEvidence, upsertLearningEvidence } from "@/lib/mastery-estimation";
import { awardLearningEvent, INITIAL_GAMIFICATION_STATE, localDateKey, weeklyActiveDays } from "@/lib/reward-rules";
import { getDailyQuests, type DailyQuestId } from "@/lib/daily-quests";

export type { PlanTask, AISource };
export const INITIAL_TASKS = INITIAL_PLAN_TASKS;
export const ADAPTED_TASKS = ADAPTED_PLAN_TASKS;

export type TopicMastery = {
  name: string;
  mastery: number;
  level: "Strong" | "Good" | "Developing" | "Needs focus" | "Priority";
  priority?: boolean;
};

export type LearningContextType = {
  // Course & Syllabus Model
  courseModel: CourseModel;
  currentSubject: string;
  analysisSource: AISource;
  analysisStatus: "idle" | "analyzing" | "success" | "error";
  analysisError: string | null;
  learningGoal: string;
  setLearningGoal: (goal: string) => void;
  isSampleData: boolean;
  persistenceReady: boolean;
  persistenceError: boolean;

  // Assessment
  assessmentSource: AISource;
  setAssessmentSource: (source: AISource) => void;

  // Tutor
  tutorSource: AISource;
  setTutorSource: (source: AISource) => void;

  // Knowledge profile
  knowledgeScores: Record<string, number>;
  evidence: LearningEvidence[];
  assessmentHistory: AssessmentHistoryEntry[];
  lessonCompletedTopics: string[];
  topics: TopicMastery[];
  overallMastery: number;
  weakestTopic: string;
  currentPriority: string;
  currentFocus: string[];
  currentGap: string;

  // Flow flags
  syllabusAnalyzed: boolean;
  uploadedMaterialsCount: number;
  assessmentCompleted: boolean;
  tutorPracticeCompleted: boolean;
  planAdapted: boolean;
  setPlanAdapted: (adapted: boolean) => void;

  // Plan
  planSource: AISource;
  setPlanSource: (source: AISource) => void;
  planTasks: PlanTask[];
  setPlanTasks: (tasks: PlanTask[]) => void;
  gamification: GamificationState;
  weeklyLearningDays: number;
  claimDailyQuest: (questId: DailyQuestId) => boolean;
  noteItems: NoteLearningItem[];

  // Action methods
  markSyllabusAnalyzed: (count?: number) => void;
  setCourseAnalysis: (params: {
    courseModel: CourseModel;
    source: AISource;
    materialsCount?: number;
    error?: string;
    learningGoal?: string;
    isSampleData?: boolean;
  }) => void;
  recordLearningEvidence: (evidence: LearningEvidence) => void;
  completeAssessmentAttempt: (entry: AssessmentHistoryEntry) => void;
  completeTutorPractice: (topic?: string) => void;
  markTutorLessonCompleted: (topic: string) => void;
  addNoteItem: (item: NoteLearningItem) => void;
  updateNoteItem: (id: string, update: Partial<NoteLearningItem>) => void;
  completeNoteQuiz: (id: string) => void;
  toggleFlashcardMastery: (noteId: string, flashcardId: string) => void;
  resetEntireDemo: () => void;
};

const INITIAL_SCORES: Record<string, number> = {
  Arrays: 91,
  "Linked Lists": 83,
  Stacks: 76,
  Trees: 58,
  Hashing: 47,
  Graphs: 31,
};

function createInitialScores(course = BASELINE_DSA_COURSE): Record<string, number> {
  const scores: Record<string, number> = {};
  course.topics.forEach((topic, index) => {
    if (INITIAL_SCORES[topic.name] !== undefined) {
      scores[topic.name] = INITIAL_SCORES[topic.name];
    } else if (index === course.topics.length - 1) {
      scores[topic.name] = 34;
    } else if (index === 0) {
      scores[topic.name] = 88;
    } else if (index === 1) {
      scores[topic.name] = 78;
    } else {
      scores[topic.name] = Math.max(45, 75 - index * 7);
    }
  });
  return scores;
}

function createInitialProfile(): PersistedLearningState {
  const scores = createInitialScores();
  return {
    version: 1,
    courseModel: BASELINE_DSA_COURSE,
    learningGoal: "",
    analysisSource: "baseline",
    assessmentSource: "baseline",
    tutorSource: "baseline",
    planSource: "baseline",
    knowledgeScores: scores,
    masteryBaseline: scores,
    evidence: [],
    assessmentHistory: [],
    syllabusAnalyzed: true,
    uploadedMaterialsCount: 3,
    assessmentCompleted: false,
    tutorPracticeCompleted: false,
    lessonCompletedTopics: [],
    planAdapted: false,
    planTasks: INITIAL_PLAN_TASKS,
    isSampleData: true,
    noteItems: [],
    gamification: INITIAL_GAMIFICATION_STATE,
  };
}

function calculateLevel(score: number): TopicMastery["level"] {
  if (score >= 80) return "Strong";
  if (score >= 60) return "Good";
  if (score >= 40) return "Developing";
  return "Priority";
}

function awardCrossedMasteries(
  current: GamificationState,
  previousScores: Record<string, number>,
  nextScores: Record<string, number>,
  courseName: string,
): GamificationState {
  let next = current;
  Object.entries(nextScores).forEach(([topic, score]) => {
    if ((previousScores[topic] ?? 0) < 80 && score >= 80) {
      next = awardLearningEvent(next, {
        id: `mastery:${courseName}:${topic}:80`,
        kind: "masteryMilestone",
        localDate: localDateKey(),
        badge: `${topic} mastery milestone`,
      }).state;
    }
  });
  return next;
}

const LearningContext = createContext<LearningContextType | null>(null);

export function LearningProvider({ children }: { children: ReactNode }) {
  const [courseModel, setCourseModel] = useState<CourseModel>(BASELINE_DSA_COURSE);
  const [learningGoalValue, setLearningGoalValue] = useState("");
  const [analysisSource, setAnalysisSource] = useState<AISource>("baseline");
  const [analysisStatus, setAnalysisStatus] = useState<"idle" | "analyzing" | "success" | "error">("idle");
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [assessmentSource, setAssessmentSource] = useState<AISource>("baseline");
  const [tutorSource, setTutorSource] = useState<AISource>("baseline");

  const [knowledgeScores, setKnowledgeScores] = useState<Record<string, number>>(() => createInitialScores());
  const [masteryBaseline, setMasteryBaseline] = useState<Record<string, number>>(() => createInitialScores());
  const [evidence, setEvidence] = useState<LearningEvidence[]>([]);
  const [assessmentHistory, setAssessmentHistory] = useState<AssessmentHistoryEntry[]>([]);
  const [syllabusAnalyzed, setSyllabusAnalyzed] = useState(true);
  const [uploadedMaterialsCount, setUploadedMaterialsCount] = useState(3);
  const [assessmentCompleted, setAssessmentCompleted] = useState(false);
  const [tutorPracticeCompleted, setTutorPracticeCompleted] = useState(false);
  const [lessonCompletedTopics, setLessonCompletedTopics] = useState<string[]>([]);
  const [planAdapted, setPlanAdapted] = useState(false);
  const [planSource, setPlanSource] = useState<AISource>("baseline");
  const [planTasks, setPlanTasks] = useState<PlanTask[]>(INITIAL_PLAN_TASKS);
  const [isSampleData, setIsSampleData] = useState(true);
  const [noteItems, setNoteItems] = useState<NoteLearningItem[]>([]);
  const [gamification, setGamification] = useState<GamificationState>(INITIAL_GAMIFICATION_STATE);
  const [persistenceReady, setPersistenceReady] = useState(false);
  const [persistenceError, setPersistenceError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = window.setTimeout(() => {
      try {
        const loaded = loadLearningState(window.localStorage, createInitialProfile());
        const saved = loaded.state;
        if (cancelled) return;
        setCourseModel(saved.courseModel);
        setLearningGoalValue(saved.learningGoal);
        setAnalysisSource(saved.analysisSource);
        setAssessmentSource(saved.assessmentSource);
        setTutorSource(saved.tutorSource);
        setPlanSource(saved.planSource);
        setKnowledgeScores(saved.knowledgeScores);
        setMasteryBaseline(saved.masteryBaseline);
        setEvidence(saved.evidence);
        setAssessmentHistory(saved.assessmentHistory);
        setSyllabusAnalyzed(saved.syllabusAnalyzed);
        setUploadedMaterialsCount(saved.uploadedMaterialsCount);
        setAssessmentCompleted(saved.assessmentCompleted);
        setTutorPracticeCompleted(saved.tutorPracticeCompleted);
        setLessonCompletedTopics(saved.lessonCompletedTopics);
        setPlanAdapted(saved.planAdapted);
        setPlanTasks(saved.planTasks);
        setIsSampleData(saved.isSampleData);
        setNoteItems(saved.noteItems);
        setGamification(saved.gamification);
        setPersistenceError(loaded.status === "unavailable" || loaded.status === "invalid");
        setPersistenceReady(true);
      } catch {
        if (cancelled) return;
        setPersistenceError(true);
        setPersistenceReady(true);
      }
    }, 0);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, []);

  useEffect(() => {
    if (!persistenceReady) return;
    const snapshot: PersistedLearningState = {
      version: 1,
      courseModel,
      learningGoal: learningGoalValue,
      analysisSource,
      assessmentSource,
      tutorSource,
      planSource,
      knowledgeScores,
      masteryBaseline,
      evidence,
      assessmentHistory,
      syllabusAnalyzed,
      uploadedMaterialsCount,
      assessmentCompleted,
      tutorPracticeCompleted,
      lessonCompletedTopics,
      planAdapted,
      planTasks,
      isSampleData,
      noteItems,
      gamification,
    };
    let saved = false;
    try {
      saved = saveLearningState(window.localStorage, snapshot);
    } catch {
      saved = false;
    }
    window.setTimeout(() => setPersistenceError(!saved), 0);
  }, [
    persistenceReady,
    courseModel,
    learningGoalValue,
    analysisSource,
    assessmentSource,
    tutorSource,
    planSource,
    knowledgeScores,
    masteryBaseline,
    evidence,
    assessmentHistory,
    syllabusAnalyzed,
    uploadedMaterialsCount,
    assessmentCompleted,
    tutorPracticeCompleted,
    lessonCompletedTopics,
    planAdapted,
    planTasks,
    isSampleData,
    noteItems,
    gamification,
  ]);

  // Dynamically derive active topics from the current courseModel
  const activeTopicNames = useMemo(() => {
    if (Array.isArray(courseModel.topics) && courseModel.topics.length > 0) return courseModel.topics.map((topic) => topic.name);
    return courseModel.courseName === BASELINE_DSA_COURSE.courseName
      ? ["Arrays", "Linked Lists", "Stacks", "Trees", "Hashing", "Graphs"]
      : [];
  }, [courseModel.courseName, courseModel.topics]);

  // Find lowest scoring topic among active topics
  let calculatedWeakTopic = activeTopicNames[activeTopicNames.length - 1] || (courseModel.courseName === BASELINE_DSA_COURSE.courseName ? "Graphs" : "Course overview");
  let minScore = 999;

  activeTopicNames.forEach((t) => {
    const s = knowledgeScores[t];
    if (typeof s === "number" && s < minScore) {
      minScore = s;
      calculatedWeakTopic = t;
    }
  });

  if (minScore === 999) {
    Object.entries(knowledgeScores).forEach(([t, s]) => {
      if (s < minScore) {
        minScore = s;
        calculatedWeakTopic = t;
      }
    });
  }

  // Derived topics with dynamic mastery and priority indicator for primary gap
  const topics: TopicMastery[] = activeTopicNames.map((name, index) => {
    let mastery = knowledgeScores[name];
    if (typeof mastery !== "number") {
      mastery = INITIAL_SCORES[name] ?? Math.max(30, 85 - index * 9);
    }
    return {
      name,
      mastery,
      level: calculateLevel(mastery),
      priority: name === calculatedWeakTopic,
    };
  });

  // Overall mastery calculation
  const values = Object.values(knowledgeScores);
  const overallMastery = Math.round(
    values.reduce((sum, v) => sum + v, 0) / (values.length || 1)
  );

  const weakTopicModel = courseModel.topics.find((t) => t.name === calculatedWeakTopic);
  const weakSubtopics = weakTopicModel?.subtopics || [];

  const currentPriority = `${calculatedWeakTopic} Mastery`;

  const currentFocus =
    weakSubtopics.length > 0
      ? weakSubtopics.slice(0, 3)
      : activeTopicNames.length === 0
      ? []
      : calculatedWeakTopic === "Graphs"
      ? ["BFS", "DFS", "Graph Applications"]
      : calculatedWeakTopic === "Hashing"
      ? ["Collision Resolution", "Open Addressing", "Hash Functions"]
      : calculatedWeakTopic === "Trees"
      ? ["Binary Search Trees", "Tree Traversal", "Inorder Invariants"]
      : [`${calculatedWeakTopic} Concepts`, "Core Principles", "Applied Analysis"];

  const currentGap =
    weakSubtopics.length > 0
      ? `${weakSubtopics.slice(0, 2).join(" & ")} principles and application constraints`
      : activeTopicNames.length === 0
      ? "No topic headings were detected in the uploaded material"
      : calculatedWeakTopic === "Graphs"
      ? "BFS / DFS traversal & shortest-path exploration"
      : calculatedWeakTopic === "Hashing"
      ? "Hash table collision resolution & load balancing"
      : calculatedWeakTopic === "Trees"
      ? "Binary search tree invariants and recursive traversals"
      : `${calculatedWeakTopic} structure and application constraints`;

  const today = localDateKey();
  const weeklyLearningDays = useMemo(() => {
    return weeklyActiveDays(gamification.activityDates, today);
  }, [gamification.activityDates, today]);

  const claimDailyQuest = useCallback((questId: DailyQuestId) => {
    const quest = getDailyQuests({ evidence, assessmentHistory, noteItems, gamification }, today)
      .find((item) => item.id === questId);
    if (!quest?.complete || quest.claimed) return false;
    setGamification((current) => awardLearningEvent(current, {
      id: `daily-quest:${today}:${questId}`,
      kind: "dailyQuest",
      localDate: today,
      badge: "Daily quest complete",
    }).state);
    return true;
  }, [evidence, assessmentHistory, noteItems, gamification, today]);

  const setLearningGoal = useCallback((goal: string) => {
    setLearningGoalValue(goal.trim().slice(0, 500));
  }, []);

  const recordLearningEvidence = useCallback((item: LearningEvidence) => {
    const courseTopic = courseModel.topics.find((topic) => topic.name.trim().toLowerCase() === item.topic?.trim().toLowerCase());
    if (!courseTopic || !item.eventId || item.eventId.length > 180 || !item.activityId || item.activityId.length > 180 ||
      !item.questionId || item.questionId.length > 180 || !Number.isInteger(item.selectedOption) ||
      item.selectedOption < 0 || item.selectedOption > 3 || typeof item.correct !== "boolean" ||
      !["assessment", "tutor-practice", "note2learn-quiz"].includes(item.kind)) return;
    const safeItem = { ...item, topic: courseTopic.name };
    const nextEvidence = upsertLearningEvidence(evidence, safeItem);
    const nextScores = estimateMasteryFromEvidence(masteryBaseline, nextEvidence);
    setEvidence(nextEvidence);
    setKnowledgeScores(nextScores);
    setGamification((current) => awardCrossedMasteries(current, knowledgeScores, nextScores, courseModel.courseName));
  }, [evidence, masteryBaseline, knowledgeScores, courseModel]);

  const markSyllabusAnalyzed = useCallback((count = 3) => {
    setSyllabusAnalyzed(true);
    setUploadedMaterialsCount(count);
  }, []);

  const setCourseAnalysis = useCallback(
    ({
      courseModel: newModel,
      source,
      materialsCount,
      error,
      learningGoal,
      isSampleData: sampleData = false,
    }: {
      courseModel: CourseModel;
      source: AISource;
      materialsCount?: number;
      error?: string;
      learningGoal?: string;
      isSampleData?: boolean;
    }) => {
      setCourseModel(newModel);
      const newScores = createInitialScores(newModel);
      setMasteryBaseline(newScores);
      setKnowledgeScores(newScores);
      setEvidence([]);
      setAssessmentHistory([]);
      const newTopics = newModel.topics || [];
      setAnalysisSource(source);
      setAnalysisStatus(error && source === "baseline" ? "error" : "success");
      setAnalysisError(error || null);
      setSyllabusAnalyzed(true);
      setLearningGoalValue((learningGoal ?? learningGoalValue).trim().slice(0, 500));
      setIsSampleData(sampleData);
      if (typeof materialsCount === "number") {
        setUploadedMaterialsCount(materialsCount);
      }

      // Reset or align assessment/tutor/plan to the new subject
      setAssessmentCompleted(false);
      setTutorPracticeCompleted(false);
      setLessonCompletedTopics([]);
      setPlanAdapted(false);
      setAssessmentSource("baseline");
      setTutorSource("baseline");
      setPlanSource("baseline");

      // Generate aligned initial plan tasks for the new subject
      const firstTopic = newTopics[0]?.name || "Core Fundamentals";
      const weakTopic = newTopics[newTopics.length - 1]?.name || newTopics[0]?.name || "Advanced Topics";
      const midTopic = newTopics[Math.floor(newTopics.length / 2)]?.name || firstTopic;

      if (source === "baseline" && !sampleData) {
        const outlineTasks = newTopics.length
          ? newTopics.slice(0, 5).map((topic, index) => ({
              id: `outline-${index + 1}`,
              title: `Study ${topic.name}`,
              detail: "Detected in your source outline. Use the Tutor for an explanation and practice check.",
              duration: "10 min",
              kind: index === 0 ? "Warm up" as const : "Focus topic" as const,
              done: false,
            }))
          : [{
              id: "outline-review",
              title: "Review the extracted material",
              detail: "No explicit topic headings were detected. Add a structured outline or configure an AI provider for deeper analysis.",
              duration: "10 min",
              kind: "Warm up" as const,
              done: false,
            }];
        setPlanTasks(outlineTasks);
        return;
      }

      setPlanTasks([
        {
          id: "task-1",
          title: `Review ${firstTopic} Fundamentals`,
          detail: `Foundational concepts and principles in ${newModel.courseName}`,
          duration: "10 min",
          kind: "Warm up",
          done: false,
        },
        {
          id: "task-2",
          title: `Remediate ${weakTopic}`,
          detail: `Focus on conceptual breakdown and core mechanics of ${weakTopic}`,
          duration: "20 min",
          kind: "Focus topic",
          done: false,
        },
        {
          id: "task-3",
          title: `Practice ${midTopic}`,
          detail: `Apply core operations and problem solving in ${midTopic}`,
          duration: "15 min",
          kind: "Apply",
          done: false,
        },
        {
          id: "task-4",
          title: `Master ${weakTopic} Applications`,
          detail: `Advanced synthesis and practice challenge`,
          duration: "15 min",
          kind: "Reinforce",
          done: false,
        },
      ]);
    },
    [learningGoalValue]
  );

  const completeAssessmentAttempt = useCallback((entry: AssessmentHistoryEntry) => {
    if (!entry.id || entry.id.length > 180 || !Number.isFinite(Date.parse(entry.completedAt)) ||
      !Number.isInteger(entry.questionCount) || entry.questionCount < 1 || entry.questionCount > 100 ||
      !Number.isInteger(entry.attemptedCount) || entry.attemptedCount < 1 || entry.attemptedCount > entry.questionCount ||
      !Number.isInteger(entry.correctCount) || entry.correctCount < 0 || entry.correctCount > entry.attemptedCount) return;
    setAssessmentHistory((current) => current.some((item) => item.id === entry.id)
      ? current
      : [...current, entry].slice(-100));
    setAssessmentCompleted(true);
    setGamification((current) => awardLearningEvent(current, {
      id: `diagnostic:${entry.id}`,
      kind: "diagnostic",
      localDate: today,
      badge: "Diagnostic complete",
    }).state);
  }, [today]);

  const completeTutorPractice = useCallback((topicName?: string) => {
    setTutorPracticeCompleted(true);
    const topic = topicName || calculatedWeakTopic;
    setGamification((current) => awardLearningEvent(current, {
      id: `tutor-practice:${courseModel.courseName}:${topic}`,
      kind: "practice",
      localDate: today,
      badge: "First practice complete",
    }).state);
  }, [calculatedWeakTopic, courseModel.courseName, today]);

  const markTutorLessonCompleted = useCallback((topic: string) => {
    const cleanTopic = topic.trim().slice(0, 120);
    if (!cleanTopic) return;
    setLessonCompletedTopics((current) => current.includes(cleanTopic) ? current : [...current, cleanTopic]);
    setGamification((current) => awardLearningEvent(current, {
      id: `tutor-lesson:${courseModel.courseName}:${cleanTopic}`,
      kind: "lesson",
      localDate: today,
      badge: "First lesson complete",
    }).state);
  }, [courseModel.courseName, today]);

  const addNoteItem = useCallback((item: NoteLearningItem) => {
    setNoteItems((current) => [item, ...current.filter((note) => note.id !== item.id)].slice(0, 40));
  }, []);

  const updateNoteItem = useCallback((id: string, update: Partial<NoteLearningItem>) => {
    setNoteItems((current) => current.map((item) => item.id === id ? { ...item, ...update } : item));
  }, []);

  const toggleFlashcardMastery = useCallback((noteId: string, flashcardId: string) => {
    setNoteItems((current) => current.map((item) => item.id !== noteId ? item : {
      ...item,
      flashcards: item.flashcards.map((card) => card.id === flashcardId ? { ...card, mastered: !card.mastered } : card),
    }));
  }, []);

  const completeNoteQuiz = useCallback((noteId: string) => {
    const note = noteItems.find((item) => item.id === noteId);
    if (!note || note.completedAt || note.quiz.some((_, index) => !Number.isInteger(note.answers[String(index)]))) return;
    const correctCount = note.quiz.filter((question, index) => note.answers[String(index)] === question.correctOption).length;
    const completedAt = new Date().toISOString();
    setNoteItems((current) => current.map((item) => item.id === noteId
      ? { ...item, completedAt, quizScore: correctCount }
      : item));

    const courseTopic = courseModel.topics.find((topic) => topic.name.trim().toLowerCase() === note.topic.trim().toLowerCase());
    const nextEvidence = courseTopic
      ? note.quiz.reduce((current, question, index) => upsertLearningEvidence(current, {
          eventId: `note2learn:${note.id}:${question.id}`,
          activityId: `note2learn:${note.id}`,
          kind: "note2learn-quiz",
          questionId: question.id,
          topic: courseTopic.name,
          selectedOption: note.answers[String(index)],
          correct: note.answers[String(index)] === question.correctOption,
          recordedAt: completedAt,
        }), evidence)
      : evidence;
    const nextScores = courseTopic ? estimateMasteryFromEvidence(masteryBaseline, nextEvidence) : knowledgeScores;
    if (courseTopic) {
      setEvidence(nextEvidence);
      setKnowledgeScores(nextScores);
      setPlanAdapted(true);
    }
    setGamification((current) => {
      const quizReward = awardLearningEvent(current, {
        id: `note-quiz:${note.id}`,
        kind: "noteQuiz",
        localDate: today,
        badge: "Note2Learn quiz complete",
      }).state;
      return awardCrossedMasteries(quizReward, knowledgeScores, nextScores, courseModel.courseName);
    });
  }, [noteItems, evidence, masteryBaseline, knowledgeScores, courseModel, today]);

  const resetEntireDemo = useCallback(() => {
    const initial = createInitialProfile();
    let cleared = false;
    try {
      cleared = clearLearningState(window.localStorage);
    } catch {
      cleared = false;
    }
    setCourseModel(initial.courseModel);
    setLearningGoalValue(initial.learningGoal);
    setKnowledgeScores(initial.knowledgeScores);
    setMasteryBaseline(initial.masteryBaseline);
    setEvidence(initial.evidence);
    setAssessmentHistory(initial.assessmentHistory);
    setSyllabusAnalyzed(initial.syllabusAnalyzed);
    setUploadedMaterialsCount(initial.uploadedMaterialsCount);
    setAssessmentCompleted(initial.assessmentCompleted);
    setTutorPracticeCompleted(initial.tutorPracticeCompleted);
    setLessonCompletedTopics(initial.lessonCompletedTopics);
    setPlanAdapted(initial.planAdapted);
    setPlanSource(initial.planSource);
    setPlanTasks(initial.planTasks);
    setIsSampleData(initial.isSampleData);
    setNoteItems(initial.noteItems);
    setGamification(initial.gamification);
    setAnalysisSource(initial.analysisSource);
    setAssessmentSource(initial.assessmentSource);
    setTutorSource(initial.tutorSource);
    setAnalysisStatus("idle");
    setAnalysisError(null);
    setPersistenceError(!cleared);
  }, []);

  return (
    <LearningContext.Provider
      value={{
        courseModel,
        currentSubject: courseModel.courseName,
        analysisSource,
        analysisStatus,
        analysisError,
        learningGoal: learningGoalValue,
        setLearningGoal,
        isSampleData,
        persistenceReady,
        persistenceError,
        assessmentSource,
        setAssessmentSource,
        tutorSource,
        setTutorSource,
        knowledgeScores,
        evidence,
        assessmentHistory,
        lessonCompletedTopics,
        topics,
        overallMastery,
        weakestTopic: calculatedWeakTopic,
        currentPriority,
        currentFocus,
        currentGap,
        syllabusAnalyzed,
        uploadedMaterialsCount,
        assessmentCompleted,
        tutorPracticeCompleted,
        planAdapted,
        setPlanAdapted,
        planSource,
        setPlanSource,
        planTasks,
        setPlanTasks,
        gamification,
        weeklyLearningDays,
        claimDailyQuest,
        noteItems,
        markSyllabusAnalyzed,
        setCourseAnalysis,
        recordLearningEvidence,
        completeAssessmentAttempt,
        completeTutorPractice,
        markTutorLessonCompleted,
        addNoteItem,
        updateNoteItem,
        completeNoteQuiz,
        toggleFlashcardMastery,
        resetEntireDemo,
      }}
    >
      {persistenceReady ? (
        <>
          {persistenceError && (
            <div className="mx-auto mt-3 max-w-5xl px-4" role="status">
              <p className="rounded-xl border border-border bg-surface px-4 py-3 text-xs text-muted">
                LearnOS could not save progress in this browser. Your current session still works; keep this tab open until storage is available.
              </p>
            </div>
          )}
          {children}
        </>
      ) : (
        <main className="grid min-h-[calc(100vh-72px)] place-items-center px-6 text-sm text-muted" role="status">
          Restoring your local learning profile…
        </main>
      )}
    </LearningContext.Provider>
  );
}

export function useLearning() {
  const context = useContext(LearningContext);
  if (!context) {
    throw new Error("useLearning must be used within a LearningProvider");
  }
  return context;
}
