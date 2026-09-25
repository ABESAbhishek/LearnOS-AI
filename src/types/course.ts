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

export interface CourseAnalysisResponse {
  courseModel: CourseModel;
  source: "gemini" | "baseline";
  message: string;
  model?: string;
  latencyMs?: number;
  error?: string;
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
