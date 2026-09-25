export type PlanTaskKind =
  | "Warm up"
  | "Focus topic"
  | "Apply"
  | "Reinforce"
  | "Advanced";

export interface PlanTask {
  id: string;
  title: string;
  detail: string;
  duration: string;
  kind: PlanTaskKind;
  done: boolean;
}

export interface AdaptPlanRequest {
  topics?: string[];
  knowledgeScores?: Record<string, number>;
  weakTopics?: string[];
  tutorProgress?: {
    completed?: boolean;
    topic?: string;
  };
  currentFocus?: string;
}

export interface AdaptPlanResponse {
  tasks: PlanTask[];
  source: "gemini" | "baseline";
  message: string;
  model?: string;
  latencyMs?: number;
  error?: string;
}

export const INITIAL_PLAN_TASKS: PlanTask[] = [
  {
    id: "task-1",
    title: "Review graph representations",
    detail: "Build a quick adjacency-list example",
    duration: "10 min",
    kind: "Warm up",
    done: false,
  },
  {
    id: "task-2",
    title: "Trace breadth-first search",
    detail: "Follow the queue through one example (level-by-level)",
    duration: "20 min",
    kind: "Focus topic",
    done: false,
  },
  {
    id: "task-3",
    title: "Practice depth-first search",
    detail: "Compare iterative and recursive DFS on binary trees & graphs",
    duration: "15 min",
    kind: "Apply",
    done: false,
  },
  {
    id: "task-4",
    title: "Reflect on BFS vs DFS usage",
    detail: "Identify when shortest path requires BFS vs DFS",
    duration: "5 min",
    kind: "Reinforce",
    done: false,
  },
];

export const ADAPTED_PLAN_TASKS: PlanTask[] = [
  {
    id: "task-adapted-1",
    title: "Deepen BFS Shortest Path",
    detail: "Now that BFS traversal is solid, apply it to 2D Grid Shortest Path problems.",
    duration: "15 min",
    kind: "Focus topic",
    done: true,
  },
  {
    id: "task-adapted-2",
    title: "Implement Topological Sort with BFS",
    detail: "Use Kahn's Algorithm (in-degree queue) to sort dependency graphs.",
    duration: "20 min",
    kind: "Advanced",
    done: false,
  },
  {
    id: "task-adapted-3",
    title: "Cycle Detection in Directed Graphs",
    detail: "Contrast DFS back-edge detection with BFS color marking.",
    duration: "15 min",
    kind: "Apply",
    done: false,
  },
  {
    id: "task-adapted-4",
    title: "Reinforce Trees & Graph Duality",
    detail: "Connect tree level-order traversal back to general graph BFS.",
    duration: "10 min",
    kind: "Reinforce",
    done: false,
  },
];

/**
 * Validates raw Gemini output for Study Plan tasks.
 */
export function validatePlanTasks(data: unknown): boolean {
  if (!data || typeof data !== "object") return false;

  const rawTasks = Array.isArray(data)
    ? data
    : Array.isArray((data as { tasks?: unknown }).tasks)
    ? (data as { tasks: unknown[] }).tasks
    : null;

  if (!rawTasks || rawTasks.length !== 4) return false;

  return rawTasks.every((task) => {
    if (!task || typeof task !== "object") return false;
    const t = task as Record<string, unknown>;

    const hasId = typeof t.id === "string" && t.id.trim().length > 0;
    const hasTitle = typeof t.title === "string" && t.title.trim().length > 0;
    const hasDetail = typeof t.detail === "string" && t.detail.trim().length > 0;
    const hasValidDuration =
      (typeof t.duration === "number" && !isNaN(t.duration) && t.duration > 0) ||
      (typeof t.duration === "string" && t.duration.trim().length > 0);
    const hasKind = typeof t.kind === "string" && t.kind.trim().length > 0;
    const hasDone = typeof t.done === "boolean";

    return hasId && hasTitle && hasDetail && hasValidDuration && hasKind && hasDone;
  });
}

/**
 * Normalizes validated tasks to match the canonical PlanTask type.
 */
export function normalizePlanTasks(tasks: unknown[]): PlanTask[] {
  const validKinds: PlanTaskKind[] = ["Warm up", "Focus topic", "Apply", "Reinforce", "Advanced"];

  return tasks.map((task, idx) => {
    const t = task as Record<string, unknown>;
    const rawDuration = t.duration;
    let durationStr = "15 min";
    if (typeof rawDuration === "number") {
      durationStr = `${rawDuration} min`;
    } else if (typeof rawDuration === "string") {
      durationStr = rawDuration.toLowerCase().includes("min")
        ? rawDuration.trim()
        : `${rawDuration.trim()} min`;
    }

    const rawKind = String(t.kind || "Focus topic").trim();
    const matchedKind = validKinds.find((k) => k.toLowerCase() === rawKind.toLowerCase()) || "Focus topic";

    return {
      id: String(t.id || `task-${idx + 1}`).trim(),
      title: String(t.title || "").trim(),
      detail: String(t.detail || "").trim(),
      duration: durationStr,
      kind: matchedKind,
      done: Boolean(t.done),
    };
  });
}

/**
 * Fallback deterministic tasks based on the specific weak topic.
 */
export function getFallbackPlanTasks(topic: string = "Graphs", isAdapted: boolean = false): PlanTask[] {
  const norm = topic.toLowerCase();
  if (norm.includes("graph")) {
    return isAdapted ? ADAPTED_PLAN_TASKS : INITIAL_PLAN_TASKS;
  }

  if (norm.includes("tree")) {
    return [
      {
        id: "task-tree-1",
        title: "Review Binary Search Tree Invariants",
        detail: "Verify left < root < right property across sample subtrees.",
        duration: "10 min",
        kind: "Warm up",
        done: false,
      },
      {
        id: "task-tree-2",
        title: "Trace Inorder & Preorder Traversals",
        detail: "Step through recursive call frames and reconstruct tree nodes.",
        duration: "15 min",
        kind: "Focus topic",
        done: false,
      },
      {
        id: "task-tree-3",
        title: "Implement BST Search & Insertion",
        detail: "Code iterative pointer updates handling null leaf insertions.",
        duration: "15 min",
        kind: "Apply",
        done: false,
      },
      {
        id: "task-tree-4",
        title: "Validate BST & Balance Checking",
        detail: "Apply min/max range constraints to detect invalid BST nodes.",
        duration: "10 min",
        kind: isAdapted ? "Advanced" : "Reinforce",
        done: false,
      },
    ];
  }

  if (norm.includes("hash")) {
    return [
      {
        id: "task-hash-1",
        title: "Review Hash Function Distribution",
        detail: "Understand uniform distribution and modulo array indexing.",
        duration: "10 min",
        kind: "Warm up",
        done: false,
      },
      {
        id: "task-hash-2",
        title: "Trace Collision Resolution with Chaining",
        detail: "Inspect linked list buckets under high load factor scenarios.",
        duration: "15 min",
        kind: "Focus topic",
        done: false,
      },
      {
        id: "task-hash-3",
        title: "Implement Open Addressing & Linear Probing",
        detail: "Handle tombstone deletion markers during key search passes.",
        duration: "15 min",
        kind: "Apply",
        done: false,
      },
      {
        id: "task-hash-4",
        title: "Design Dynamic Resizing & Rehashing",
        detail: "Analyze amortized O(1) performance during table doubling.",
        duration: "10 min",
        kind: isAdapted ? "Advanced" : "Reinforce",
        done: false,
      },
    ];
  }

  const cleanId = topic.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return [
    {
      id: `task-${cleanId}-1`,
      title: `Review ${topic} Core Principles`,
      detail: `Solidify foundational definitions, memory layouts, and key invariants for ${topic}.`,
      duration: "10 min",
      kind: "Warm up",
      done: false,
    },
    {
      id: `task-${cleanId}-2`,
      title: `Trace Guided ${topic} Operations`,
      detail: `Walk through primary algorithmic steps and state transitions step-by-step.`,
      duration: "15 min",
      kind: "Focus topic",
      done: false,
    },
    {
      id: `task-${cleanId}-3`,
      title: `Practice Independent ${topic} Problem`,
      detail: `Implement standard solution patterns with explicit boundary condition checks.`,
      duration: "15 min",
      kind: "Apply",
      done: false,
    },
    {
      id: `task-${cleanId}-4`,
      title: `Solve Advanced ${topic} Challenge`,
      detail: `Synthesize core techniques to optimize time and space complexity constraints.`,
      duration: "10 min",
      kind: isAdapted ? "Advanced" : "Reinforce",
      done: false,
    },
  ];
}
