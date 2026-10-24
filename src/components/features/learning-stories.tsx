"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, X } from "lucide-react";
import { useLearning } from "@/context/learning-context";
import { getLearningActivity } from "@/lib/learning-activity";

export function LearningStories() {
  const { evidence, assessmentHistory, noteItems } = useLearning();
  const activity = useMemo(() => getLearningActivity({ evidence, assessmentHistory, noteItems }).slice(0, 8), [evidence, assessmentHistory, noteItems]);
  const [selected, setSelected] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (selected !== null && !dialog.open) dialog.showModal();
    if (selected === null && dialog.open) dialog.close();
  }, [selected]);

  function moveStory(direction: -1 | 1) {
    setSelected((current) => current === null ? null : Math.min(activity.length - 1, Math.max(0, current + direction)));
  }

  const current = selected === null ? null : activity[selected];

  return (
    <section className="mb-5" aria-labelledby="story-strip-title">
      <div className="mb-3 flex items-end justify-between gap-3"><div><p className="text-[10px] font-semibold uppercase tracking-[0.17em] text-muted">Your learning story</p><h2 id="story-strip-title" className="mt-1 text-base font-medium">Small wins, saved as you go.</h2></div>{activity.length > 0 && <Link href="/feed" className="interactive text-xs font-semibold text-accent hover:text-foreground">View activity →</Link>}</div>
      {activity.length === 0 ? (
        <div className="panel flex flex-wrap items-center justify-between gap-4 p-4 sm:px-5"><p className="text-sm text-muted">Your story starts when you complete a lesson or answer a question.</p><Link href="/assessment" className="button-primary interactive inline-flex min-h-9 items-center gap-2 rounded-lg bg-foreground px-3 text-xs font-semibold text-background hover:bg-accent">Start a diagnostic <ArrowRight size={13}/></Link></div>
      ) : (
        <ul className="flex gap-3 overflow-x-auto pb-2" aria-label="Recent learning stories">
          {activity.slice(0, 6).map((item, index) => <li key={item.id} className="shrink-0"><button type="button" onClick={() => setSelected(index)} className="interactive group flex w-[154px] items-center gap-3 rounded-2xl border border-border bg-surface p-3 text-left hover:-translate-y-0.5 hover:border-accent/45" aria-label={`Open story: ${item.title}, ${item.detail}`}><span className={`grid size-11 shrink-0 place-items-center rounded-full border-2 border-white ring-2 ${item.result === "positive" ? "bg-accent-soft text-accent ring-accent/50" : item.result === "review" ? "bg-background text-muted ring-border" : "bg-violet-100 text-violet-700 ring-violet-300"}`}>{item.result === "positive" ? "✓" : item.result === "review" ? "↺" : "✦"}</span><span className="min-w-0"><span className="block truncate text-[11px] font-semibold">{item.title}</span><span className="mt-1 block truncate text-[10px] text-muted">{item.detail}</span></span></button></li>)}
        </ul>
      )}

      <dialog ref={dialogRef} onClose={() => setSelected(null)} aria-labelledby="story-dialog-title" className="m-auto w-[min(92vw,520px)] rounded-3xl border border-border bg-background p-0 text-foreground shadow-xl backdrop:bg-foreground/35">
        {current && <div className="relative min-h-[350px] overflow-hidden rounded-3xl p-6 sm:p-8">
          <div className="flex gap-1" aria-label={`Story ${selected! + 1} of ${activity.length}`}>
            {activity.map((item, index) => <span key={item.id} className="h-1 flex-1 overflow-hidden rounded-full bg-border"><span className={`block h-full rounded-full ${index <= selected! ? "bg-accent" : "bg-transparent"}`} /></span>)}
          </div>
          <button autoFocus type="button" onClick={() => dialogRef.current?.close()} className="interactive absolute right-5 top-5 grid size-9 place-items-center rounded-full border border-border bg-surface" aria-label="Close learning story"><X size={16}/></button>
          <div className="mt-14"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-accent">Your learning · {new Date(current.date).toLocaleDateString()}</p><h3 id="story-dialog-title" className="mt-4 max-w-sm text-3xl font-medium leading-tight tracking-[-0.045em]">{current.title}</h3><p className="mt-3 text-base text-muted">{current.detail}</p>{current.result && <p className="mt-6 rounded-xl bg-accent-soft/70 p-4 text-sm text-foreground">{current.result === "positive" ? "This correct answer is part of your saved learning evidence." : "This topic stays in your practice history so your next session can revisit it."}</p>}</div>
          <div className="absolute inset-x-6 bottom-6 flex justify-between sm:inset-x-8"><button type="button" disabled={selected === 0} onClick={() => moveStory(-1)} className="interactive inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-3 text-xs disabled:opacity-40"><ArrowLeft size={14}/> Previous</button><button type="button" disabled={selected === activity.length - 1} onClick={() => moveStory(1)} className="interactive inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-3 text-xs disabled:opacity-40">Next <ArrowRight size={14}/></button></div>
        </div>}
      </dialog>
    </section>
  );
}
