"use client";

import Link from "next/link";
import { ArrowRight, BookOpenCheck, Brain, ClipboardCheck, Flame, Sparkles } from "lucide-react";
import { ProgressBar } from "@/components/motion/progress-bar";
import { useLearning } from "@/context/learning-context";

export function ProgressExperience() {
  const { courseModel, topics, overallMastery, evidence, assessmentHistory, lessonCompletedTopics, noteItems, gamification, weeklyLearningDays } = useLearning();
  const correct = evidence.filter((item) => item.correct).length;
  const accuracy = evidence.length ? Math.round((correct / evidence.length) * 100) : 0;
  const noteQuizzes = noteItems.filter((item) => item.completedAt).length;

  return (
    <main id="main-content" className="mx-auto w-full max-w-6xl px-5 pb-16 pt-10 sm:px-8 lg:pt-14">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">Your learning / progress</p>
      <h1 className="mt-3 text-4xl font-medium tracking-[-0.055em] sm:text-5xl">Progress you can trace.</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">This view uses saved answers and completed activities from this browser. Mastery estimates remain provisional.</p>

      <section className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Learning progress summary">
        <Metric icon={Brain} label="Overall estimate" value={`${overallMastery}%`} detail={courseModel.courseName} />
        <Metric icon={ClipboardCheck} label="Questions answered" value={`${evidence.length}`} detail={`${accuracy}% correct on recorded answers`} />
        <Metric icon={BookOpenCheck} label="Lessons completed" value={`${lessonCompletedTopics.length}`} detail={`${noteQuizzes} Note2Learn quizzes`} />
        <Metric icon={Flame} label="Current streak" value={`${gamification.currentStreak} day${gamification.currentStreak === 1 ? "" : "s"}`} detail={`${weeklyLearningDays} active days this week`} />
      </section>

      <section className="panel mt-5 p-5 sm:p-7" aria-labelledby="topic-progress-title">
        <div className="flex flex-wrap items-end justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted">Course profile</p><h2 id="topic-progress-title" className="mt-1 text-xl font-medium tracking-[-0.04em]">{courseModel.courseName}</h2></div><Link href="/knowledge-map" className="interactive inline-flex items-center gap-1 text-xs font-semibold text-accent">Explore knowledge map <ArrowRight size={13} /></Link></div>
        <ul className="mt-5 grid gap-2 sm:grid-cols-2">
          {topics.map((topic) => <li key={topic.name} className="rounded-xl border border-border bg-white/30 p-4"><div className="mb-2 flex items-center justify-between gap-3"><span className="text-sm font-medium">{topic.name}</span><span className="font-mono text-xs text-muted">{topic.mastery}%</span></div><ProgressBar value={topic.mastery} label={`${topic.name} estimated mastery`} className="h-1.5" tone={topic.priority ? "accent" : "muted"} /></li>)}
        </ul>
      </section>

      <section className="mt-5 grid gap-5 md:grid-cols-2">
        <article className="panel p-5 sm:p-6"><Sparkles size={17} className="text-accent" aria-hidden="true" /><h2 className="mt-3 text-lg font-medium">Assessment history</h2>{assessmentHistory.length ? <ol className="mt-4 grid gap-2">{[...assessmentHistory].reverse().slice(0, 5).map((item) => <li key={item.id} className="flex items-center justify-between gap-3 border-t border-border pt-3 text-xs"><span>{new Date(item.completedAt).toLocaleDateString()}</span><span className="text-muted">{item.correctCount}/{item.attemptedCount} correct</span></li>)}</ol> : <p className="mt-2 text-sm text-muted">No completed diagnostics yet. Start with a short baseline check.</p>}<Link href="/assessment" className="interactive mt-5 inline-flex items-center gap-1 text-xs font-semibold text-accent">Go to assessment <ArrowRight size={13} /></Link></article>
        <article className="panel p-5 sm:p-6"><Flame size={17} className="text-accent" aria-hidden="true" /><h2 className="mt-3 text-lg font-medium">Consistency</h2><p className="mt-2 text-sm leading-6 text-muted">Your streak counts days with a completed learning activity. It follows your device&apos;s local calendar; missed days do not erase XP or completed work.</p><div className="mt-4 flex items-end gap-2"><span className="font-mono text-4xl font-medium tracking-[-0.06em]">{gamification.bestStreak}</span><span className="pb-1 text-xs text-muted">best consecutive days</span></div></article>
      </section>
    </main>
  );
}

function Metric({ icon: Icon, label, value, detail }: { icon: typeof Brain; label: string; value: string; detail: string }) {
  return <article className="panel p-4 sm:p-5"><span className="grid size-9 place-items-center rounded-lg bg-accent-soft text-accent"><Icon size={17} aria-hidden="true" /></span><p className="mt-4 font-mono text-2xl font-medium tracking-[-0.05em]">{value}</p><p className="mt-1 text-xs font-medium">{label}</p><p className="mt-1 text-[11px] text-muted">{detail}</p></article>;
}
