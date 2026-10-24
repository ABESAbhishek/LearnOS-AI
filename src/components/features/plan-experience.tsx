"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import { ArrowRight, Clock3, Sparkles } from "lucide-react";
import { FeatureFrame, FeatureHeading, SectionLabel } from "@/components/features/feature-frame";
import { useLearning } from "@/context/learning-context";

export function PlanExperience() {
  const {
    planTasks,
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
    evidence,
    tutorPracticeCompleted,
    isSampleData,
  } = useLearning();

  const weakestScore = knowledgeScores[weakestTopic] ?? 31;

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
      evidence.length > 0;

    if (!hasMeaningfulSignal) {
      return;
    }

    const currentWeakScore = knowledgeScores[weakestTopic] ?? 31;
    const fingerprint = `${weakestTopic}|${tutorPracticeCompleted}|${assessmentCompleted}|${currentWeakScore}|${evidence.length}`;

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
          setPlanSource(data.source !== "baseline" ? data.source : "baseline");
          setPlanAdapted(true);
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
    evidence,
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
            ? `Your latest responses put ${weakestTopic} at the top of the plan (${weakestScore}% estimated mastery). The estimate is provisional and will change as you practice.`
            : isSampleData
              ? `The seeded DSA profile puts ${weakestTopic} first (${weakestScore}% estimated mastery). Complete a diagnostic to replace these sample signals with your own evidence.`
              : `The current course estimate puts ${weakestTopic} first (${weakestScore}%). Complete a diagnostic to build a profile from your own answers.`
        }
        aside={
          <div className="flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs">
            {planSource !== "baseline" && (
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
            )}
            <span className="font-semibold text-foreground">
              {planSource !== "baseline"
                ? "AI Adaptive Plan"
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
              <SectionLabel>Today&apos;s learning sequence</SectionLabel>
              <h2 className="mt-2 text-xl font-medium tracking-[-0.04em]">
                {weakestTopic} &middot; {planAdapted ? "Evidence-informed sequence" : "Foundation sequence"}
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-muted">{planTasks.length} suggested next steps</span>
            </div>
          </div>

          <ol className="mt-6 grid gap-3" aria-label="Personalized daily study tasks">
            {planTasks.map((task) => (
              <li
                key={task.id}
                className="motion-reveal motion-reveal--plan-item flex items-start gap-3 rounded-2xl border border-border bg-white/30 p-4 transition-colors hover:border-foreground/30 sm:gap-4 sm:p-5"
                data-motion-reveal
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="text-sm font-medium text-foreground"
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
                <Link href="/tutor" className="interactive ml-auto inline-flex min-h-8 shrink-0 items-center gap-1 self-center rounded-lg border border-border px-2.5 text-[10px] font-semibold text-accent hover:border-accent">
                  Open lesson <ArrowRight size={12} aria-hidden="true" />
                </Link>
              </li>
            ))}
          </ol>

          {/* Bottom Complete CTA */}
          <div className="mt-8 flex flex-col gap-3 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
            <span className="text-xs text-muted">
              These are suggested next steps. Lesson and answer history records your completed learning activity.
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
              ? "Prioritized from your recent learning evidence."
              : `A focused start for your ${weakestTopic} topic.`}
          </h2>
          <p className="mt-3 text-sm leading-6 text-muted">
            {planAdapted
              ? `${weakestTopic} currently has the lowest estimated mastery (${weakestScore}%). LearnOS orders these tasks around that topic and its course outline.`
              : `${weakestTopic} is the lowest starting estimate (${weakestScore}%). These tasks begin with foundations and move toward application.`}
          </p>

          <div className="mt-6 rounded-xl bg-accent-soft/80 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold text-accent">
              <Sparkles size={14} />
              <span>
                {planSource !== "baseline"
                  ? `AI Plan tailored for ${weakestTopic}`
                  : planAdapted
                  ? "Plan adapted by LearnOS"
                  : `Targeted for your ${weakestScore}% gap`}
              </span>
            </div>
            <p className="mt-2 text-xs leading-5 text-muted">
              {planAdapted
                ? "As you complete these practice items, LearnOS prepares the next diagnostic check-in."
                : "Complete a diagnostic or targeted practice to adapt this plan from your learning evidence."}
            </p>
          </div>

          <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
            <span className="text-[11px] text-muted">Start a step to open its lesson.</span>
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
