import { Type } from "@google/genai";

/**
 * Dedicated system instruction for syllabus analysis.
 */
export const SYLLABUS_ANALYSIS_SYSTEM_INSTRUCTION = `You are the syllabus analysis engine inside LearnOS AI.
Analyze the supplied educational material.
Your task is to transform unstructured course material into a structured learning model.

Identify:
- courseName: The canonical title of the subject/course (e.g. "Data Structures and Algorithms", "Operating Systems", "Microeconomics")
- description: Concise 1-2 sentence overview of what this curriculum encompasses
- topics: An array of 4 to 12 major topic areas identified directly from the material.

For each topic provide:
- name: Clear, concise title of the topic
- subtopics: Array of 2 to 6 specific concepts or subtopics covered in this topic
- difficulty: One of "Foundational", "Intermediate", or "Advanced"
- prerequisites: Array of prerequisite topic names from this course (or foundational skills)
- importance: One of "High", "Medium", or "Low"
- studyOrder: Logical 1-based sequential ordering for a student to master this course
- frequency: Estimated relative question frequency or weight on exams (integer between 1 and 10)

Strict Rules:
- Only use information reasonably supported by the supplied material.
- Do not invent unrelated topics.
- If prerequisites or importance cannot be confidently inferred, use conservative values rather than hallucinating.
- Return only valid JSON conforming strictly to the requested schema.`;

/**
 * Structured schema definition for Gemini generateContent responseSchema.
 */
export const COURSE_MODEL_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    courseName: {
      type: Type.STRING,
      description: "Official or inferred name of the course or subject",
    },
    description: {
      type: Type.STRING,
      description: "Concise 1-2 sentence summary of the course scope",
    },
    topics: {
      type: Type.ARRAY,
      description: "List of major topic areas extracted from the syllabus material",
      items: {
        type: Type.OBJECT,
        properties: {
          name: {
            type: Type.STRING,
            description: "Title of the topic",
          },
          subtopics: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "List of concepts or subtopics",
          },
          difficulty: {
            type: Type.STRING,
            enum: ["Foundational", "Intermediate", "Advanced"],
            description: "Difficulty classification",
          },
          prerequisites: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Prerequisite topic titles",
          },
          importance: {
            type: Type.STRING,
            enum: ["High", "Medium", "Low"],
            description: "Relative exam/curriculum importance",
          },
          studyOrder: {
            type: Type.INTEGER,
            description: "1-based logical learning order",
          },
          frequency: {
            type: Type.INTEGER,
            description: "Estimated exam/test frequency weight from 1 to 10",
          },
        },
        required: [
          "name",
          "subtopics",
          "difficulty",
          "prerequisites",
          "importance",
          "studyOrder",
        ],
      },
    },
  },
  required: ["courseName", "topics"],
};

/**
 * Dedicated system instruction for adaptive diagnostic question generation.
 */
export const ASSESSMENT_QUESTION_SYSTEM_INSTRUCTION = `You are the diagnostic assessment engine inside LearnOS AI.
Your role is to construct targeted diagnostic multiple-choice questions to identify a student's true understanding and diagnose conceptual misconceptions.

Guidelines:
- Generate ONE diagnostic multiple-choice question tailored strictly to the specified course, topic, subtopic, and difficulty.
- Provide exactly 4 options.
- The correct option must be accurate, unambiguous, and conceptually sound.
- The 3 distractor options must reflect common student misconceptions or typical errors, not absurd choices.
- Include a concise explanation of why the correct option is right and what misconception the incorrect options address.
- Ground the question solely in the educational subject provided. Do not generate unrelated trivia.
- Return only valid JSON adhering strictly to the schema.`;

/**
 * Structured schema definition for AssessmentQuestion.
 */
export const ASSESSMENT_QUESTION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    id: { type: Type.STRING, description: "Unique identifier for the question" },
    topic: { type: Type.STRING, description: "Major topic being assessed" },
    subtopic: { type: Type.STRING, description: "Specific subtopic tested" },
    conceptTested: { type: Type.STRING, description: "Key conceptual skill or theorem tested" },
    difficulty: {
      type: Type.STRING,
      enum: ["Foundational", "Intermediate", "Advanced"],
      description: "Difficulty tier",
    },
    prompt: { type: Type.STRING, description: "The diagnostic question statement or code snippet" },
    options: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Array of exactly 4 plausible multiple-choice options",
    },
    correctOption: {
      type: Type.INTEGER,
      description: "0-based index of the single correct option (0, 1, 2, or 3)",
    },
    explanation: { type: Type.STRING, description: "Pedagogical explanation of why this answer is correct" },
    misconception: { type: Type.STRING, description: "Identified student misconception if a distractor is chosen" },
    estimatedSkillLevel: { type: Type.INTEGER, description: "Target student skill rating (1-100)" },
  },
  required: [
    "id",
    "topic",
    "subtopic",
    "conceptTested",
    "difficulty",
    "prompt",
    "options",
    "correctOption",
    "explanation",
  ],
};

/**
 * Dedicated system instruction for batch diagnostic assessment generation.
 */
export const BATCH_ASSESSMENT_SYSTEM_INSTRUCTION = `You are the diagnostic assessment engine inside LearnOS AI.
Your role is to construct a balanced diagnostic assessment consisting of EXACTLY 8 multiple-choice questions grounded strictly in the provided syllabus and topics.
The purpose of these questions is diagnosis: to identify what the student understands and where the student's conceptual gaps and misconceptions are.

Guidelines:
- Generate EXACTLY 8 multiple-choice questions in the "questions" array.
- Ground all questions strictly in the supplied course syllabus and topics.
- Distribute questions across the course topics so that diverse topics from the curriculum are covered.
- Vary difficulties across Foundational, Intermediate, and Advanced.
- Each question MUST have:
  - topic: the specific topic name from the syllabus being tested
  - subtopic: the specific subtopic or concept tested
  - difficulty: "Foundational", "Intermediate", or "Advanced"
  - prompt: clear, unambiguous diagnostic question statement or problem
  - options: array of EXACTLY 4 plausible options
  - correctOption: 0-based integer index (0, 1, 2, or 3) of the correct answer
  - explanation: concise explanation of why the correct option is right
- The 3 distractor options should reflect common student misconceptions or edge-case oversights.
- Return ONLY valid JSON adhering strictly to the schema.`;

/**
 * Structured schema definition for batch assessment generation.
 */
export const BATCH_ASSESSMENT_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    questions: {
      type: Type.ARRAY,
      description: "Array of exactly 8 multiple-choice diagnostic questions",
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "Unique question id" },
          topic: { type: Type.STRING, description: "Topic from syllabus" },
          subtopic: { type: Type.STRING, description: "Specific subtopic or concept" },
          difficulty: {
            type: Type.STRING,
            enum: ["Foundational", "Intermediate", "Advanced"],
            description: "Difficulty tier",
          },
          prompt: { type: Type.STRING, description: "Question statement" },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: "Exactly 4 options",
          },
          correctOption: {
            type: Type.INTEGER,
            description: "0-based index of correct option (0, 1, 2, or 3)",
          },
          explanation: { type: Type.STRING, description: "Pedagogical explanation" },
        },
        required: ["topic", "difficulty", "prompt", "options", "correctOption"],
      },
    },
  },
  required: ["questions"],
};

/**
 * Dedicated system instruction for personalized AI Tutor explanation.
 */
export const TUTOR_EXPLAIN_SYSTEM_INSTRUCTION = `You are the AI Tutor inside LearnOS AI.
Your task is to teach and remediate a specific conceptual gap for a student struggling with a particular topic.

Follow these strict pedagogical requirements:
1. topic: The canonical topic or concept being taught (e.g. "Graph Traversal", "Binary Search Trees", "Hash Collisions").
2. intuition: Exactly one clear, vivid, beginner-friendly analogy or intuitive explanation (e.g. ripples in water for BFS, index in a book for binary search). Keep it accessible and encouraging.
3. keyPoints: Array of 3 to 5 core takeaway principles or golden rules the student must remember.
4. visualSteps: Array of 3 to 4 sequential steps suitable for an interactive stepper diagram showing the process step-by-step. Each step must have a concise 'title' and explanatory 'description'.
5. practiceQuestion: Exactly ONE diagnostic check-for-understanding multiple-choice question testing the core intuition:
   - prompt: Clear question statement
   - options: Array of EXACTLY 4 plausible options
   - correctOption: 0-based integer index (0, 1, 2, or 3) of the correct answer

Rules:
- All content must be directly grounded in the provided topic and weak areas.
- Do not introduce unrelated concepts.
- Do not return markdown formatted code blocks or prose; return JSON only conforming strictly to the requested schema.`;

/**
 * Structured schema definition for Tutor explanation generation.
 */
export const TUTOR_EXPLAIN_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    topic: { type: Type.STRING, description: "Name of the topic taught" },
    intuition: { type: Type.STRING, description: "One beginner-friendly intuitive analogy" },
    keyPoints: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "3 to 5 key learning principles",
    },
    visualSteps: {
      type: Type.ARRAY,
      description: "3 to 4 sequential steps for the visual stepper",
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Step title" },
          description: { type: Type.STRING, description: "Step explanation" },
        },
        required: ["title", "description"],
      },
    },
    practiceQuestion: {
      type: Type.OBJECT,
      properties: {
        prompt: { type: Type.STRING, description: "Multiple-choice question prompt" },
        options: {
          type: Type.ARRAY,
          items: { type: Type.STRING },
          description: "Array of exactly 4 options",
        },
        correctOption: {
          type: Type.INTEGER,
          description: "0-based integer index of correct option (0, 1, 2, or 3)",
        },
      },
      required: ["prompt", "options", "correctOption"],
    },
  },
  required: ["topic", "intuition", "keyPoints", "visualSteps", "practiceQuestion"],
};

/**
 * Dedicated system instruction for adaptive study plan generation.
 */
export const ADAPT_PLAN_SYSTEM_INSTRUCTION = `You are the adaptive study planning engine inside LearnOS AI.
Your role is to construct a personalized, targeted daily study plan consisting of EXACTLY 4 actionable learning tasks.
The plan must be specifically tailored to the learner's current knowledge gaps, weakest topics, and recent performance.

Follow these strict pedagogical requirements:
1. Return EXACTLY 4 tasks representing a logical progression:
   - Task 1: Concept / Foundation (kind: "Warm up" or "Focus topic", ~10 min) - core definitions, memory layout, intuitive models.
   - Task 2: Guided Practice (kind: "Focus topic" or "Apply", ~15-20 min) - step-by-step tracing with visual/state checkpoints.
   - Task 3: Independent Practice (kind: "Apply", ~15 min) - writing or analyzing code with boundary conditions.
   - Task 4: Application / Challenge (kind: "Reinforce" or "Advanced", ~10-15 min) - synthesizing principles, optimization, or real-world problem solving.

2. Structure for each task:
   - id: Unique string identifier (e.g. "task-plan-1", "task-plan-2")
   - title: Clear, motivating task title (e.g. "Trace Breadth-First Search on a 2D Grid")
   - detail: Concrete, actionable instructions explaining what the learner will do
   - duration: Number of minutes (integer between 5 and 30)
   - kind: One of "Warm up", "Focus topic", "Apply", "Reinforce", "Advanced"
   - done: false (all tasks start incomplete)

3. Strictly avoid:
   - Do NOT produce fewer or more than 4 tasks.
   - Do NOT repeat the same task.
   - Ground tasks strictly in the learner's weak topics and current focus.
   - Do NOT output conversational prose or markdown code fences; return only valid JSON matching the requested schema.`;

/**
 * Structured schema definition for Study Plan generation.
 */
export const ADAPT_PLAN_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    tasks: {
      type: Type.ARRAY,
      description: "Array of exactly 4 sequential study tasks",
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "Unique task ID" },
          title: { type: Type.STRING, description: "Actionable task title" },
          detail: { type: Type.STRING, description: "Concrete task instructions" },
          duration: { type: Type.INTEGER, description: "Estimated duration in minutes (5-30)" },
          kind: {
            type: Type.STRING,
            enum: ["Warm up", "Focus topic", "Apply", "Reinforce", "Advanced"],
            description: "Category of learning activity",
          },
          done: { type: Type.BOOLEAN, description: "Must be false initially" },
        },
        required: ["id", "title", "detail", "duration", "kind", "done"],
      },
    },
  },
  required: ["tasks"],
};



