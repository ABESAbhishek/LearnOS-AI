"use client";

import Link from "next/link";
import { ArrowRight, LockKeyhole, Trophy } from "lucide-react";
import { useLearning } from "@/context/learning-context";

const BADGE_RULES = [
  { name: "First lesson complete", rule: "Complete a guided tutor lesson and its check." },
  { name: "First practice complete", rule: "Submit a correct tutor practice answer." },
  { name: "Diagnostic complete", rule: "Finish a diagnostic assessment." },
  { name: "Note2Learn quiz complete", rule: "Complete a generated note quiz." },
  { name: "Daily quest complete", rule: "Complete and claim a verified daily quest." },
  { name: "100 XP milestone", rule: "Earn 100 XP from eligible learning activity." },
  { name: "250 XP milestone", rule: "Earn 250 XP from eligible learning activity." },
  { name: "500 XP milestone", rule: "Earn 500 XP from eligible learning activity." },
  { name: "1000 XP milestone", rule: "Earn 1,000 XP from eligible learning activity." },
];

export function AchievementsExperience() {
  const { gamification } = useLearning();
  const earned = new Set(gamification.badges);
  return (
    <main id="main-content" className="mx-auto w-full max-w-6xl px-5 pb-16 pt-10 sm:px-8 lg:pt-14">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">Your learning / achievements</p>
      <div className="mt-3 flex flex-wrap items-end justify-between gap-4"><div><h1 className="text-4xl font-medium tracking-[-0.055em] sm:text-5xl">Milestones, earned.</h1><p className="mt-3 max-w-xl text-sm leading-6 text-muted">Badges unlock from saved lesson, answer, quiz, and XP events. Opening a page never earns one.</p></div><div className="panel flex items-center gap-3 px-4 py-3"><Trophy size={18} className="text-accent"/><span className="font-mono text-xl">{gamification.xp} XP</span></div></div>
      <section className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" aria-label="LearnOS achievement badges">
        {BADGE_RULES.map((badge, index) => {
          const unlocked = earned.has(badge.name);
          return <article key={badge.name} className={`panel motion-reveal motion-reveal--card p-5 ${unlocked ? "border-accent/30 bg-accent-soft/25" : "opacity-80"}`} data-motion-reveal style={{ "--reveal-delay": `${index * 40}ms` } as React.CSSProperties}>
            <span className={`grid size-10 place-items-center rounded-xl ${unlocked ? "bg-accent text-white" : "bg-background text-muted"}`}>{unlocked ? <Trophy size={18} aria-hidden="true"/> : <LockKeyhole size={17} aria-hidden="true"/>}</span>
            <div className="mt-4 flex items-center justify-between gap-2"><h2 className="text-sm font-semibold">{badge.name}</h2><span className={`rounded-md px-2 py-1 text-[9px] font-semibold uppercase tracking-wide ${unlocked ? "bg-accent-soft text-accent" : "bg-background text-muted"}`}>{unlocked ? "Unlocked" : "Locked"}</span></div>
            <p className="mt-2 text-xs leading-5 text-muted">{badge.rule}</p>
          </article>;
        })}
      </section>
      <p className="mt-5 text-xs text-muted">Badges shown here are calculated from this browser&apos;s saved progress; they are not shared across accounts.</p>
      <Link href="/quests" className="interactive mt-5 inline-flex items-center gap-1 text-xs font-semibold text-accent">See today&apos;s quests <ArrowRight size={13}/></Link>
    </main>
  );
}
