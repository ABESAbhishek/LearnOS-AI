"use client";

import { useState, useEffect, useRef, type CSSProperties } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, RotateCcw, Sparkles } from "lucide-react";
import { FeatureFrame, FeatureHeading, SectionLabel } from "@/components/features/feature-frame";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { ProgressBar } from "@/components/motion/progress-bar";
import { useLearning } from "@/context/learning-context";
import type { Question, AssessmentEvidence } from "@/types/assessment";
import type { TopicDifficulty } from "@/types/course";
import { CANONICAL_QUESTIONS } from "@/lib/assessment-bank";
import {
  computeDiagnosticScores,
  CANONICAL_DSA_SCORES,
} from "@/lib/adaptive-assessment";
import styles from "./assessment-experience.module.css";

export function AssessmentExperience() {
  const {
    courseModel,
    assessmentSource,
    setAssessmentSource,
    updateAssessmentMastery,
  } = useLearning();

  const [questions, setQuestions] = useState<Question[]>(CANONICAL_QUESTIONS);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [evidenceList, setEvidenceList] = useState<AssessmentEvidence[]>([]);
  const [completedQuestions, setCompletedQuestions] = useState<Set<number>>(() => new Set());
  const [score, setScore] = useState(0);
  const [topicPerformance, setTopicPerformance] = useState<Record<string, number>>(CANONICAL_DSA_SCORES);
  const [direction, setDirection] = useState<"next" | "previous">("next");
  const [complete, setComplete] = useState(false);
  const [primaryGap, setPrimaryGap] = useState("BFS / DFS traversal & shortest-path exploration");
  const [priorityTopic, setPriorityTopic] = useState("Graphs");

  const hasInteractedRef = useRef(false);

  const question = questions[questionIndex] || CANONICAL_QUESTIONS[0];
  const selectedAnswer = answers[questionIndex];
  const progress = ((questionIndex + 1) / questions.length) * 100;
  const overallUnderstanding = Math.round(60 + (score / (questions.length || 1)) * 16);

  const topicEntries = questions.map(({ topic }) => ({
    topic,
    mastery: topicPerformance[topic] ?? 60,
  }));
  const strongAreas = topicEntries.filter(({ mastery }) => mastery >= 75).length;
  const needsAttention = topicEntries.filter(({ mastery }) => mastery < 50).length;
  const emergingAreas = Math.max(0, topicEntries.length - strongAreas - needsAttention);

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
        if (
          data &&
          Array.isArray(data.questions) &&
          data.questions.length === 8 &&
          data.source === "gemini"
        ) {
          if (!hasInteractedRef.current) {
            setQuestions(data.questions);
            setAssessmentSource("gemini");
            const initialMap: Record<string, number> = {};
            data.questions.forEach((q: Question) => {
              initialMap[q.topic] = CANONICAL_DSA_SCORES[q.topic] ?? 60;
            });
            setTopicPerformance((prev) => ({ ...initialMap, ...prev }));
          }
        } else {
          setAssessmentSource("baseline");
        }
      })
      .catch(() => {
        if (isMounted) {
          setAssessmentSource("baseline");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [courseModel, setAssessmentSource]);

  function recordAnswer(optionIndex: number) {
    hasInteractedRef.current = true;
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

    // Compute updated diagnostic mastery
    const diagnostic = computeDiagnosticScores(topicPerformance, updatedEvidence);
    setTopicPerformance(diagnostic.scores);
    setPrimaryGap(diagnostic.primaryGap);
    setPriorityTopic(diagnostic.priorityTopic);

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
      updateAssessmentMastery(topicPerformance);
      return;
    }
    setDirection("next");
    setQuestionIndex((index) => index + 1);
  }

  function restartAssessment() {
    hasInteractedRef.current = false;
    setQuestionIndex(0);
    setAnswers({});
    setEvidenceList([]);
    setCompletedQuestions(new Set());
    setScore(0);
    setTopicPerformance({ ...CANONICAL_DSA_SCORES });
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
            : "Answer a few targeted questions. LearnOS adapts to your answers to build your precise knowledge profile."
        }
        aside={
          <div className="min-w-48 rounded-xl border border-border bg-surface/50 px-3.5 py-2.5">
            <span className="flex items-center gap-1.5 text-[9px] font-semibold uppercase tracking-[0.15em] text-muted">
              {assessmentSource === "gemini" ? (
                <>
                  <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Gemini 3.8 Flash Diagnostic</span>
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
              Adaptive questions probe understanding and isolate conceptual gaps topic by topic.
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
                  <span className="inline-flex items-center gap-2 text-xs text-muted" role="status">
                    <span className="ai-pulse size-1.5 rounded-full bg-accent" aria-hidden="true" /> Diagnostic response recorded
                  </span>
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
                <p className="mt-2 text-sm text-muted">Your answers have calibrated your adaptive learning profile.</p>
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
                { label: "Overall understanding", value: overallUnderstanding, percent: true, feature: true },
                { label: "Topics assessed", value: completedQuestions.size, percent: false },
                { label: "Strong areas", value: strongAreas, percent: false },
                { label: "Needs attention", value: needsAttention, percent: false },
                { label: "Emerging areas", value: emergingAreas, percent: false },
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
                <SectionLabel>Knowledge profile / {questions.length} topics</SectionLabel>
                <h2 id="topic-profile-title" className="mt-2 text-xl font-medium tracking-[-0.04em]">Your understanding, topic by topic.</h2>
              </div>
              <span className="text-[11px] text-muted">Adaptive signals from your responses</span>
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
                Your fundamentals are strongest in foundational data structures. {priorityTopic} is currently the largest knowledge gap, specifically: {primaryGap}.
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
                <p className="mt-2 text-xs text-muted">Targeted remediation path ready</p>
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
