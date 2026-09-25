import type { CourseModel } from "@/types/course";
import type { AssessmentEvidence, AssessmentQuestion } from "@/types/assessment";
import type { TopicDifficulty } from "@/types/course";
import { BASELINE_ASSESSMENT_QUESTIONS } from "@/lib/assessment-bank";

export const CANONICAL_DSA_SCORES: Record<string, number> = {
  Arrays: 91,
  "Linked Lists": 83,
  Stacks: 76,
  Queues: 69,
  Trees: 58,
  Hashing: 47,
  Graphs: 31,
  "Sorting / Searching": 70,
};

export interface TargetDiagnosticPlan {
  topic: string;
  subtopic: string;
  difficulty: TopicDifficulty;
  conceptToTest: string;
  rationale: string;
}

export interface DiagnosticAssessmentState {
  currentQuestionIndex: number;
  totalQuestions: number;
  evidence: AssessmentEvidence[];
  scores: Record<string, number>;
  primaryGap: string;
  priorityTopic: string;
  focusAreas: string[];
}

/**
 * Deterministically decides the next diagnostic target topic and difficulty based on cumulative evidence.
 */
export function selectNextAdaptiveTarget(
  courseModel: CourseModel,
  evidence: AssessmentEvidence[],
  questionIndex: number
): TargetDiagnosticPlan {
  const topics: Array<{
    name: string;
    subtopics: string[];
    difficulty: TopicDifficulty;
    prerequisites: string[];
  }> = courseModel.topics.length > 0
    ? courseModel.topics
    : [
        { name: "Arrays", subtopics: ["Indexing", "Prefix sums"], difficulty: "Foundational", prerequisites: [] },
        { name: "Linked Lists", subtopics: ["Pointer manipulation"], difficulty: "Intermediate", prerequisites: ["Arrays"] },
        { name: "Stacks", subtopics: ["LIFO ordering"], difficulty: "Foundational", prerequisites: [] },
        { name: "Queues", subtopics: ["FIFO traversal"], difficulty: "Foundational", prerequisites: [] },
        { name: "Trees", subtopics: ["BST Inorder"], difficulty: "Intermediate", prerequisites: ["Linked Lists"] },
        { name: "Hashing", subtopics: ["Collision resolution"], difficulty: "Intermediate", prerequisites: ["Arrays"] },
        { name: "Graphs", subtopics: ["BFS & DFS"], difficulty: "Advanced", prerequisites: ["Trees"] },
        { name: "Sorting / Searching", subtopics: ["Binary search"], difficulty: "Intermediate", prerequisites: ["Arrays"] },
      ];

  // If there's previous evidence, look at the most recent response
  const lastEvidence = evidence[evidence.length - 1];

  // Map of topics already assessed
  const assessedTopics = new Set(evidence.map((e) => e.topic.toLowerCase()));

  // If the last answer was incorrect, test an easier or foundational prerequisite
  if (lastEvidence && !lastEvidence.correct) {
    const currentTopicObj = topics.find(
      (t) => t.name.toLowerCase() === lastEvidence.topic.toLowerCase()
    );

    // If prerequisite exists and unassessed, target the prerequisite
    if (currentTopicObj && currentTopicObj.prerequisites.length > 0) {
      const prereqName = currentTopicObj.prerequisites[0];
      const prereqTopic = topics.find((t) => t.name.toLowerCase() === prereqName.toLowerCase());
      if (prereqTopic && !assessedTopics.has(prereqName.toLowerCase())) {
        return {
          topic: prereqTopic.name,
          subtopic: prereqTopic.subtopics[0] || "Foundational concepts",
          difficulty: "Foundational",
          conceptToTest: `Foundational dependency for ${lastEvidence.topic}`,
          rationale: `Student struggled with ${lastEvidence.topic}; validating prerequisite understanding in ${prereqTopic.name}.`,
        };
      }
    }
  }

  // Find next unassessed topic from course syllabus
  const unassessed = topics.find((t) => !assessedTopics.has(t.name.toLowerCase()));
  if (unassessed) {
    const subtopic = unassessed.subtopics[0] || "Core principles";
    return {
      topic: unassessed.name,
      subtopic,
      difficulty: unassessed.difficulty || "Foundational",
      conceptToTest: `Core understanding of ${unassessed.name}`,
      rationale: `Systematic diagnostic coverage for curriculum topic #${questionIndex + 1}.`,
    };
  }

  // If all topics have been visited once, probe the lowest confidence topic for deeper gap diagnosis
  const defaultTopic = topics[questionIndex % topics.length];
  return {
    topic: defaultTopic.name,
    subtopic: defaultTopic.subtopics[0] || "Advanced synthesis",
    difficulty: "Advanced",
    conceptToTest: `Advanced mastery verification in ${defaultTopic.name}`,
    rationale: `Deep diagnostic probe to test upper skill boundary.`,
  };
}

/**
 * Computes updated student mastery profile dynamically from evidence.
 */
export function computeDiagnosticScores(
  initialScores: Record<string, number>,
  evidence: AssessmentEvidence[]
): {
  scores: Record<string, number>;
  primaryGap: string;
  priorityTopic: string;
  focusAreas: string[];
} {
  const scores: Record<string, number> = { ...initialScores };

  evidence.forEach((ev) => {
    const prev = scores[ev.topic] ?? 60;
    let delta = 0;

    if (ev.correct) {
      // Reward correct answer weighted by difficulty
      delta = ev.difficulty === "Advanced" ? 6 : ev.difficulty === "Intermediate" ? 4 : 2;
    } else {
      // Penalize incorrect answer weighted by difficulty
      delta = ev.difficulty === "Foundational" ? -8 : ev.difficulty === "Intermediate" ? -5 : -3;
    }

    scores[ev.topic] = Math.max(15, Math.min(98, prev + delta));
  });

  // Identify lowest performing topic
  let lowestTopic = "Graphs";
  let lowestScore = 100;

  Object.entries(scores).forEach(([topic, val]) => {
    if (val < lowestScore) {
      lowestScore = val;
      lowestTopic = topic;
    }
  });

  const priorityTopic = lowestTopic;
  const primaryGap =
    priorityTopic === "Graphs"
      ? "BFS / DFS traversal & shortest-path exploration"
      : priorityTopic === "Hashing"
      ? "Hash table collision resolution & load balancing"
      : priorityTopic === "Trees"
      ? "Binary search tree invariants and recursive traversals"
      : `${priorityTopic} structure and application constraints`;

  const focusAreas =
    priorityTopic === "Graphs"
      ? ["BFS", "DFS", "Graph Applications"]
      : priorityTopic === "Hashing"
      ? ["Chaining", "Open Addressing", "Hash Functions"]
      : priorityTopic === "Trees"
      ? ["Tree Traversal", "BST Invariants", "Height Balancing"]
      : ["Foundational Mechanics", "Edge Cases", "Complexities"];

  return {
    scores,
    primaryGap,
    priorityTopic,
    focusAreas,
  };
}

/**
 * Fallback diagnostic questions resolver for the entire assessment suite.
 */
export function getBaselineDiagnosticQuestion(index: number): AssessmentQuestion {
  return BASELINE_ASSESSMENT_QUESTIONS[index % BASELINE_ASSESSMENT_QUESTIONS.length];
}
