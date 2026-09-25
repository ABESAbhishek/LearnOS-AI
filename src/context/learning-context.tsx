"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  type ReactNode,
} from "react";

import { BASELINE_DSA_COURSE, type CourseModel } from "@/types/course";
import {
  type PlanTask,
  INITIAL_PLAN_TASKS,
  ADAPTED_PLAN_TASKS,
} from "@/types/plan";

export type { PlanTask };
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
  analysisSource: "gemini" | "baseline";
  analysisStatus: "idle" | "analyzing" | "success" | "error";
  analysisError: string | null;

  // Assessment
  assessmentSource: "gemini" | "baseline";
  setAssessmentSource: (source: "gemini" | "baseline") => void;

  // Tutor
  tutorSource: "gemini" | "baseline";
  setTutorSource: (source: "gemini" | "baseline") => void;

  // Knowledge profile
  knowledgeScores: Record<string, number>;
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
  planSource: "gemini" | "baseline";
  setPlanSource: (source: "gemini" | "baseline") => void;
  planTasks: PlanTask[];
  setPlanTasks: (tasks: PlanTask[]) => void;

  // Action methods
  markSyllabusAnalyzed: (count?: number) => void;
  setCourseAnalysis: (params: {
    courseModel: CourseModel;
    source: "gemini" | "baseline";
    materialsCount?: number;
    error?: string;
  }) => void;
  updateAssessmentMastery: (scores: Record<string, number>) => void;
  completeTutorPractice: (topic?: string) => void;
  togglePlanTask: (taskId: string) => void;
  resetSessionPlan: () => void;
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

function calculateLevel(score: number): TopicMastery["level"] {
  if (score >= 80) return "Strong";
  if (score >= 60) return "Good";
  if (score >= 40) return "Developing";
  return "Priority";
}

const LearningContext = createContext<LearningContextType | null>(null);

export function LearningProvider({ children }: { children: ReactNode }) {
  const [courseModel, setCourseModel] = useState<CourseModel>(BASELINE_DSA_COURSE);
  const [analysisSource, setAnalysisSource] = useState<"gemini" | "baseline">("baseline");
  const [analysisStatus, setAnalysisStatus] = useState<"idle" | "analyzing" | "success" | "error">("idle");
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [assessmentSource, setAssessmentSource] = useState<"gemini" | "baseline">("baseline");
  const [tutorSource, setTutorSource] = useState<"gemini" | "baseline">("baseline");

  const [knowledgeScores, setKnowledgeScores] = useState<Record<string, number>>(INITIAL_SCORES);
  const [syllabusAnalyzed, setSyllabusAnalyzed] = useState(true);
  const [uploadedMaterialsCount, setUploadedMaterialsCount] = useState(3);
  const [assessmentCompleted, setAssessmentCompleted] = useState(false);
  const [tutorPracticeCompleted, setTutorPracticeCompleted] = useState(false);
  const [planAdapted, setPlanAdapted] = useState(false);
  const [planSource, setPlanSource] = useState<"gemini" | "baseline">("baseline");
  const [planTasks, setPlanTasks] = useState<PlanTask[]>(INITIAL_PLAN_TASKS);

  // Dynamically derive current weak topic based on knowledgeScores
  let calculatedWeakTopic = "Graphs";
  let minScore = 999;
  const canonicalOrder = ["Arrays", "Linked Lists", "Stacks", "Trees", "Hashing", "Graphs"];

  canonicalOrder.forEach((t) => {
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
  const topics: TopicMastery[] = canonicalOrder.map((name) => {
    const mastery = knowledgeScores[name] ?? INITIAL_SCORES[name] ?? 50;
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

  const currentPriority =
    calculatedWeakTopic === "Graphs"
      ? "Graph Traversal"
      : `${calculatedWeakTopic} Mastery`;

  const currentFocus =
    calculatedWeakTopic === "Graphs"
      ? ["BFS", "DFS", "Graph Applications"]
      : calculatedWeakTopic === "Hashing"
      ? ["Collision Resolution", "Open Addressing", "Hash Functions"]
      : calculatedWeakTopic === "Trees"
      ? ["Binary Search Trees", "Tree Traversal", "Inorder Invariants"]
      : [`${calculatedWeakTopic} Concepts`, "Edge Cases", "Complexity"];

  const currentGap =
    calculatedWeakTopic === "Graphs"
      ? "BFS / DFS traversal & shortest-path exploration"
      : calculatedWeakTopic === "Hashing"
      ? "Hash table collision resolution & load balancing"
      : calculatedWeakTopic === "Trees"
      ? "Binary search tree invariants and recursive traversals"
      : `${calculatedWeakTopic} structure and application constraints`;

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
    }: {
      courseModel: CourseModel;
      source: "gemini" | "baseline";
      materialsCount?: number;
      error?: string;
    }) => {
      setCourseModel(newModel);
      setAnalysisSource(source);
      setAnalysisStatus(error && source === "baseline" ? "error" : "success");
      setAnalysisError(error || null);
      setSyllabusAnalyzed(true);
      if (typeof materialsCount === "number") {
        setUploadedMaterialsCount(materialsCount);
      }
    },
    []
  );

  const updateAssessmentMastery = useCallback((scores: Record<string, number>) => {
    setKnowledgeScores(scores);
    setAssessmentCompleted(true);
  }, []);

  const completeTutorPractice = useCallback((topicName?: string) => {
    setTutorPracticeCompleted(true);
    setKnowledgeScores((prev) => {
      let target = topicName;
      if (!target) {
        let lowest = "Graphs";
        let minS = 100;
        Object.entries(prev).forEach(([t, s]) => {
          if (s < minS) {
            minS = s;
            lowest = t;
          }
        });
        target = lowest;
      }
      const current = prev[target] ?? 31;
      const boosted = Math.min(95, Math.max(74, current + 43));
      return {
        ...prev,
        [target]: boosted,
      };
    });
    // Adapt plan flag
    setPlanAdapted(true);
    setPlanTasks((current) => {
      // If still baseline DSA tasks, load adapted baseline tasks
      if (current === INITIAL_PLAN_TASKS || current[0]?.id === "task-1") {
        return ADAPTED_PLAN_TASKS;
      }
      return current;
    });
  }, []);

  const togglePlanTask = useCallback((taskId: string) => {
    setPlanTasks((current) =>
      current.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t))
    );
  }, []);

  const resetSessionPlan = useCallback(() => {
    setPlanTasks((current) => current.map((t) => ({ ...t, done: false })));
  }, []);

  const resetEntireDemo = useCallback(() => {
    setKnowledgeScores(INITIAL_SCORES);
    setSyllabusAnalyzed(true);
    setUploadedMaterialsCount(3);
    setAssessmentCompleted(false);
    setTutorPracticeCompleted(false);
    setPlanAdapted(false);
    setPlanSource("baseline");
    setPlanTasks(INITIAL_PLAN_TASKS);
    setCourseModel(BASELINE_DSA_COURSE);
    setAnalysisSource("baseline");
    setAssessmentSource("baseline");
    setTutorSource("baseline");
    setAnalysisStatus("idle");
    setAnalysisError(null);
  }, []);

  return (
    <LearningContext.Provider
      value={{
        courseModel,
        analysisSource,
        analysisStatus,
        analysisError,
        assessmentSource,
        setAssessmentSource,
        tutorSource,
        setTutorSource,
        knowledgeScores,
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
        markSyllabusAnalyzed,
        setCourseAnalysis,
        updateAssessmentMastery,
        completeTutorPractice,
        togglePlanTask,
        resetSessionPlan,
        resetEntireDemo,
      }}
    >
      {children}
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
