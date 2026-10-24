"use client";

import Link from "next/link";
import { ArrowRight, BookOpenCheck, CheckCircle2, CircleHelp, ClipboardCheck } from "lucide-react";
import { useLearning } from "@/context/learning-context";
import { getLearningActivity } from "@/lib/learning-activity";

export function ActivityFeedExperience() {
  const { evidence, assessmentHistory, noteItems } = useLearning();
  const activity = getLearningActivity({ evidence, assessmentHistory, noteItems });
  return (
    <main id="main-content" className="mx-auto w-full max-w-4xl px-5 pb-16 pt-10 sm:px-8 lg:pt-14">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">Your learning / activity</p>
      <h1 className="mt-3 text-4xl font-medium tracking-[-0.055em] sm:text-5xl">Your learning story.</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">A private timeline of activity saved in this browser. Nothing here is published or shared with friends.</p>
      <section className="panel mt-8 p-5 sm:p-7" aria-label="Recent learning activity">
        {activity.length ? <ol className="grid gap-0">{activity.map((item) => {
          const Icon = item.title.startsWith("Diagnostic") ? ClipboardCheck : item.title.startsWith("Note2Learn") ? BookOpenCheck : item.result === "positive" ? CheckCircle2 : CircleHelp;
          return <li key={item.id} className="flex gap-3 border-b border-border py-4 last:border-0"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent"><Icon size={16} aria-hidden="true"/></span><div className="min-w-0 flex-1"><h2 className="text-sm font-medium">{item.title}</h2><p className="mt-1 text-xs text-muted">{item.detail}</p></div><time className="shrink-0 pt-1 text-[10px] text-muted" dateTime={item.date}>{new Date(item.date).toLocaleString()}</time></li>;
        })}</ol> : <div className="py-12 text-center"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-accent-soft text-accent"><BookOpenCheck size={20}/></span><h2 className="mt-4 text-lg font-medium">No activity yet</h2><p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-muted">Complete a lesson, assessment, or Note2Learn quiz and your private timeline will begin here.</p><Link href="/assessment" className="button-primary interactive mt-5 inline-flex min-h-10 items-center gap-2 rounded-xl bg-foreground px-4 text-xs font-semibold text-background hover:bg-accent">Start learning <ArrowRight size={14}/></Link></div>}
      </section>
    </main>
  );
}
