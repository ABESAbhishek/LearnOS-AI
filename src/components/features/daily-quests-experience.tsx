"use client";

import Link from "next/link";
import { ArrowRight, Check, Sparkles } from "lucide-react";
import { useLearning } from "@/context/learning-context";
import { getDailyQuests } from "@/lib/daily-quests";
import { localDateKey } from "@/lib/reward-rules";

export function DailyQuestsExperience() {
  const { evidence, assessmentHistory, noteItems, gamification, claimDailyQuest } = useLearning();
  const quests = getDailyQuests({ evidence, assessmentHistory, noteItems, gamification }, localDateKey());

  return (
    <main id="main-content" className="mx-auto w-full max-w-5xl px-5 pb-16 pt-10 sm:px-8 lg:pt-14">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">Your learning / daily quests</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-medium tracking-[-0.055em] sm:text-5xl">Small steps, real progress.</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Today&apos;s quests update from completed learning activity. Missed days do not reduce your progress.</p>
        </div>
        <div className="rounded-xl border border-border bg-surface px-4 py-3 text-sm"><strong className="font-mono text-accent">{gamification.xp} XP</strong><span className="ml-2 text-muted">current total</span></div>
      </div>

      <section className="mt-8 grid gap-3" aria-label="Today's learning quests">
        {quests.map((quest, index) => (
          <article key={quest.id} className="panel motion-reveal motion-reveal--card p-5 sm:p-6" data-motion-reveal style={{ "--reveal-delay": `${index * 70}ms` } as React.CSSProperties}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="flex min-w-0 items-start gap-3">
                <span className={`grid size-10 shrink-0 place-items-center rounded-xl ${quest.complete ? "bg-accent text-white" : "bg-accent-soft text-accent"}`} aria-hidden="true">
                  {quest.complete ? <Check size={18} /> : <Sparkles size={18} />}
                </span>
                <div>
                  <h2 className="text-lg font-medium tracking-[-0.03em]">{quest.title}</h2>
                  <p className="mt-1 text-sm leading-5 text-muted">{quest.detail}</p>
                </div>
              </div>
              <span className="rounded-lg bg-background px-3 py-2 text-xs font-semibold text-accent">+{quest.rewardXP} XP</span>
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-48 flex-1" role="group" aria-label={`${quest.title} progress`}>
                <div className="mb-1.5 flex justify-between text-[11px] text-muted"><span>{quest.complete ? "Complete" : "Progress"}</span><span>{quest.progress}/{quest.target}</span></div>
                <div className="h-1.5 overflow-hidden rounded-full bg-border/60"><div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${Math.round((quest.progress / quest.target) * 100)}%` }} /></div>
              </div>
              {quest.claimed ? (
                <span className="inline-flex min-h-10 items-center rounded-xl border border-accent/25 bg-accent-soft/70 px-4 text-xs font-semibold text-accent" role="status">Reward claimed</span>
              ) : quest.complete ? (
                <button type="button" onClick={() => claimDailyQuest(quest.id)} className="button-primary interactive inline-flex min-h-10 items-center gap-2 rounded-xl bg-foreground px-4 text-xs font-semibold text-background hover:bg-accent">Claim verified reward <ArrowRight size={14} /></button>
              ) : (
                <Link href={quest.href} className="interactive inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-4 text-xs font-semibold text-foreground hover:border-accent hover:text-accent">Start quest <ArrowRight size={14} /></Link>
              )}
            </div>
          </article>
        ))}
      </section>
      <p className="mt-5 text-xs leading-5 text-muted">Quest progress is calculated from this browser&apos;s saved answers and quiz completions. It is not shared with other learners.</p>
    </main>
  );
}
