"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { AiActivity } from "@/components/motion/ai-activity";
import { ProgressBar } from "@/components/motion/progress-bar";
import {
  KnowledgeTopic,
  OverviewMetric,
} from "@/components/dashboard/dashboard-components";
import { useLearning } from "@/context/learning-context";
import { useAuth } from "@/context/auth-context";

const LEARNING_STEPS = ["ASSESS", "LEARN", "PRACTICE", "ANALYZE", "ADAPT"];

export default function DashboardPage() {
  const {
    topics,
    knowledgeScores,
    overallMastery,
    currentPriority,
    currentFocus,
    planTasks,
    planAdapted,
    tutorPracticeCompleted,
    resetEntireDemo,
  } = useLearning();
  const { studentName } = useAuth();

  const graphScore = knowledgeScores.Graphs ?? 31;
  const isGraphGap = graphScore < 60;
  const completedTasksCount = planTasks.filter((t) => t.done).length;

  return (
    <main
      id="main-content"
      className="mx-auto w-full max-w-[1440px] px-6 pb-12 sm:px-10 lg:px-16 lg:pb-16"
    >
      {/* Top Greeting & State Banner */}
      <section
        id="overview"
        aria-labelledby="greeting-title"
        className="py-10 sm:py-14 lg:py-16"
      >
        <div className="flex flex-wrap items-center justify-between gap-4">
          <p
            className="hero-sequence motion-reveal motion-reveal--node text-[11px] font-semibold uppercase tracking-[0.19em] text-accent"
            data-motion-reveal
          >
            Learning overview <span className="px-1.5 text-border">/</span> DSA
          </p>

          {planAdapted && (
            <button
              type="button"
              onClick={resetEntireDemo}
              className="interactive inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted hover:text-foreground"
            >
              <RotateCcw size={12} /> Reset demo to baseline
            </button>
          )}
        </div>

        <h1
          id="greeting-title"
          className="hero-sequence motion-reveal motion-reveal--section motion-delay-1 mt-4 text-4xl font-medium leading-[1.06] tracking-[-0.06em] sm:text-5xl lg:text-[3.65rem]"
          data-motion-reveal
        >
          Good afternoon, {studentName || "Student"}.
        </h1>

        <p
          className="hero-sequence motion-reveal motion-reveal--node motion-delay-2 mt-4 text-lg font-medium tracking-[-0.025em] sm:text-xl"
          data-motion-reveal
        >
          {planAdapted
            ? "Your learning path has adapted to your BFS practice."
            : "Your learning path is adapting to you."}
        </p>

        <p
          className="hero-sequence motion-reveal motion-reveal--node motion-delay-3 mt-1.5 text-sm text-muted"
          data-motion-reveal
        >
          {planAdapted
            ? "Graph Traversal mastery increased to 74%. Today's focus shifted to advanced applications."
            : "Based on your recent assessment and diagnostic check-in."}
        </p>

        <div
          className="hero-sequence motion-reveal motion-reveal--node motion-delay-4 mt-5 flex flex-wrap items-center gap-x-5 gap-y-2"
          data-motion-reveal
        >
          <span className="inline-flex items-center gap-2 text-xs font-medium text-muted">
            <span className="ai-pulse size-1.5 rounded-full bg-accent" aria-hidden="true" />
            {planAdapted ? "System adapted to mastery" : "Adapting to your progress"}
          </span>

          <ol
            className="flex flex-wrap items-center gap-x-2 text-[10px] font-semibold tracking-[0.13em] text-muted"
            aria-label="Assess, learn, practice, analyze, adapt"
          >
            {LEARNING_STEPS.map((step, index) => {
              const isCurrent = planAdapted
                ? step === "ADAPT"
                : tutorPracticeCompleted
                ? step === "PRACTICE"
                : step === "LEARN";

              return (
                <li key={step} className="inline-flex items-center gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 ${
                      isCurrent ? "bg-accent-soft font-bold text-accent" : ""
                    }`}
                  >
                    {step}
                  </span>
                  {index < LEARNING_STEPS.length - 1 && (
                    <span className="text-accent" aria-hidden="true">
                      &rarr;
                    </span>
                  )}
                </li>
              );
            })}
          </ol>
        </div>
      </section>

      {/* Focus Card: Graph Traversal */}
      <section
        aria-labelledby="focus-title"
        className="panel panel-hover focus-card motion-reveal motion-reveal--card motion-delay-1 overflow-hidden"
        data-motion-reveal
      >
        <div className="grid gap-8 p-6 sm:p-8 md:grid-cols-[1fr_0.62fr] md:gap-10 md:p-10 lg:p-12">
          <div className="flex flex-col items-start">
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted">
                {planAdapted ? "Adapted focus" : "Today's focus"}
              </p>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-accent-soft px-2.5 py-1 text-[10px] font-medium text-accent">
                <Sparkles aria-hidden="true" size={12} strokeWidth={1.8} />
                {planAdapted ? "Mastery elevated" : "Recommended for you"}
              </span>
            </div>

            <h2
              id="focus-title"
              className="focus-title mt-5 text-4xl font-medium tracking-[-0.055em] sm:text-5xl"
            >
              {planAdapted ? "Advanced Graph Applications" : currentPriority}
            </h2>

            <p className="mt-3 max-w-xl text-sm leading-6 text-muted sm:text-base">
              {planAdapted
                ? "You proved your BFS intuition in the AI Tutor. Now apply level traversal to Topological Sort & Grid Shortest Paths."
                : "Your current focus based on your diagnostic check-in."}
            </p>

            <div className="mt-5 flex flex-wrap gap-2" aria-label="Focus topics">
              {(planAdapted ? ["Topological Sort", "Cycle Detection", "Grid BFS"] : currentFocus).map(
                (topic) => (
                  <span
                    key={topic}
                    className="rounded-md border border-border px-2.5 py-1.5 text-xs text-muted"
                  >
                    {topic}
                  </span>
                )
              )}
            </div>

            <Link
              className="button-primary interactive mt-8 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-foreground px-4 text-sm font-medium text-background hover:bg-accent"
              href={planAdapted ? "/plan" : "/tutor"}
            >
              {planAdapted ? "View Adapted Study Plan" : "Continue Learning"}{" "}
              <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </div>

          <div className="flex flex-col justify-center border-t border-border pt-6 md:border-l md:border-t-0 md:pl-9 md:pt-0">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-xs text-muted">Graph mastery level</p>
                <p className="mt-2 text-5xl font-medium tracking-[-0.07em]">
                  {graphScore}
                  <span className="ml-1 text-2xl text-muted">%</span>
                </p>
              </div>

              <span className="mb-1 inline-flex items-center gap-2 text-xs font-medium text-accent">
                <span className="size-1.5 rounded-full bg-accent" />
                {isGraphGap ? "Needs attention" : "Target Met"}
              </span>
            </div>

            <ProgressBar
              value={graphScore}
              label="Graph Traversal knowledge level"
              className="mt-5 h-2"
              tone={isGraphGap ? "accent" : "accent"}
            />

            <p className="mt-4 max-w-xs text-xs leading-5 text-muted">
              {isGraphGap
                ? "A little focused practice here can move your overall mastery forward."
                : "Knowledge gap strengthened. Your schedule has updated with next-tier challenges."}
            </p>
          </div>
        </div>
      </section>

      {/* Grid: Knowledge Profile + LearnOS Insight */}
      <div className="mt-5 grid items-start gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        
        {/* Knowledge Profile */}
        <section
          id="knowledge-profile"
          aria-labelledby="knowledge-title"
          className="panel motion-reveal motion-reveal--section motion-delay-2 p-5 sm:p-7"
          data-motion-reveal
        >
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 id="knowledge-title" className="text-xl font-medium tracking-[-0.04em]">
                Knowledge Profile
              </h2>
              <p className="mt-1.5 text-sm text-muted">
                Your current understanding across the DSA syllabus.
              </p>
            </div>
            <Link
              href="/knowledge-map"
              className="interactive text-xs font-semibold text-accent hover:text-foreground"
            >
              Open Interactive Map &rarr;
            </Link>
          </div>

          <ul className="motion-stagger -mx-3 grid gap-1" aria-label="DSA topic mastery">
            {topics.map((topic) => (
              <KnowledgeTopic
                key={topic.name}
                name={topic.name}
                value={topic.mastery}
                priority={topic.name === "Graphs" && isGraphGap}
              />
            ))}
          </ul>
        </section>

        {/* LearnOS Insight */}
        <section
          id="insight"
          aria-labelledby="insight-title"
          className="panel panel-hover motion-reveal motion-reveal--card motion-delay-3 flex h-full flex-col p-5 sm:p-7"
          data-motion-reveal
        >
          <div className="flex items-center justify-between gap-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.17em] text-muted">
              LearnOS Insight
            </p>
            <span className="inline-flex items-center gap-2 text-[10px] font-medium uppercase tracking-[0.12em] text-accent">
              <span className="ai-pulse size-1.5 rounded-full bg-accent" />
              {planAdapted ? "Curriculum Adapted" : "Profile Active"}
            </span>
          </div>

          <div className="mt-7 grid size-10 place-items-center rounded-xl bg-accent-soft text-accent">
            <Sparkles aria-hidden="true" size={19} strokeWidth={1.7} />
          </div>

          <h2 id="insight-title" className="mt-5 text-2xl font-medium tracking-[-0.045em]">
            {planAdapted ? "Adaptation verified." : "A clearer next step."}
          </h2>

          <p className="mt-3 text-sm leading-6 text-muted">
            {planAdapted
              ? "Graph Traversal jumped from 31% to 74% after your verified BFS practice session. Your curriculum has updated."
              : "Your graph traversal knowledge is currently your largest gap (31%). Let's strengthen BFS and DFS first."}
          </p>

          <div className="my-6 border-t border-border" />

          <AiActivity currentStep={planAdapted ? 4 : 2} className="mb-7" />

          <Link
            className="interactive mt-auto inline-flex min-h-10 items-center gap-2 self-start text-sm font-medium text-accent hover:text-foreground"
            href={planAdapted ? "/plan" : "/tutor"}
          >
            {planAdapted ? "View Adapted Plan" : "Start Focus Session"}{" "}
            <ArrowRight aria-hidden="true" size={16} />
          </Link>
        </section>
      </div>

      {/* Quick Overview Metrics */}
      <section id="quick-overview" aria-labelledby="quick-title" className="mt-10 sm:mt-12">
        <div
          className="motion-reveal motion-reveal--section motion-delay-4 mb-4 flex items-end justify-between gap-3"
          data-motion-reveal
        >
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.17em] text-muted">
              Your workspace
            </p>
            <h2 id="quick-title" className="mt-1.5 text-xl font-medium tracking-[-0.04em]">
              At a glance
            </h2>
          </div>
          <span className="hidden text-xs text-muted sm:block">
            One connected learning path
          </span>
        </div>

        <div className="motion-stagger grid gap-3 sm:grid-cols-3 sm:gap-4">
          <OverviewMetric
            id="syllabus"
            href="/upload"
            label="Syllabus"
            value="12 topics analyzed"
            description="Across your DSA syllabus"
            icon={BookOpen}
          />

          <OverviewMetric
            id="assessment"
            href="/assessment"
            label="Assessment"
            value={`${overallMastery}% current mastery`}
            description="From your diagnostic profile"
            icon={ClipboardCheck}
          />

          <OverviewMetric
            id="study-plan"
            href="/plan"
            label="Study Plan"
            value={`${completedTasksCount} of ${planTasks.length} tasks`}
            description={planAdapted ? "Adaptive sequence active" : "Focused daily session"}
            icon={CalendarDays}
          />
        </div>
      </section>

      {/* The LearnOS Loop */}
      <section
        id="learning-loop"
        aria-labelledby="loop-title"
        className="panel motion-reveal motion-reveal--section motion-delay-4 mt-10 grid gap-7 p-5 sm:mt-12 sm:grid-cols-[0.7fr_1fr] sm:items-center sm:p-7"
        data-motion-reveal
      >
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.17em] text-muted">
            The LearnOS loop
          </p>
          <h2 id="loop-title" className="mt-2 text-xl font-medium tracking-[-0.04em]">
            Learning gets smarter as you go.
          </h2>
          <p className="mt-2 max-w-sm text-sm leading-6 text-muted">
            Assess &rarr; Learn &rarr; Practice &rarr; Analyze &rarr; Adapt &rarr; Repeat.
          </p>
        </div>

        <ol
          className="motion-stagger flex flex-col items-center"
          aria-label="Assess, learn, practice, analyze, adapt"
        >
          {LEARNING_STEPS.map((step, index) => (
            <li key={step} className="flex flex-col items-center">
              <span
                className="motion-reveal motion-reveal--node inline-flex items-center gap-3 rounded-lg px-3 py-1 text-xs font-semibold tracking-[0.14em] text-foreground"
                data-motion-reveal
              >
                <span className="font-mono text-[10px] text-accent">0{index + 1}</span>
                {step}
              </span>
              {index < LEARNING_STEPS.length - 1 && (
                <span className="py-0.5 text-xs text-accent" aria-hidden="true">
                  &darr;
                </span>
              )}
            </li>
          ))}
        </ol>
      </section>

      <footer className="mt-8 flex flex-col gap-2 border-t border-border pt-5 text-xs text-muted sm:flex-row sm:items-center sm:justify-between">
        <span className="font-medium text-foreground">LearnOS AI</span>
        <span>Your syllabus. Your weaknesses. Your way of learning.</span>
      </footer>
    </main>
  );
}
