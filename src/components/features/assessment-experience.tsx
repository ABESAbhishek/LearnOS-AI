"use client";

import { useState, useEffect, useRef, useId, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, RotateCcw, Sparkles } from "lucide-react";
import { FeatureFrame, FeatureHeading, SectionLabel } from "@/components/features/feature-frame";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { ProgressBar } from "@/components/motion/progress-bar";
import { useLearning } from "@/context/learning-context";
import type { Question, AssessmentEvidence } from "@/types/assessment";
import type { TopicDifficulty } from "@/types/course";
import { buildCourseBaselineAssessmentQuestions, CANONICAL_QUESTIONS } from "@/lib/assessment-bank";
import { validateBatchQuestions } from "@/types/assessment";
import {
  estimateMasteryFromEvidence,
  isValidAnswerSelection,
} from "@/lib/mastery-estimation";
import styles from "./assessment-experience.module.css";

export function AssessmentExperience() {
  const {
    courseModel,
    knowledgeScores,
    assessmentSource,
    setAssessmentSource,
    recordLearningEvidence,
    completeAssessmentAttempt,
  } = useLearning();

  const [questions, setQuestions] = useState<Question[]>(() => buildCourseBaselineAssessmentQuestions(courseModel.topics));
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [evidenceList, setEvidenceList] = useState<AssessmentEvidence[]>([]);
  const [completedQuestions, setCompletedQuestions] = useState<Set<number>>(() => new Set());
  const [score, setScore] = useState(0);
  const [topicPerformance, setTopicPerformance] = useState<Record<string, number>>(knowledgeScores);
  const assessmentBaselineRef = useRef(knowledgeScores);
  const assessmentIdRef = useRef<string | null>(null);
  const assessmentInstanceId = useId();
  const assessmentAttemptRef = useRef(1);
  const [direction, setDirection] = useState<"next" | "previous">("next");
  const [complete, setComplete] = useState(false);
  const hasInteractedRef = useRef(false);

  const question = questions[questionIndex] || CANONICAL_QUESTIONS[0];
  const selectedAnswer = answers[questionIndex];
  const progress = ((questionIndex + 1) / questions.length) * 100;
  const overallUnderstanding = Math.round((score / (questions.length || 1)) * 100);
  const priorityTopic = Object.entries(topicPerformance).sort((a, b) => a[1] - b[1])[0]?.[0] || courseModel.topics[0]?.name || "Core Concepts";
  const prioritySubtopics = courseModel.topics.find((topic) => topic.name.toLowerCase() === priorityTopic.toLowerCase())?.subtopics || [];
  const primaryGap = prioritySubtopics.slice(0, 2).join(" and ") || `${priorityTopic} foundations and application`;

  const topicEntries = questions.map(({ topic }) => ({
    topic,
    mastery: topicPerformance[topic] ?? 60,
  }));
  const needsAttention = topicEntries.filter(({ mastery }) => mastery < 50).length;

  // Fetch 8 grounded diagnostic questions in batch from Gemini on mount
  useEffect(() => {
    let isMounted = true;

    fetch("/api/generate-assessment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        courseName: courseModel.courseName,
        topics: courseModel.topics.map((t) => ({
          name: t.name,
          subtopics: t.subtopics,
          difficulty: t.difficulty,
        })),
      }),
    })
      .then((r) => {
        if (!r.ok) throw new Error("API response not ok");
        return r.json();
      })
      .then((data) => {
        if (!isMounted) return;
        const source = ["baseline", "gemini", "groq", "cerebras"].includes(data?.source)
          ? data.source as "baseline" | "gemini" | "groq" | "cerebras"
          : "baseline";
        if (
          data &&
          Array.isArray(data.questions) &&
          data.questions.length === 8 &&
          validateBatchQuestions(data)
        ) {
          const allowedTopics = new Set(courseModel.topics.map((topic) => topic.name.toLowerCase()));
          const hasOnlyKnownTopics = data.questions.every((item: Question) => allowedTopics.has(item.topic.toLowerCase()));
          if (!hasOnlyKnownTopics) {
            setAssessmentSource("baseline");
            if (!hasInteractedRef.current) setQuestions(buildCourseBaselineAssessmentQuestions(courseModel.topics));
            return;
          }
          if (!hasInteractedRef.current) {
            setQuestions(data.questions);
            setAssessmentSource(source);
            setTopicPerformance(assessmentBaselineRef.current);
          }
        } else {
          setAssessmentSource("baseline");
          if (!hasInteractedRef.current) setQuestions(buildCourseBaselineAssessmentQuestions(courseModel.topics));
        }
      })
      .catch(() => {
        if (isMounted) {
          setAssessmentSource("baseline");
          if (!hasInteractedRef.current) setQuestions(buildCourseBaselineAssessmentQuestions(courseModel.topics));
        }
      });

    return () => {
      isMounted = false;
    };
  }, [courseModel, setAssessmentSource]);

  function recordAnswer(optionIndex: number) {
    const allowedTopics = courseModel.topics.map((topic) => topic.name);
    if (!isValidAnswerSelection(question.topic, optionIndex, question.options.length, allowedTopics)) return;
    hasInteractedRef.current = true;
    const activityId = assessmentIdRef.current || `assessment:${assessmentInstanceId}:${assessmentAttemptRef.current++}`;
    assessmentIdRef.current = activityId;
    const isCorrect = optionIndex === question.correctOption;
    const nextAnswers = { ...answers, [questionIndex]: optionIndex };
    const nextCompleted = new Set(completedQuestions);
    nextCompleted.add(questionIndex);

    const difficulty: TopicDifficulty =
      question.difficulty === "Advanced" || question.difficulty === "Intermediate"
        ? question.difficulty
        : "Foundational";

    const newEvidence: AssessmentEvidence = {
      questionId: question.id || `q-${questionIndex + 1}`,
      topic: question.topic,
      subtopic: question.subtopic || "Core Concepts",
      difficulty,
      selectedOption: optionIndex,
      correct: isCorrect,
    };

    const updatedEvidence = [
      ...evidenceList.filter((e) => e.questionId !== newEvidence.questionId),
      newEvidence,
    ];

    setAnswers(nextAnswers);
    setCompletedQuestions(nextCompleted);
    setEvidenceList(updatedEvidence);

    const learningEvidence = updatedEvidence.map((item) => ({
      eventId: `assessment:${activityId}:${item.questionId}`,
      activityId,
      kind: "assessment" as const,
      questionId: item.questionId,
      topic: item.topic,
      selectedOption: item.selectedOption,
      correct: item.correct,
      recordedAt: new Date().toISOString(),
    }));
    const estimatedScores = estimateMasteryFromEvidence(assessmentBaselineRef.current, learningEvidence);
    setTopicPerformance(estimatedScores);
    const currentQuestionId = newEvidence.questionId;
    recordLearningEvidence(learningEvidence.find((item) => item.questionId === currentQuestionId)!);

    setScore(
      questions.reduce((total, item, idx) => total + (nextAnswers[idx] === item.correctOption ? 1 : 0), 0)
    );
  }

  function goPrevious() {
    if (questionIndex === 0) return;
    setDirection("previous");
    setQuestionIndex((index) => index - 1);
  }

  function goNext() {
    if (selectedAnswer === undefined) return;
    if (questionIndex === questions.length - 1) {
      setComplete(true);
      const attemptedCount = Object.keys(answers).length;
      const correctCount = questions.reduce((total, item, index) => total + (answers[index] === item.correctOption ? 1 : 0), 0);
      const attemptId = assessmentIdRef.current || `assessment:${assessmentInstanceId}:${assessmentAttemptRef.current++}`;
      assessmentIdRef.current = attemptId;
      completeAssessmentAttempt({
        id: attemptId,
        completedAt: new Date().toISOString(),
        questionCount: questions.length,
        attemptedCount,
        correctCount,
      });
      return;
    }
    setDirection("next");
    setQuestionIndex((index) => index + 1);
  }

  function restartAssessment() {
    hasInteractedRef.current = false;
    assessmentIdRef.current = null;
    assessmentBaselineRef.current = knowledgeScores;
    setQuestionIndex(0);
    setAnswers({});
    setEvidenceList([]);
    setCompletedQuestions(new Set());
    setScore(0);
    setTopicPerformance(knowledgeScores);
    setDirection("next");
    setComplete(false);
  }

  return (
    <FeatureFrame activeHref="/assessment">
      <FeatureHeading
        eyebrow="02 / Assess"
        title={complete ? "Your learning profile is taking shape." : "Let's understand what you already know."}
        description={
          complete
            ? "Your responses have helped LearnOS see where understanding feels strong and where focused practice could make a difference."
              : "Answer a few targeted questions. Each response adds a small, bounded signal to your topic-level learning profile."
        }
        aside={
          <div className="min-w-48 rounded-xl border border-border bg-surface/50 px-3.5 py-2.5">
            <span className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-muted">
              {assessmentSource !== "baseline" ? (
                <>
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>AI Diagnostic</span>
                </>
              ) : (
                <span>Diagnostic Assessment</span>
              )}
            </span>
            <span className="mt-1 block text-xs font-medium">
              {complete ? `${questions.length} questions complete` : `Question ${questionIndex + 1} of ${questions.length}`}
            </span>
          </div>
        }
      />

      {!complete ? (
        <div className="mx-auto grid max-w-6xl items-start gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
          <aside className="panel order-2 p-5 sm:p-6 lg:order-1" aria-label="Assessment topic progress">
            <div className="flex items-end justify-between gap-3">
              <div>
                <SectionLabel>Diagnostic assessment</SectionLabel>
                <p className="mt-2 text-sm font-medium">
                  Question {questionIndex + 1} of {questions.length}
                </p>
              </div>
              <span className="font-mono text-xs text-accent">{progress.toFixed(1)}%</span>
            </div>
            <div className="mt-4">
              <ProgressBar value={progress} label="Diagnostic assessment progress" className="h-1.5" />
            </div>
            <p className="mt-3 text-xs leading-5 text-muted">
              Your responses provide early topic-level signals. A single answer cannot move mastery by more than a small amount.
            </p>
            <div className="mt-6 border-t border-border pt-5">
              <SectionLabel>Topics in this check-in</SectionLabel>
              <ol className="mt-3 grid grid-cols-2 gap-x-2 gap-y-2 text-xs lg:grid-cols-1">
                {questions.map((item, index) => {
                  const isCurrent = index === questionIndex;
                  const isComplete = completedQuestions.has(index);
                  return (
                    <li
                      key={`${item.topic}-${index}`}
                      className={`flex min-w-0 items-center gap-2 rounded-lg px-2 py-1.5 transition-colors ${
                        isCurrent ? "bg-accent-soft/70 font-medium text-accent" : "text-muted"
                      }`}
                      aria-current={isCurrent ? "step" : undefined}
                    >
                      <span
                        className={`grid size-5 shrink-0 place-items-center rounded-full border text-[9px] ${
                          isComplete
                            ? "border-accent bg-accent-soft text-accent"
                            : isCurrent
                            ? "border-accent text-accent"
                            : "border-border"
                        }`}
                        aria-hidden="true"
                      >
                        {isComplete ? <Check size={11} /> : String(index + 1).padStart(2, "0")}
                      </span>
                      <span className="truncate">{item.topic}</span>
                    </li>
                  );
                })}
              </ol>
            </div>
          </aside>

          <section className="panel order-1 p-5 sm:p-8 lg:order-2" aria-label="Diagnostic question">
            <div
              key={questionIndex}
              className={`${styles.questionTransition} ${
                direction === "next" ? styles.enterNext : styles.enterPrevious
              }`}
              data-direction={direction}
            >
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-5">
                <div>
                  <SectionLabel>Question {String(questionIndex + 1).padStart(2, "0")}</SectionLabel>
                  <span className="mt-2 block text-[11px] font-semibold uppercase tracking-[0.15em] text-accent">
                    {question.topic}
                    {question.subtopic ? (
                      <>
                        {" "}
                        <span className="text-border px-1">/</span> {question.subtopic}
                      </>
                    ) : null}
                  </span>
                </div>
                <span className="rounded-md border border-border px-2.5 py-1.5 text-[10px] font-medium uppercase tracking-[0.1em] text-muted">
                  {question.difficulty}
                </span>
              </div>

              <h2 className="mt-6 max-w-3xl text-2xl font-medium leading-[1.25] tracking-[-0.045em] sm:mt-8 sm:text-3xl">
                {question.prompt}
              </h2>
              <div className="mt-6 grid gap-2.5" role="group" aria-label="Answer options">
                {question.options.map((option, index) => {
                  const selected = selectedAnswer === index;
                  return (
                    <button
                      key={option}
                      type="button"
                      aria-pressed={selected}
                      onClick={() => recordAnswer(index)}
                      className={`interactive flex min-h-12 items-center gap-3 rounded-xl border px-3.5 py-3 text-left text-sm sm:px-4 ${
                        selected
                          ? "border-accent bg-accent-soft/60 text-foreground"
                          : "border-border bg-white/25 hover:border-foreground/35 hover:bg-white/45"
                      }`}
                    >
                      <span
                        className={`grid size-6 shrink-0 place-items-center rounded-full border font-mono text-[9px] ${
                          selected ? "border-accent bg-accent text-white" : "border-border text-muted"
                        }`}
                        aria-hidden="true"
                      >
                        {selected ? <Check size={12} strokeWidth={2.2} /> : String.fromCharCode(65 + index)}
                      </span>
                      <span className="flex-1">{option}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5 min-h-8" aria-live="polite" aria-atomic="true">
                {selectedAnswer !== undefined && (
                  <div className={`rounded-xl border p-3.5 text-xs leading-5 ${selectedAnswer === question.correctOption ? "border-accent/20 bg-accent-soft/50 text-foreground" : "border-border bg-white/35 text-muted"}`} role="status">
                    <p className="font-semibold text-foreground">
                      {selectedAnswer === question.correctOption ? "Correct." : `Not quite. The answer is ${question.options[question.correctOption]}.`}
                    </p>
                    <p className="mt-1">
                      {question.explanation?.trim() || `This question checks your understanding of ${question.topic}. Review the topic notes, then continue.`}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-5 flex items-center justify-between gap-3 border-t border-border pt-5">
                <button
                  type="button"
                  onClick={goPrevious}
                  disabled={questionIndex === 0}
                  className="interactive inline-flex min-h-10 items-center gap-2 rounded-lg px-2 text-sm font-medium text-muted hover:text-foreground disabled:cursor-not-allowed disabled:opacity-35"
                >
                  <ArrowLeft aria-hidden="true" size={15} /> Previous
                </button>
                <button
                  type="button"
                  onClick={goNext}
                  disabled={selectedAnswer === undefined}
                  className="button-primary interactive inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-foreground px-4 text-sm font-medium text-background hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {questionIndex === questions.length - 1 ? "Complete Assessment" : "Next"} <ArrowRight aria-hidden="true" size={15} />
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : (
        <div className="mx-auto grid max-w-6xl gap-5">
          <section className="motion-reveal motion-reveal--section" data-motion-reveal aria-label="Assessment summary">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <SectionLabel>Diagnostic complete / Your profile</SectionLabel>
                <p className="mt-2 text-sm text-muted">These responses are early learning signals. Mastery estimates remain provisional and update with more evidence.</p>
              </div>
              <button
                type="button"
                onClick={restartAssessment}
                className="interactive inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground"
              >
                <RotateCcw size={13} aria-hidden="true" /> Retake assessment
              </button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              {[
                { label: "Response accuracy", value: overallUnderstanding, percent: true, feature: true },
                { label: "Attempted", value: Object.keys(answers).length, percent: false },
                { label: "Correct", value: score, percent: false },
                { label: "Unanswered", value: questions.length - Object.keys(answers).length, percent: false },
                { label: "Topics needing attention", value: needsAttention, percent: false },
              ].map((metric, index) => (
                <article
                  key={metric.label}
                  className={`panel motion-reveal motion-reveal--stat p-4 sm:p-5 ${metric.feature ? "bg-accent-soft/65" : ""}`}
                  data-motion-reveal
                  style={{ "--reveal-delay": `${index * 65}ms` } as CSSProperties}
                >
                  <div className="flex items-baseline gap-1">
                    <AnimatedNumber value={metric.value} className="text-3xl font-medium tracking-[-0.06em] sm:text-4xl" />
                    {metric.percent && <span className="text-lg text-muted">%</span>}
                  </div>
                  <p className="mt-2 text-[11px] leading-4 text-muted">{metric.label}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="panel motion-reveal motion-reveal--section motion-delay-1 p-5 sm:p-7" data-motion-reveal aria-labelledby="topic-profile-title">
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <SectionLabel>Knowledge profile / {questions.length} questions</SectionLabel>
                <h2 id="topic-profile-title" className="mt-2 text-xl font-medium tracking-[-0.04em]">Your understanding, topic by topic.</h2>
              </div>
              <span className="text-[11px] text-muted">Provisional signals from your responses</span>
            </div>
            <ul className="motion-stagger grid gap-1 sm:grid-cols-2 sm:gap-x-6" aria-label="Topic understanding levels">
              {topicEntries.map(({ topic, mastery }, index) => {
                const priority = topic.toLowerCase() === priorityTopic.toLowerCase();
                return (
                  <li
                    key={topic}
                    className="motion-reveal motion-reveal--plan-item rounded-xl px-3 py-3"
                    data-motion-reveal
                    style={{ "--reveal-delay": `${index * 55}ms` } as CSSProperties}
                  >
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate text-sm font-medium text-foreground">{topic}</span>
                        {priority && (
                          <span className="shrink-0 rounded-md bg-accent-soft px-2 py-0.5 text-[9px] font-medium text-accent">
                            Current priority
                          </span>
                        )}
                      </span>
                      <span className={`font-mono text-xs ${priority ? "text-accent" : "text-muted"}`}>{mastery}%</span>
                    </div>
                    <ProgressBar value={mastery} label={`${topic} understanding`} tone={priority ? "accent" : "muted"} className="h-1.5" />
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="grid gap-5 lg:grid-cols-[1fr_0.72fr]">
            <article className="panel motion-reveal motion-reveal--card motion-delay-2 p-5 sm:p-7" data-motion-reveal>
              <div className="flex items-center justify-between gap-3">
                <SectionLabel>LearnOS interpretation</SectionLabel>
                <span className="inline-flex items-center gap-2 text-[9px] font-medium uppercase tracking-[0.12em] text-accent">
                  <span className="ai-pulse size-1.5 rounded-full bg-accent" /> Profile updated
                </span>
              </div>
              <span className="mt-5 grid size-9 place-items-center rounded-xl bg-accent-soft text-accent">
                <Sparkles aria-hidden="true" size={17} />
              </span>
              <h2 className="mt-4 text-2xl font-medium tracking-[-0.045em]">LearnOS found a learning gap.</h2>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">
                {priorityTopic} is currently the lowest estimated topic in this profile. The next learning step focuses on {primaryGap}. Estimates will become more useful as you complete more practice.
              </p>
            </article>

            <aside className="panel motion-reveal motion-reveal--card motion-delay-2 flex flex-col justify-between bg-accent-soft/55 p-5 sm:p-7" data-motion-reveal>
              <div>
                <SectionLabel>Current priority</SectionLabel>
                <h3 className="mt-3 text-2xl font-medium tracking-[-0.045em]">{priorityTopic}</h3>
                <div className="mt-5 flex items-baseline gap-1">
                  <AnimatedNumber value={topicPerformance[priorityTopic] ?? 31} className="text-5xl font-medium tracking-[-0.07em]" />
                  <span className="text-2xl text-muted">%</span>
                </div>
                <p className="mt-2 text-xs text-muted">Current estimate; continue practice to strengthen this signal.</p>
              </div>
              <ProgressBar value={topicPerformance[priorityTopic] ?? 31} label={`${priorityTopic} current priority`} className="mt-7 h-2" />
            </aside>
          </section>

          <section className="panel motion-reveal motion-reveal--card motion-delay-3 flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7" data-motion-reveal>
            <div className="max-w-xl">
              <SectionLabel>03 / Understand</SectionLabel>
              <h2 className="mt-2 text-2xl font-medium tracking-[-0.045em]">Your knowledge map is ready.</h2>
              <p className="mt-2 text-sm leading-6 text-muted">LearnOS has identified where focused learning can have the greatest impact.</p>
            </div>
            <Link
              href="/knowledge-map"
              className="button-primary interactive inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-foreground px-4 text-sm font-medium text-background hover:bg-accent"
            >
              View Knowledge Map <ArrowRight aria-hidden="true" size={15} />
            </Link>
          </section>
        </div>
      )}
    </FeatureFrame>
  );
}
