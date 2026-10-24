"use client";

import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  CalendarDays,
  ClipboardCheck,
  Flame,
  MessageCircleHeart,
  RotateCcw,
  Sparkles,
  Trophy,
} from "lucide-react";
import { AiActivity } from "@/components/motion/ai-activity";
import { ProgressBar } from "@/components/motion/progress-bar";
import {
  KnowledgeTopic,
  OverviewMetric,
} from "@/components/dashboard/dashboard-components";
import { useLearning } from "@/context/learning-context";
import { useAuth } from "@/context/auth-context";
import { getNextXPMilestone, WEEKLY_LEARNING_GOAL_DAYS } from "@/lib/reward-rules";
import { LearningStories } from "@/components/features/learning-stories";

const LEARNING_STEPS = ["ASSESS", "LEARN", "PRACTICE", "ANALYZE", "ADAPT"];

export default function DashboardPage() {
  const {
    courseModel,
    topics,
    knowledgeScores,
    overallMastery,
    weakestTopic,
    currentPriority,
    currentFocus,
    planTasks,
    planAdapted,
    tutorPracticeCompleted,
    assessmentCompleted,
    isSampleData,
    gamification,
    weeklyLearningDays,
    resetEntireDemo,
  } = useLearning();
  const { studentName } = useAuth();

  const weakScore = knowledgeScores[weakestTopic] ?? (knowledgeScores.Graphs ?? 31);
  const isWeakGap = weakScore < 60;

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
            Learning overview <span className="px-1.5 text-border">/</span> {courseModel.courseName}
          </p>

          <button
            type="button"
            onClick={() => {
              if (window.confirm("Reset this browser's LearnOS learning data and progress?")) resetEntireDemo();
            }}
            className="interactive inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1 text-xs text-muted hover:text-foreground"
          >
            <RotateCcw size={12} /> Reset learning data
          </button>
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
            ? `Your learning path has adapted to your ${weakestTopic} practice.`
            : "Your learning path is adapting to you."}
        </p>

        <p
          className="hero-sequence motion-reveal motion-reveal--node motion-delay-3 mt-1.5 text-sm text-muted"
          data-motion-reveal
        >
          {isSampleData
            ? "Sample DSA profile shown. Complete a diagnostic or practice session to build your own evidence."
            : assessmentCompleted
              ? `Based on ${topics.length} course topics and your latest learning evidence.`
              : "Add course material or complete a diagnostic to begin building your learning profile."}
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

      <section aria-label="Learning progress and milestones" className="motion-reveal motion-reveal--section mb-5 grid gap-3 sm:grid-cols-3" data-motion-reveal>
        <article className="panel flex items-center gap-4 p-4 sm:p-5">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent"><Trophy size={18} aria-hidden="true" /></span>
          <div className="min-w-0">
            <p className="font-mono text-2xl font-medium tracking-[-0.05em]">{gamification.xp} XP</p>
            <p className="text-xs text-muted">
              {getNextXPMilestone(gamification.xp) === null
                ? "All XP milestones reached"
                : `Next milestone: ${getNextXPMilestone(gamification.xp)! - gamification.xp} XP away`}
            </p>
          </div>
        </article>
        <article className="panel flex items-center gap-4 p-4 sm:p-5">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-background text-muted"><Flame size={18} aria-hidden="true" /></span>
          <div className="min-w-0">
            <p className="font-mono text-2xl font-medium tracking-[-0.05em]">{gamification.currentStreak} day{gamification.currentStreak === 1 ? "" : "s"}</p>
            <p className="text-xs text-muted">Learning streak · best {gamification.bestStreak}</p>
          </div>
        </article>
        <article className="panel p-4 sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium text-muted">Weekly learning goal</p>
            <span className="font-mono text-xs text-accent">{weeklyLearningDays}/{WEEKLY_LEARNING_GOAL_DAYS} days</span>
          </div>
          <ProgressBar value={(weeklyLearningDays / WEEKLY_LEARNING_GOAL_DAYS) * 100} label="Weekly learning goal progress" className="mt-3 h-1.5" />
          <p className="mt-2 text-[10px] text-muted">{gamification.badges.length} milestone{gamification.badges.length === 1 ? "" : "s"} earned</p>
        </article>
      </section>

      <div className="mb-5 grid items-start gap-4 lg:grid-cols-[1.2fr_0.8fr]">
        <LearningStories />
        <section className="panel panel-hover p-4 sm:p-5" aria-labelledby="companion-title">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent"><MessageCircleHeart size={18} aria-hidden="true" /></span>
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">LearnOS companion</p><h2 id="companion-title" className="mt-0.5 text-sm font-semibold">A little direction for today</h2></div>
          </div>
          <p className="mt-3 text-sm leading-5 text-muted">
            {assessmentCompleted
              ? tutorPracticeCompleted
                ? `You have practice evidence for ${weakestTopic}. A quick review can help make the idea stick.`
                : `${weakestTopic} is the next best place to focus based on your current answers.`
              : "Start with a short diagnostic. Your answers will help LearnOS choose a useful next step."}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={assessmentCompleted ? "/tutor" : "/assessment"} className="button-primary interactive inline-flex min-h-9 items-center gap-2 rounded-lg bg-foreground px-3 text-xs font-semibold text-background hover:bg-accent">{assessmentCompleted ? "Open focused lesson" : "Start diagnostic"}<ArrowRight size={13} /></Link>
            <Link href="/quests" className="interactive inline-flex min-h-9 items-center rounded-lg border border-border px-3 text-xs font-semibold text-foreground hover:border-accent hover:text-accent">Today&apos;s quests</Link>
          </div>
          <p className="mt-3 text-[10px] text-muted">Suggestions follow saved learner progress; this companion does not claim to be a live AI chat.</p>
        </section>
      </div>

      {/* Current learning focus */}
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
              {planAdapted ? "Updated from evidence" : "Recommended for you"}
              </span>
            </div>

            <h2
              id="focus-title"
              className="focus-title mt-5 text-4xl font-medium tracking-[-0.055em] sm:text-5xl"
            >
              {currentPriority}
            </h2>

            <p className="mt-3 max-w-xl text-sm leading-6 text-muted sm:text-base">
              {planAdapted
                ? `Your recent learning evidence moved ${weakestTopic} to the top of the next-step plan.`
                : `Your current focus is ${weakestTopic}, the lowest estimated topic in this profile.`}
            </p>

            <div className="mt-5 flex flex-wrap gap-2" aria-label="Focus topics">
              {currentFocus.map(
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
                <p className="text-xs text-muted">{weakestTopic} mastery level</p>
                <p className="mt-2 text-5xl font-medium tracking-[-0.07em]">
                  {weakScore}
                  <span className="ml-1 text-2xl text-muted">%</span>
                </p>
              </div>

              <span className="mb-1 inline-flex items-center gap-2 text-xs font-medium text-accent">
                <span className="size-1.5 rounded-full bg-accent" />
                {isWeakGap ? "Needs attention" : "Target Met"}
              </span>
            </div>

            <ProgressBar
              value={weakScore}
              label={`${weakestTopic} knowledge level`}
              className="mt-5 h-2"
              tone={isWeakGap ? "accent" : "accent"}
            />

            <p className="mt-4 max-w-xs text-xs leading-5 text-muted">
              {isWeakGap
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
                Your current understanding across the {courseModel.courseName} syllabus.
              </p>
            </div>
            <Link
              href="/knowledge-map"
              className="interactive text-xs font-semibold text-accent hover:text-foreground"
            >
              Open Interactive Map &rarr;
            </Link>
          </div>

          <ul className="motion-stagger -mx-3 grid gap-1" aria-label="Topic mastery list">
            {topics.map((topic) => (
              <KnowledgeTopic
                key={topic.name}
                name={topic.name}
                value={topic.mastery}
                priority={topic.name === weakestTopic && isWeakGap}
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
              ? `Your latest responses produced a provisional ${weakestTopic} estimate of ${weakScore}%. The plan now prioritizes this topic.`
              : `Your ${weakestTopic} estimate is ${weakScore}%, currently the lowest in this profile. Let's strengthen it with focused practice.`}
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
            value={`${courseModel.topics.length} topics mapped`}
            description={`Across ${courseModel.courseName}`}
            icon={BookOpen}
          />

          <OverviewMetric
            id="assessment"
            href="/assessment"
            label="Assessment"
            value={`${overallMastery}% current mastery`}
            description={isSampleData ? "Seeded sample starting profile" : assessmentCompleted ? "From your diagnostic and practice evidence" : "Initial estimate; no diagnostic yet"}
            icon={ClipboardCheck}
          />

          <OverviewMetric
            id="study-plan"
            href="/plan"
            label="Study Plan"
            value={`${planTasks.length} next steps`}
            description={planAdapted ? "Evidence-informed sequence" : "Focused daily session"}
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
