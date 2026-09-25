export interface TutorVisualStep {
  title: string;
  description: string;
}

export interface TutorPracticeQuestion {
  prompt: string;
  options: string[];
  correctOption: number;
}

export interface TutorExplanation {
  topic: string;
  intuition: string;
  keyPoints: string[];
  visualSteps: TutorVisualStep[];
  practiceQuestion: TutorPracticeQuestion;
}

export interface TutorExplainRequest {
  topic: string;
  mastery?: number;
  weakAreas?: string[];
  stage?: number;
  question?: string;
  useSample?: boolean;
}

export interface TutorExplainResponse {
  explanation: TutorExplanation;
  source: "gemini" | "baseline";
  message: string;
  model?: string;
  latencyMs?: number;
  error?: string;
}

export const CANONICAL_TUTOR_EXPLANATION: TutorExplanation = {
  topic: "Graph Traversal",
  intuition:
    "Think of Breadth-First Search (BFS) like ripples expanding in water. When a pebble drops into still water, ripples spread uniformly outward: first touching all points 1 step away, then expanding to points 2 steps away, never skipping a layer.",
  keyPoints: [
    "Start from Root: Select the starting vertex (Node A) and mark it visited.",
    "Enqueue Neighbors: Place unvisited direct neighbors into a FIFO (First-In, First-Out) Queue.",
    "Layer by Layer: Dequeue nodes in arrival order. Because the queue is FIFO, layer 1 is fully explored before layer 2 begins.",
    "Guaranteed Shortest Path: In unweighted graphs, the first time BFS discovers a destination node, it is via the minimum number of edges.",
  ],
  visualSteps: [
    {
      title: "Start at Node A (Layer 0)",
      description:
        "Initialize the traversal at Node A. Mark A visited and enqueue its direct neighbors B and C into the FIFO queue.",
    },
    {
      title: "Explore Node B (Layer 1)",
      description:
        "Dequeue Node B from the front of the queue. Mark B visited and enqueue B's unvisited neighbor Node D (Layer 2).",
    },
    {
      title: "Explore Node C (Layer 1)",
      description:
        "Dequeue Node C from the front of the queue. C is at Layer 1 and has no unvisited neighbors, so the queue retains D.",
    },
    {
      title: "Reach Node D (Layer 2)",
      description:
        "Dequeue Node D from the front of the queue. Layer 2 is reached. All reachable vertices are visited in order: A → B → C → D.",
    },
  ],
  practiceQuestion: {
    prompt:
      "Why does BFS explore Node C before Node D in our graph example (where A connects to B and C, and B connects to D)?",
    options: [
      "Because C is 1 edge away from A (Layer 1), whereas D is 2 edges away (Layer 2). BFS always explores closer layers first.",
      "Because nodes are always processed in alphabetical order regardless of graph edges.",
      "Because a LIFO Stack forces C to the top before D can be processed.",
      "Because Node D is visited concurrently with Node A during initialization.",
    ],
    correctOption: 0,
  },
};

/**
 * Returns a deterministic canonical baseline explanation tailored to the requested topic.
 */
export function getFallbackTutorExplanation(topic?: string): TutorExplanation {
  const norm = (topic || "").trim().toLowerCase();

  if (norm.includes("hash")) {
    return {
      topic: "Hashing",
      intuition:
        "Think of a hash table like numbered cubbies in a locker room. A mathematical function turns a key directly into a cubby index so you can find items in O(1) time instead of searching one by one.",
      keyPoints: [
        "Hash Function: Calculates a numeric bucket index from any key in constant time.",
        "Deterministic: The same key must always hash to the exact same bucket index.",
        "Pigeonhole Principle: When multiple keys hash to the same bucket, a collision occurs.",
        "Collision Strategies: Handled via Chaining (linked buckets) or Open Addressing (probing).",
      ],
      visualSteps: [
        {
          title: "Compute Bucket Index",
          description: "Run the key through the hash function to compute hash(key) % capacity.",
        },
        {
          title: "Inspect Target Bucket",
          description: "Access the computed bucket in O(1) memory lookup time.",
        },
        {
          title: "Detect Collision",
          description:
            "If the bucket is already occupied by a different key, resolve via chaining or linear probe.",
        },
        {
          title: "Retrieve or Insert",
          description: "Place the key-value pair into the chain or read out the matching value.",
        },
      ],
      practiceQuestion: {
        prompt: "What happens when two distinct keys yield the same bucket index in a hash table?",
        options: [
          "A collision occurs and must be resolved through chaining or open addressing.",
          "The hash table automatically sorts all elements into ascending order.",
          "The first key is overwritten and permanently lost.",
          "The table immediately doubles in capacity without collision handling.",
        ],
        correctOption: 0,
      },
    };
  }

  if (norm.includes("tree")) {
    return {
      topic: "Binary Search Trees",
      intuition:
        "Think of a binary search tree like a sorted dictionary opened in the exact middle. Every value to the left is smaller, and every value to the right is larger, eliminating half the choices at every step.",
      keyPoints: [
        "BST Invariant: For every node, all left descendants are smaller and right descendants are larger.",
        "Inorder Traversal: Traversing Left → Root → Right produces values in strictly sorted order.",
        "Logarithmic Search: Well-balanced BSTs find elements in O(log n) average time.",
        "Height Sensitivity: Degenerate unbalanced trees can degrade to O(n) linear search.",
      ],
      visualSteps: [
        {
          title: "Start at Root Node",
          description: "Compare target value against the root node value.",
        },
        {
          title: "Navigate Branch",
          description:
            "If target is smaller, move to left child; if target is larger, move to right child.",
        },
        {
          title: "Inorder Sequence",
          description: "Visit Left subtree completely, process Root, then visit Right subtree.",
        },
        {
          title: "Sorted Extraction",
          description: "All tree keys are output in monotonically ascending order.",
        },
      ],
      practiceQuestion: {
        prompt:
          "Which tree traversal visits the values of a binary search tree in monotonically ascending order?",
        options: [
          "Inorder traversal (Left, Root, Right)",
          "Preorder traversal (Root, Left, Right)",
          "Level-order traversal (Breadth-First)",
          "Postorder traversal (Left, Right, Root)",
        ],
        correctOption: 0,
      },
    };
  }

  // Default canonical: Graph Traversal / BFS
  return CANONICAL_TUTOR_EXPLANATION;
}

/**
 * Validates that an unknown object conforms strictly to TutorExplanation.
 */
export function validateTutorExplanation(data: unknown): data is TutorExplanation {
  if (!data || typeof data !== "object") return false;
  const t = data as Record<string, unknown>;

  if (typeof t.topic !== "string" || t.topic.trim().length === 0) return false;
  if (typeof t.intuition !== "string" || t.intuition.trim().length === 0) return false;

  if (!Array.isArray(t.keyPoints) || t.keyPoints.length === 0) return false;
  for (const kp of t.keyPoints) {
    if (typeof kp !== "string" || kp.trim().length === 0) return false;
  }

  if (!Array.isArray(t.visualSteps) || t.visualSteps.length === 0) return false;
  for (const step of t.visualSteps) {
    if (!step || typeof step !== "object") return false;
    const s = step as Record<string, unknown>;
    if (typeof s.title !== "string" || s.title.trim().length === 0) return false;
    if (typeof s.description !== "string" || s.description.trim().length === 0) return false;
  }

  if (!t.practiceQuestion || typeof t.practiceQuestion !== "object") return false;
  const pq = t.practiceQuestion as Record<string, unknown>;
  if (typeof pq.prompt !== "string" || pq.prompt.trim().length === 0) return false;
  if (!Array.isArray(pq.options) || pq.options.length !== 4) return false;
  for (const opt of pq.options) {
    if (typeof opt !== "string" || opt.trim().length === 0) return false;
  }

  if (
    typeof pq.correctOption !== "number" ||
    !Number.isInteger(pq.correctOption) ||
    pq.correctOption < 0 ||
    pq.correctOption > 3
  ) {
    return false;
  }

  return true;
}

/**
 * Normalizes a validated TutorExplanation to ensure trimmed strings and sanitized fields.
 */
export function normalizeTutorExplanation(
  raw: unknown,
  fallback = CANONICAL_TUTOR_EXPLANATION
): TutorExplanation {
  if (!validateTutorExplanation(raw)) return fallback;

  return {
    topic: raw.topic.trim(),
    intuition: raw.intuition.trim(),
    keyPoints: raw.keyPoints.map((kp) => kp.trim()),
    visualSteps: raw.visualSteps.map((s) => ({
      title: s.title.trim(),
      description: s.description.trim(),
    })),
    practiceQuestion: {
      prompt: raw.practiceQuestion.prompt.trim(),
      options: raw.practiceQuestion.options.map((o) => o.trim()),
      correctOption: Math.min(3, Math.max(0, Math.floor(raw.practiceQuestion.correctOption))),
    },
  };
}
