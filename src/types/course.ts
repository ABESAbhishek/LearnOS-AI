export type TopicDifficulty = "Foundational" | "Intermediate" | "Advanced";
export type TopicImportance = "High" | "Medium" | "Low";

export interface CourseTopic {
  name: string;
  subtopics: string[];
  difficulty: TopicDifficulty;
  prerequisites: string[];
  importance: TopicImportance;
  studyOrder: number;
  frequency?: number;
}

export interface CourseModel {
  courseName: string;
  description?: string;
  topics: CourseTopic[];
  totalTopics: number;
  totalSubtopics: number;
  highPriorityCount: number;
}

import type { AISource } from "@/lib/ai/types";
import type { DocumentKnowledgeRepresentation, SourceDocument } from "@/types/document";

export interface AnalyzedTopic {
  name: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  priority: "Low" | "Medium" | "High";
  frequency: number;
  subtopics?: string[];
  prerequisites?: string[];
}

export interface SyllabusAnalysisData {
  courseName?: string;
  subject?: string;
  topics: AnalyzedTopic[];
  concepts: number;
  priorityAreas: number;
  pyqCount: number;
  summary: string;
  documentKnowledge?: DocumentKnowledgeRepresentation;
}

export interface CourseAnalysisResponse {
  source: AISource;
  data: SyllabusAnalysisData;
  courseModel: CourseModel;
  subject?: string;
  message: string;
  model?: string;
  latencyMs?: number;
  error?: string;
  documents?: SourceDocument[];
  knowledge?: DocumentKnowledgeRepresentation;
}

/**
 * Deterministic baseline DSA course model.
 * Matches existing demo values and structure exactly.
 */
export const BASELINE_DSA_COURSE: CourseModel = {
  courseName: "Data Structures & Algorithms",
  description: "Comprehensive curriculum covering fundamental linear structures through advanced non-linear structures and algorithms.",
  topics: [
    {
      name: "Arrays",
      subtopics: ["Array traversal", "Prefix sums", "Sliding window", "Two pointers"],
      difficulty: "Foundational",
      prerequisites: [],
      importance: "High",
      studyOrder: 1,
      frequency: 6,
    },
    {
      name: "Linked Lists",
      subtopics: ["Singly linked lists", "Doubly linked lists", "Fast & slow pointers", "Cycle detection"],
      difficulty: "Intermediate",
      prerequisites: ["Arrays"],
      importance: "Medium",
      studyOrder: 2,
      frequency: 4,
    },
    {
      name: "Stacks",
      subtopics: ["LIFO principle", "Monotonic stack", "Parentheses matching", "Expression evaluation"],
      difficulty: "Foundational",
      prerequisites: ["Arrays"],
      importance: "Medium",
      studyOrder: 3,
      frequency: 3,
    },
    {
      name: "Queues",
      subtopics: ["FIFO principle", "Circular queues", "Deque", "Priority queues intro"],
      difficulty: "Foundational",
      prerequisites: ["Arrays"],
      importance: "Medium",
      studyOrder: 4,
      frequency: 3,
    },
    {
      name: "Trees",
      subtopics: ["Binary trees", "Binary search trees", "Tree traversals (In/Pre/Post)", "Lowest common ancestor"],
      difficulty: "Intermediate",
      prerequisites: ["Linked Lists", "Stacks"],
      importance: "High",
      studyOrder: 5,
      frequency: 6,
    },
    {
      name: "Hashing",
      subtopics: ["Hash tables", "Collision resolution", "Frequency counters", "Set lookups"],
      difficulty: "Intermediate",
      prerequisites: ["Arrays"],
      importance: "Medium",
      studyOrder: 6,
      frequency: 4,
    },
    {
      name: "Graphs",
      subtopics: ["Adjacency matrix & list", "Breadth-First Search (BFS)", "Depth-First Search (DFS)", "Topological sort", "Shortest path"],
      difficulty: "Advanced",
      prerequisites: ["Trees", "Queues", "Stacks"],
      importance: "High",
      studyOrder: 7,
      frequency: 8,
    },
    {
      name: "Sorting",
      subtopics: ["Quick sort", "Merge sort", "Heap sort", "Time complexity bounds"],
      difficulty: "Intermediate",
      prerequisites: ["Arrays"],
      importance: "High",
      studyOrder: 8,
      frequency: 5,
    },
    {
      name: "Searching",
      subtopics: ["Binary search", "Search in rotated arrays", "Binary search on answer"],
      difficulty: "Foundational",
      prerequisites: ["Arrays"],
      importance: "Medium",
      studyOrder: 9,
      frequency: 3,
    },
  ],
  totalTopics: 9,
  totalSubtopics: 36,
  highPriorityCount: 4,
};

/**
 * Validates raw data received from Gemini or external source.
 */
export function validateCourseModel(data: unknown): data is CourseModel {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;
  if (typeof d.courseName !== "string" || d.courseName.trim().length === 0) return false;
  if (!Array.isArray(d.topics) || d.topics.length === 0) return false;

  for (const t of d.topics) {
    if (!t || typeof t !== "object") return false;
    const topic = t as Record<string, unknown>;
    if (typeof topic.name !== "string" || topic.name.trim().length === 0) return false;
  }
  return true;
}

/**
 * Normalizes raw structured data into a guaranteed valid CourseModel.
 */
export function normalizeCourseModel(raw: unknown): CourseModel {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;

  const courseName = typeof r.courseName === "string" && r.courseName.trim().length > 0
    ? r.courseName.trim()
    : "Custom Curriculum";

  const description = typeof r.description === "string"
    ? r.description.trim()
    : undefined;

  const rawTopics = Array.isArray(r.topics) ? r.topics : [];
  let totalSubtopicsCount = 0;
  let highPriority = 0;

  const topics: CourseTopic[] = rawTopics.map((item: unknown, idx: number) => {
    const it = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
    const name = typeof it.name === "string" && it.name.trim().length > 0
      ? it.name.trim()
      : `Topic ${idx + 1}`;

    const subtopics = Array.isArray(it.subtopics)
      ? it.subtopics.filter((s: unknown) => typeof s === "string" && s.trim().length > 0).map((s: string) => s.trim())
      : [];
    totalSubtopicsCount += Math.max(1, subtopics.length);

    let difficulty: TopicDifficulty = "Intermediate";
    if (it.difficulty === "Foundational" || it.difficulty === "Intermediate" || it.difficulty === "Advanced") {
      difficulty = it.difficulty;
    }

    let importance: TopicImportance = "Medium";
    if (it.importance === "High" || it.importance === "Medium" || it.importance === "Low") {
      importance = it.importance;
    }
    if (importance === "High") {
      highPriority++;
    }

    const prerequisites = Array.isArray(it.prerequisites)
      ? it.prerequisites.filter((p: unknown) => typeof p === "string" && p.trim().length > 0)
      : [];

    const studyOrder = typeof it.studyOrder === "number" && it.studyOrder > 0
      ? Math.round(it.studyOrder)
      : idx + 1;

    const frequency = typeof it.frequency === "number" && it.frequency > 0
      ? Math.min(10, Math.max(1, Math.round(it.frequency)))
      : 4;

    return {
      name,
      subtopics: subtopics.length > 0 ? subtopics : [name],
      difficulty,
      prerequisites,
      importance,
      studyOrder,
      frequency,
    };
  });

  return {
    courseName,
    description,
    topics: topics.length > 0 ? topics : BASELINE_DSA_COURSE.topics,
    totalTopics: topics.length > 0 ? topics.length : BASELINE_DSA_COURSE.totalTopics,
    totalSubtopics: totalSubtopicsCount > 0 ? totalSubtopicsCount : BASELINE_DSA_COURSE.totalSubtopics,
    highPriorityCount: highPriority > 0 ? highPriority : BASELINE_DSA_COURSE.highPriorityCount,
  };
}

/**
 * Deterministic baseline syllabus analysis data matching prompt requirements.
 */
export const BASELINE_SYLLABUS_DATA: SyllabusAnalysisData = {
  topics: [
    { name: "Arrays", difficulty: "Beginner", priority: "High", frequency: 6 },
    { name: "Linked Lists", difficulty: "Intermediate", priority: "Medium", frequency: 4 },
    { name: "Stacks", difficulty: "Beginner", priority: "Medium", frequency: 5 },
    { name: "Trees", difficulty: "Intermediate", priority: "High", frequency: 7 },
    { name: "Hashing", difficulty: "Intermediate", priority: "High", frequency: 5 },
    { name: "Graphs", difficulty: "Advanced", priority: "High", frequency: 8 },
  ],
  concepts: 24,
  priorityAreas: 4,
  pyqCount: 35,
  summary: "Comprehensive Data Structures & Algorithms curriculum covering foundational linear structures through advanced graph representations and algorithms.",
};

/**
 * Strict validator for SyllabusAnalysisData according to prompt requirements:
 * - topics must be an array
 * - every topic must have name
 * - difficulty must be one of "Beginner" | "Intermediate" | "Advanced"
 * - priority must be one of "Low" | "Medium" | "High"
 * - frequency must be numeric
 * - concepts must be numeric
 * - priorityAreas must be numeric
 * - pyqCount must be numeric
 * - summary must be a string
 */
export function validateSyllabusAnalysisData(data: unknown): data is SyllabusAnalysisData {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;

  // topics must be an array
  if (!Array.isArray(d.topics) || d.topics.length === 0) return false;

  // every topic validation
  for (const item of d.topics) {
    if (!item || typeof item !== "object") return false;
    const t = item as Record<string, unknown>;

    // name must be string
    if (typeof t.name !== "string" || t.name.trim().length === 0) return false;

    // difficulty must be one of the allowed values
    const diff = typeof t.difficulty === "string" ? t.difficulty.trim() : "";
    if (diff !== "Beginner" && diff !== "Intermediate" && diff !== "Advanced") {
      return false;
    }

    // priority must be one of the allowed values
    const prio = typeof t.priority === "string" ? t.priority.trim() : "";
    if (prio !== "Low" && prio !== "Medium" && prio !== "High") {
      return false;
    }

    // frequency must be numeric
    if (typeof t.frequency !== "number" || isNaN(t.frequency)) {
      return false;
    }
    if (t.subtopics !== undefined && (!Array.isArray(t.subtopics) || t.subtopics.length > 12 || !t.subtopics.every((value) => typeof value === "string" && value.trim().length > 0 && value.length <= 120))) return false;
    if (t.prerequisites !== undefined && (!Array.isArray(t.prerequisites) || t.prerequisites.length > 12 || !t.prerequisites.every((value) => typeof value === "string" && value.trim().length > 0 && value.length <= 120))) return false;
  }

  // concepts must be numeric
  if (typeof d.concepts !== "number" || isNaN(d.concepts)) return false;

  // priorityAreas must be numeric
  if (typeof d.priorityAreas !== "number" || isNaN(d.priorityAreas)) return false;

  // pyqCount must be numeric
  if (typeof d.pyqCount !== "number" || isNaN(d.pyqCount)) return false;

  // summary must be a string
  if (typeof d.summary !== "string" || d.summary.trim().length === 0) return false;

  return true;
}

/**
 * Maps structured SyllabusAnalysisData into the application CourseModel.
 */
export function syllabusDataToCourseModel(
  data: SyllabusAnalysisData,
  fallbackCourseName = "Custom Curriculum"
): CourseModel {
  const courseName =
    (typeof data.courseName === "string" && data.courseName.trim().length > 0
      ? data.courseName.trim()
      : typeof data.subject === "string" && data.subject.trim().length > 0
      ? data.subject.trim()
      : fallbackCourseName) || "Custom Curriculum";

  const topics: CourseTopic[] = data.topics.map((t, idx) => {
    let diff: TopicDifficulty = "Intermediate";
    if (t.difficulty === "Beginner") diff = "Foundational";
    else if (t.difficulty === "Intermediate") diff = "Intermediate";
    else if (t.difficulty === "Advanced") diff = "Advanced";

    let imp: TopicImportance = "Medium";
    if (t.priority === "High") imp = "High";
    else if (t.priority === "Medium") imp = "Medium";
    else if (t.priority === "Low") imp = "Low";

    return {
      name: t.name.trim(),
      subtopics: t.subtopics?.length ? t.subtopics.slice(0, 12).map((item) => item.trim()).filter(Boolean) : [
        `${t.name.trim()} Fundamentals`,
        `${t.name.trim()} Core Operations`,
        `${t.name.trim()} Problem Solving & Applications`,
      ],
      difficulty: diff,
      prerequisites: t.prerequisites?.slice(0, 12).map((item) => item.trim()).filter(Boolean) ?? (idx > 0 ? [data.topics[idx - 1].name.trim()] : []),
      importance: imp,
      studyOrder: idx + 1,
      frequency: Math.min(10, Math.max(1, Math.round(t.frequency))),
    };
  });

  return {
    courseName,
    description: data.summary,
    topics,
    totalTopics: data.topics.length,
    totalSubtopics: data.concepts,
    highPriorityCount: data.priorityAreas,
  };
}
