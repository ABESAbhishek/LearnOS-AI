import type { AssessmentQuestion } from "@/types/assessment";

/**
 * Deterministic baseline diagnostic question bank.
 * Preserves the canonical DSA demo experience and serves as offline fallback.
 */
export const BASELINE_ASSESSMENT_QUESTIONS: AssessmentQuestion[] = [
  {
    id: "dsa-arrays-01",
    topic: "Arrays",
    subtopic: "Memory Layout & Indexing",
    conceptTested: "Direct constant-time address calculation",
    difficulty: "Foundational",
    prompt: "What is the time complexity of accessing an element by index in an array?",
    options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"],
    correctOption: 0,
    explanation:
      "Arrays use contiguous memory storage, allowing the memory address of index i to be calculated directly as base_address + i * element_size in O(1) time.",
    misconception: "Confusing array index access with searching for an unsorted value O(n).",
    estimatedSkillLevel: 30,
  },
  {
    id: "dsa-linked-lists-01",
    topic: "Linked Lists",
    subtopic: "Pointer Traversal",
    conceptTested: "Sequential node referencing",
    difficulty: "Intermediate",
    prompt: "How do you reach the k-th node in a singly linked list?",
    options: [
      "Use direct index lookup",
      "Follow next pointers sequentially from head",
      "Sort the list first",
      "Calculate its array offset",
    ],
    correctOption: 1,
    explanation:
      "Because linked list nodes are allocated dynamically throughout memory without contiguous ordering, reaching the k-th node requires traversing k-1 next pointers from the head.",
    misconception: "Assuming linked lists support constant-time random indexing like arrays.",
    estimatedSkillLevel: 45,
  },
  {
    id: "dsa-stacks-01",
    topic: "Stacks",
    subtopic: "LIFO Ordering",
    conceptTested: "Last-In First-Out element access",
    difficulty: "Foundational",
    prompt: "A stack receives push(A), push(B), then push(C). Which item is returned by the next pop()?",
    options: ["A", "B", "C", "All three items"],
    correctOption: 2,
    explanation:
      "Stacks operate under the Last-In First-Out (LIFO) principle. Since C was pushed most recently, it sits at the top of the stack and is popped first.",
    misconception: "Confusing stack LIFO with queue FIFO (which would have returned A).",
    estimatedSkillLevel: 35,
  },
  {
    id: "dsa-queues-01",
    topic: "Queues",
    subtopic: "FIFO Ordering",
    conceptTested: "First-In First-Out element sequencing",
    difficulty: "Foundational",
    prompt: "Which statement best describes a standard FIFO queue?",
    options: [
      "Last in, first out",
      "First in, first out",
      "Items are always stored in sorted order",
      "Items are dequeued strictly by numeric priority",
    ],
    correctOption: 1,
    explanation:
      "A standard queue maintains First-In, First-Out (FIFO) semantics, where items are enqueued at the tail and dequeued from the head in arrival order.",
    misconception: "Confusing standard FIFO queues with priority queues or stacks.",
    estimatedSkillLevel: 35,
  },
  {
    id: "dsa-trees-01",
    topic: "Trees",
    subtopic: "Binary Search Tree Traversal",
    conceptTested: "In-order traversal invariants",
    difficulty: "Intermediate",
    prompt: "Which traversal visits the values of a binary search tree in monotonically sorted order?",
    options: ["Preorder traversal", "Level-order traversal", "Inorder traversal", "Postorder traversal"],
    correctOption: 2,
    explanation:
      "In a BST, all left descendants are smaller than the node, and all right descendants are larger. Traversing Left -> Root -> Right (Inorder) guarantees ascending sorted order.",
    misconception: "Confusing preorder (Root-Left-Right) with sorted retrieval.",
    estimatedSkillLevel: 60,
  },
  {
    id: "dsa-hashing-01",
    topic: "Hashing",
    subtopic: "Collision Resolution",
    conceptTested: "Pigeonhole principle in bucket mapping",
    difficulty: "Intermediate",
    prompt: "What happens when two different keys hash to the exact same bucket index in a hash table?",
    options: [
      "The table becomes automatically sorted",
      "A collision occurs and must be resolved (e.g. chaining or open addressing)",
      "The older key is automatically overwritten and lost",
      "The hash table automatically re-indexes into a binary tree",
    ],
    correctOption: 1,
    explanation:
      "Hash functions map a large key space to a finite bucket array. When two distinct keys produce the same bucket index, a collision occurs, requiring chaining or probing.",
    misconception: "Believing hash functions are guaranteed to be 100% collision-free in practice.",
    estimatedSkillLevel: 55,
  },
  {
    id: "dsa-graphs-01",
    topic: "Graphs",
    subtopic: "Breadth-First Search",
    conceptTested: "Shortest-path in unweighted graphs",
    difficulty: "Advanced",
    prompt: "Which graph traversal is guaranteed to find the shortest path between two vertices in an unweighted graph?",
    options: [
      "Depth-first search (DFS)",
      "Breadth-first search (BFS)",
      "Binary search",
      "Post-order traversal",
    ],
    correctOption: 1,
    explanation:
      "BFS visits vertices in order of increasing distance (edges) from the source node using a queue. The first time the destination node is encountered, the path is guaranteed to have minimum edges.",
    misconception: "Thinking DFS finds shortest path (DFS explores deeply along one branch and may find long sub-optimal paths).",
    estimatedSkillLevel: 75,
  },
  {
    id: "dsa-sorting-01",
    topic: "Sorting / Searching",
    subtopic: "Binary Search Preconditions",
    conceptTested: "Monotonicity invariant requirement",
    difficulty: "Intermediate",
    prompt: "What prerequisite must be satisfied before binary search can be applied to a collection?",
    options: [
      "The elements must be sorted in monotonic order",
      "The collection must contain only unique elements",
      "The collection must be implemented as a linked list",
      "The collection length must be an exact power of two",
    ],
    correctOption: 0,
    explanation:
      "Binary search relies on the invariant that comparing the target against a midpoint allows eliminating half the search space, which requires the elements to be sorted.",
    misconception: "Believing binary search works on unsorted arrays by searching in halves.",
    estimatedSkillLevel: 50,
  },
];

export const CANONICAL_QUESTIONS = BASELINE_ASSESSMENT_QUESTIONS;

/**
 * Retrieves the best matching question from the deterministic bank.
 */
export function getFallbackQuestion(
  targetTopic?: string,
  targetDifficulty?: string,
  excludeIds: string[] = []
): AssessmentQuestion {
  const available = BASELINE_ASSESSMENT_QUESTIONS.filter(
    (q) => !q.id || !excludeIds.includes(q.id)
  );

  const pool = available.length > 0 ? available : BASELINE_ASSESSMENT_QUESTIONS;

  if (targetTopic) {
    const topicMatch = pool.find(
      (q) => q.topic.toLowerCase() === targetTopic.toLowerCase()
    );
    if (topicMatch) return topicMatch;
  }

  if (targetDifficulty) {
    const diffMatch = pool.find(
      (q) => q.difficulty.toLowerCase() === targetDifficulty.toLowerCase()
    );
    if (diffMatch) return diffMatch;
  }

  return pool[0];
}
