"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Check, Clock3, RefreshCw, Sparkles } from "lucide-react";
import { FeatureFrame, FeatureHeading, SectionLabel } from "@/components/features/feature-frame";
import { ProgressBar } from "@/components/motion/progress-bar";
import { useLearning } from "@/context/learning-context";

export function PlanExperience() {
  const {
    planTasks,
    togglePlanTask,
    resetSessionPlan,
    planAdapted,
    setPlanAdapted,
    planSource,
    setPlanSource,
    setPlanTasks,
    knowledgeScores,
    weakestTopic,
    currentPriority,
    topics,
    assessmentCompleted,
    tutorPracticeCompleted,
  } = useLearning();

  const completeCount = planTasks.filter((task) => task.done).length;
  const progress = Math.round((completeCount / (planTasks.length || 1)) * 100);
  const weakestScore = knowledgeScores[weakestTopic] ?? 31;
  const graphMastery = knowledgeScores.Graphs ?? 31;

  const totalMinutes = planTasks.reduce((sum, t) => {
    const match = t.duration.match(/\d+/);
    return sum + (match ? parseInt(match[0], 10) : 10);
  }, 0);

  const lastFingerprintRef = useRef<string | null>(null);
  const isFetchingRef = useRef(false);

  // Generate / adapt plan when meaningful learner data changes (assessment or tutor completion)
  useEffect(() => {
    const hasMeaningfulSignal =
      assessmentCompleted ||
      tutorPracticeCompleted ||
      weakestTopic !== "Graphs";

    if (!hasMeaningfulSignal) {
      return;
    }

    const currentWeakScore = knowledgeScores[weakestTopic] ?? 31;
    const fingerprint = `${weakestTopic}|${tutorPracticeCompleted}|${assessmentCompleted}|${currentWeakScore}`;

    if (lastFingerprintRef.current === fingerprint || isFetchingRef.current) {
      return;
    }

    lastFingerprintRef.current = fingerprint;
    isFetchingRef.current = true;

    fetch("/api/adapt-plan", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topics: topics.map((t) => t.name),
        knowledgeScores,
        weakTopics: [weakestTopic],
        tutorProgress: {
          completed: tutorPracticeCompleted,
          topic: weakestTopic,
        },
        currentFocus: currentPriority,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Adaptive plan response not ok");
        return res.json();
      })
      .then((data) => {
        if (data && Array.isArray(data.tasks) && data.tasks.length === 4) {
          setPlanTasks(data.tasks);
          setPlanSource(data.source === "gemini" ? "gemini" : "baseline");
          if (tutorPracticeCompleted || data.source === "gemini") {
            setPlanAdapted(true);
          }
        }
      })
      .catch(() => {
        setPlanSource("baseline");
      })
      .finally(() => {
        isFetchingRef.current = false;
      });
  }, [
    weakestTopic,
    tutorPracticeCompleted,
    assessmentCompleted,
    knowledgeScores,
    currentPriority,
    topics,
    setPlanTasks,
    setPlanSource,
    setPlanAdapted,
  ]);

  return (
    <FeatureFrame activeHref="/plan">
      <FeatureHeading
        eyebrow="05 / Plan"
        title={
          planAdapted
            ? "Your plan has adapted to your progress."
            : "A focused session, built around you."
        }
        description={
          planAdapted
            ? weakestTopic === "Graphs"
              ? "Because you mastered BFS queue traversal in the AI Tutor (Graphs now 74%), LearnOS has updated your schedule with advanced applications."
              : `Because you completed targeted practice for ${weakestTopic} in the AI Tutor (${weakestTopic} now ${weakestScore}%), LearnOS has updated your schedule with advanced applications.`
            : weakestTopic === "Graphs"
            ? "Your plan puts Graph Traversal first because it is your highest-leverage gap (31%). Each task is sized to make steady progress feel possible."
            : `Your plan puts ${weakestTopic} first because it is your highest-leverage gap (${weakestScore}%). Each task is sized to make steady progress feel possible.`
        }
        aside={
          <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs">
            {planSource === "gemini" && (
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            )}
            <span className="font-semibold text-foreground">
              {planSource === "gemini"
                ? "Gemini Adaptive Plan"
                : planAdapted
                ? "Adaptive Schedule"
                : "Baseline Schedule"}
            </span>
            <span className="text-border">/</span>
            <span className="text-muted">4 tasks &middot; {totalMinutes} mins</span>
          </div>
        }
      />

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_340px]">
        {/* Main Task List */}
        <section className="panel motion-reveal motion-reveal--section p-5 sm:p-8" data-motion-reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <SectionLabel>Today&apos;s adaptive sequence</SectionLabel>
              <h2 className="mt-2 text-xl font-medium tracking-[-0.04em]">
                {weakestTopic === "Graphs"
                  ? planAdapted
                    ? "Graph Traversal &middot; Advanced Applications"
                    : "Graph Traversal &middot; Foundations"
                  : `${weakestTopic} &middot; ${planAdapted ? "Advanced Applications" : "Foundations"}`}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted">
                {completeCount} of {planTasks.length} complete
              </span>
              <span className="font-mono text-xs font-semibold text-accent">
                {progress}%
              </span>
            </div>
          </div>

          <div className="mt-5">
            <ProgressBar value={progress} label="Today's plan completion" className="h-2" />
          </div>

          <ol className="mt-6 grid gap-3" aria-label="Personalized daily study tasks">
            {planTasks.map((task) => (
              <li
                key={task.id}
                className={`motion-reveal motion-reveal--plan-item flex items-start gap-3 rounded-2xl border p-4 transition-colors sm:gap-4 sm:p-5 ${
                  task.done
                    ? "border-accent/35 bg-accent-soft/30"
                    : "border-border bg-white/30 hover:border-foreground/30"
                }`}
                data-motion-reveal
              >
                <button
                  type="button"
                  onClick={() => togglePlanTask(task.id)}
                  aria-label={task.done ? "Mark incomplete: " + task.title : "Complete: " + task.title}
                  aria-pressed={task.done}
                  className={`interactive mt-0.5 grid size-6 shrink-0 place-items-center rounded-full border transition-all ${
                    task.done
                      ? "border-accent bg-accent text-white"
                      : "border-foreground/30 text-transparent hover:border-accent"
                  }`}
                >
                  {task.done && <Check size={13} strokeWidth={2.4} aria-hidden="true" />}
                </button>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-sm font-medium ${
                        task.done ? "text-muted line-through decoration-foreground/25" : "text-foreground"
                      }`}
                    >
                      {task.title}
                    </span>
                    <span
                      className={`rounded-md px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.1em] ${
                        task.kind === "Advanced" || task.kind === "Focus topic"
                          ? "bg-accent-soft text-accent"
                          : "bg-background text-muted"
                      }`}
                    >
                      {task.kind}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs leading-5 text-muted">{task.detail}</p>
                </div>

                <span className="inline-flex shrink-0 items-center gap-1 text-[11px] text-muted">
                  <Clock3 size={12} aria-hidden="true" /> {task.duration}
                </span>
              </li>
            ))}
          </ol>

          {/* Bottom Complete CTA */}
          <div className="mt-8 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs text-muted">
              {progress === 100
                ? "All tasks complete for today. Your progress is reflected across LearnOS."
                : `${planTasks.length - completeCount} tasks remaining in this focused block.`}
            </span>
            <Link
              href="/dashboard"
              className="button-primary interactive inline-flex items-center justify-center gap-2 rounded-xl bg-foreground px-4 py-2.5 text-xs font-semibold text-background hover:bg-accent"
            >
              <span>Return to Dashboard</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </section>

        {/* Why This Plan Card */}
        <aside className="panel motion-reveal motion-reveal--card p-5 sm:p-7" data-motion-reveal aria-live="polite">
          <SectionLabel>Why this plan</SectionLabel>
          <h2 className="mt-3 text-xl font-medium leading-snug tracking-[-0.04em]">
            {planAdapted
              ? "Adapted to your recent tutor victory."
              : `A small step toward closing your ${weakestTopic === "Graphs" ? "Graph" : weakestTopic} gap.`}
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            {planAdapted
              ? weakestTopic === "Graphs"
                ? `You proved your BFS intuition in the AI Tutor. Graphs mastery moved from 31% to ${graphMastery}%. Your plan automatically shifted to shortest-path applications and cycle detection.`
                : `You proved your understanding in the AI Tutor. ${weakestTopic} mastery moved to ${weakestScore}%. Your plan automatically shifted to advanced problem solving and synthesis.`
              : weakestTopic === "Graphs"
              ? "Your latest check-in showed Graph Traversal as your clearest opportunity (31%). This session moves from adjacency representations into BFS queue tracing."
              : `Your latest check-in showed ${weakestTopic} as your clearest opportunity (${weakestScore}%). This session moves through targeted foundations into practical checks.`}
          </p>

          <div className="mt-6 rounded-xl bg-accent-soft/80 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-accent">
              <Sparkles size={14} />
              <span>
                {planSource === "gemini"
                  ? `AI Plan tailored for ${weakestTopic}`
                  : planAdapted
                  ? "Plan adapted by LearnOS"
                  : `Targeted for your ${weakestScore}% gap`}
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted">
              {planAdapted
                ? "As you complete these practice items, LearnOS prepares the next diagnostic check-in."
                : "Complete the AI Tutor session to see your plan adapt in real-time."}
            </p>
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
            <button
              type="button"
              onClick={resetSessionPlan}
              className="interactive inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground"
            >
              <RefreshCw size={12} aria-hidden="true" /> Reset tasks
            </button>
            {!tutorPracticeCompleted ? (
              <Link
                href="/tutor"
                className="interactive inline-flex items-center gap-1 text-xs font-semibold text-accent hover:text-foreground"
              >
                Go to AI Tutor <ArrowRight size={12} aria-hidden="true" />
              </Link>
            ) : (
              <Link
                href="/knowledge-map"
                className="interactive inline-flex items-center gap-1 text-xs font-semibold text-accent hover:text-foreground"
              >
                View Knowledge Map <ArrowRight size={12} aria-hidden="true" />
              </Link>
            )}
          </div>
        </aside>
      </div>

      <p className="mt-5 text-[11px] text-muted">
        Your syllabus. Your weaknesses. Your way of learning.
      </p>
    </FeatureFrame>
  );
}
