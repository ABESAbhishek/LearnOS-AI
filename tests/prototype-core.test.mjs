import test from "node:test";
import assert from "node:assert/strict";
import { clearLearningState, LEARNING_STORAGE_KEY, loadLearningState, saveLearningState } from "../src/lib/learning-persistence.ts";
import { estimateMasteryFromEvidence, isValidAnswerSelection, upsertLearningEvidence } from "../src/lib/mastery-estimation.ts";
import { awardLearningEvent, INITIAL_GAMIFICATION_STATE, weeklyActiveDays } from "../src/lib/reward-rules.ts";
import { buildBaselineNoteContent, validateGeneratedNoteContent } from "../src/lib/note2learn.ts";
import { buildCourseBaselineAssessmentQuestions } from "../src/lib/assessment-bank.ts";
import { BASELINE_DSA_COURSE } from "../src/types/course.ts";
import { getFallbackTutorExplanation } from "../src/types/tutor.ts";
import { isPlainRecord, validateAdaptPlanInput, validateTopicInputs, validateTutorExplainInput } from "../src/lib/api-validation.ts";
import { protectAPIRequest, readLimitedFormData, readLimitedJSON, resetRateLimitWindowsForTests, RequestBodyError } from "../src/lib/api-protection.ts";
import { readLimitedResponseText } from "../src/lib/ai/response-reader.ts";
import { getDailyQuests } from "../src/lib/daily-quests.ts";
import { normalizeProfilePreferences, DEFAULT_PROFILE_PREFERENCES } from "../src/lib/profile-persistence.ts";

function makeFallback() {
  const topics = [{
    name: "Graphs",
    subtopics: ["Breadth-first search", "Depth-first search"],
    difficulty: "Intermediate",
    prerequisites: [],
    importance: "High",
    studyOrder: 1,
    frequency: 5,
  }];
  return {
    version: 1,
    courseModel: { courseName: "DSA", description: "Demo", topics, totalTopics: 1, totalSubtopics: 2, highPriorityCount: 1 },
    learningGoal: "",
    analysisSource: "baseline",
    assessmentSource: "baseline",
    tutorSource: "baseline",
    planSource: "baseline",
    knowledgeScores: { Graphs: 50 },
    masteryBaseline: { Graphs: 50 },
    evidence: [],
    assessmentHistory: [],
    syllabusAnalyzed: true,
    uploadedMaterialsCount: 0,
    assessmentCompleted: false,
    tutorPracticeCompleted: false,
    lessonCompletedTopics: [],
    planAdapted: false,
    planTasks: [{ id: "task-1", title: "Review graphs", detail: "Trace a small graph", duration: "10 min", kind: "Warm up", done: false }],
    isSampleData: true,
    noteItems: [],
    gamification: { ...INITIAL_GAMIFICATION_STATE },
  };
}

class MemoryStorage {
  values = new Map();
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, value); }
  removeItem(key) { this.values.delete(key); }
}

function evidence(overrides = {}) {
  return {
    eventId: "event-1",
    activityId: "assessment-1",
    kind: "assessment",
    questionId: "q-1",
    topic: "Graphs",
    selectedOption: 0,
    correct: true,
    recordedAt: "2026-10-24T10:00:00.000Z",
    ...overrides,
  };
}

test("persistence saves, reloads, and clears only the LearnOS key", () => {
  const storage = new MemoryStorage();
  storage.setItem("learnos_student_auth", "keep-me");
  const state = makeFallback();
  assert.equal(saveLearningState(storage, state), true);
  assert.equal(loadLearningState(storage, state).status, "loaded");
  assert.equal(loadLearningState(storage, state).state.courseModel.courseName, "DSA");
  assert.equal(clearLearningState(storage), true);
  assert.equal(storage.getItem(LEARNING_STORAGE_KEY), null);
  assert.equal(storage.getItem("learnos_student_auth"), "keep-me");
});

test("persistence migrates v0 data and drops scores/evidence for unknown course topics", () => {
  const fallback = makeFallback();
  const migrated = loadLearningState({ getItem: () => JSON.stringify({
    ...fallback,
    version: 0,
    knowledgeScores: { Graphs: 73, "Injected topic": 99 },
    evidence: [evidence({ topic: "Injected topic" }), evidence({ eventId: "known", topic: "Graphs" })],
  }), setItem() {}, removeItem() {} }, fallback);
  assert.equal(migrated.status, "migrated");
  assert.deepEqual(migrated.state.knowledgeScores, { Graphs: 73 });
  assert.equal(migrated.state.evidence.length, 0, "v0 evidence is intentionally not trusted during migration");
});

test("legacy plan checkbox state is cleared because it was not tied to verified activity", () => {
  const fallback = makeFallback();
  const loaded = loadLearningState({
    getItem: () => JSON.stringify({ ...fallback, planTasks: [{ ...fallback.planTasks[0], done: true }] }),
    setItem() {},
    removeItem() {},
  }, fallback);
  assert.equal(loaded.status, "loaded");
  assert.equal(loaded.state.planTasks[0].done, false);
});

test("evidence scores are bounded and replacing an answer does not stack its effect", () => {
  const correct = evidence();
  const once = estimateMasteryFromEvidence({ Graphs: 50 }, [correct]).Graphs;
  const replaced = upsertLearningEvidence([correct], evidence({ correct: false, selectedOption: 1 }));
  const afterReplacement = estimateMasteryFromEvidence({ Graphs: 50 }, replaced).Graphs;
  assert.equal(once, 52);
  assert.equal(afterReplacement, 48);
  const many = Array.from({ length: 40 }, (_, index) => evidence({ eventId: `e-${index}`, questionId: `q-${index}` }));
  assert.equal(estimateMasteryFromEvidence({ Graphs: 50 }, many).Graphs, 58);
  assert.equal(isValidAnswerSelection("Graphs", 3, 4, ["Graphs"]), true);
  assert.equal(isValidAnswerSelection("Graphs", 4, 4, ["Graphs"]), false);
  assert.equal(isValidAnswerSelection("Other", 0, 4, ["Graphs"]), false);
});

test("rewards are idempotent, count local activity days, and award reached milestones", () => {
  const event = { id: "lesson:graphs:1", kind: "lesson", localDate: "2026-10-20", badge: "Lesson complete" };
  const first = awardLearningEvent({ ...INITIAL_GAMIFICATION_STATE, xp: 90, currentStreak: 1, lastActivityDate: "2026-10-19" }, event);
  const duplicate = awardLearningEvent(first.state, event);
  assert.equal(first.xpAwarded, 20);
  assert.equal(first.state.currentStreak, 2);
  assert.ok(first.state.badges.includes("100 XP milestone"));
  assert.equal(duplicate.xpAwarded, 0);
  assert.equal(duplicate.duplicate, true);
  assert.equal(weeklyActiveDays(["2026-10-19", "2026-10-20", "2026-10-26"], "2026-10-21"), 2);
});

test("daily quests are derived from dated evidence and only become claimable at their threshold", () => {
  const state = {
    evidence: [evidence({ eventId: "today-1", recordedAt: "2026-10-24T10:00:00.000Z" }), evidence({ eventId: "today-2", recordedAt: "2026-10-24T10:01:00.000Z" })],
    assessmentHistory: [],
    noteItems: [],
    gamification: { ...INITIAL_GAMIFICATION_STATE },
  };
  const quests = getDailyQuests(state, "2026-10-24");
  const practiceQuest = quests.find((quest) => quest.id === "practice-three");
  assert.equal(practiceQuest.progress, 2);
  assert.equal(practiceQuest.complete, false);
  const completed = getDailyQuests({ ...state, evidence: [...state.evidence, evidence({ eventId: "today-3", recordedAt: "2026-10-24T10:02:00.000Z" })] }, "2026-10-24");
  assert.equal(completed.find((quest) => quest.id === "practice-three").complete, true);
  assert.equal(completed.find((quest) => quest.id === "diagnostic").complete, false);
});

test("local profile preferences accept only supported avatar options and bounded interests", () => {
  const normalized = normalizeProfilePreferences({ avatarIcon: "unknown", avatarColor: "blue", interests: [" Algorithms ", "Algorithms", "x".repeat(90)] });
  assert.equal(normalized.avatarIcon, DEFAULT_PROFILE_PREFERENCES.avatarIcon);
  assert.equal(normalized.avatarColor, "blue");
  assert.deepEqual(normalized.interests, ["Algorithms", "x".repeat(48)]);
});

test("Note2Learn baseline and generated content validation stay within schema bounds", () => {
  const content = buildBaselineNoteContent("A graph connects vertices with edges. Breadth-first search explores nearby vertices first.", "Graph_Notes.txt");
  assert.equal(validateGeneratedNoteContent(content), true);
  assert.equal(content.flashcards.length >= 3, true);
  assert.equal(content.quiz.length, 3);
  assert.equal(validateGeneratedNoteContent({ ...content, quiz: [] }), false);
});

test("Tutor fallback keeps the active topic and supplies a valid practice check", () => {
  const explanation = getFallbackTutorExplanation("Cell Biology");
  assert.equal(explanation.topic, "Cell Biology");
  assert.equal(explanation.practiceQuestion.options.length, 4);
  assert.equal(explanation.practiceQuestion.correctOption, 0);
});

test("course baseline assessment questions match the provided topic names", () => {
  const questions = buildCourseBaselineAssessmentQuestions([{ name: "Cell Biology", subtopics: ["Mitosis", "Cell membranes"] }]);
  assert.equal(questions.length, 8);
  assert.ok(questions.every((question) => question.topic === "Cell Biology"));
  assert.ok(questions.every((question) => question.options.length === 4 && question.correctOption >= 0 && question.correctOption < 4));
  const dsaQuestions = buildCourseBaselineAssessmentQuestions(BASELINE_DSA_COURSE.topics);
  const dsaTopicNames = new Set(BASELINE_DSA_COURSE.topics.map((topic) => topic.name.toLowerCase()));
  assert.ok(dsaQuestions.every((question) => dsaTopicNames.has(question.topic.toLowerCase())));
});

test("API validators reject malformed and out-of-bound inputs", () => {
  assert.equal(isPlainRecord([]), false);
  assert.equal(validateTopicInputs([{ name: "Graphs", subtopics: ["BFS"], difficulty: "Intermediate" }]), true);
  assert.equal(validateTopicInputs([{ name: "" }]), false);
  assert.equal(validateTutorExplainInput({ topic: "Graphs", mastery: 40, stage: 2 }), true);
  assert.equal(validateTutorExplainInput({ topic: "Graphs", mastery: 101 }), false);
  assert.equal(validateAdaptPlanInput({ topics: ["Graphs"], weakTopics: ["Graphs"], knowledgeScores: { Graphs: 45 } }), true);
  assert.equal(validateAdaptPlanInput({ topics: ["Graphs"], weakTopics: ["Injected topic"] }), false);
});

test("API protection checks origin, rate limits, JSON sizes, and bounded multipart parsing", async () => {
  resetRateLimitWindowsForTests();
  const sameOrigin = () => new Request("http://localhost/api/check", { method: "POST", headers: { origin: "http://localhost", "x-forwarded-for": "127.0.0.1" } });
  const options = { key: "test", limit: 1, maxBodyBytes: 32, now: 1000 };
  assert.equal(protectAPIRequest(sameOrigin(), options), null);
  assert.equal(protectAPIRequest(sameOrigin(), options).status, 429);
  assert.equal(protectAPIRequest(new Request("http://localhost/api/check", { method: "POST", headers: { origin: "http://elsewhere" } }), { ...options, key: "origin" }).status, 403);

  const jsonRequest = new Request("http://localhost/api/check", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ok: true }),
  });
  assert.deepEqual(await readLimitedJSON(jsonRequest, 32), { ok: true });
  const largeRequest = new Request("http://localhost/api/check", {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ content: "x".repeat(100) }),
  });
  await assert.rejects(() => readLimitedJSON(largeRequest, 32), RequestBodyError);

  const form = new FormData();
  form.set("topic", "Graphs");
  const parsed = await readLimitedFormData(new Request("http://localhost/api/check", { method: "POST", body: form }), 1024);
  assert.equal(parsed.get("topic"), "Graphs");
});

test("AI provider response reader enforces an output byte cap", async () => {
  await assert.rejects(() => readLimitedResponseText(new Response("x".repeat(100)), 32), /size limit/);
  assert.equal(await readLimitedResponseText(new Response("{\"ok\":true}"), 32), "{\"ok\":true}");
});
