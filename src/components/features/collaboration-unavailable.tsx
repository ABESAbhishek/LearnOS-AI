import Link from "next/link";
import { ArrowLeft, ArrowRight, LockKeyhole, UsersRound } from "lucide-react";

type CollaborationUnavailableProps = {
  section: string;
  description: string;
  needed: string;
};

export function CollaborationUnavailable({ section, description, needed }: CollaborationUnavailableProps) {
  return (
    <main id="main-content" className="mx-auto flex min-h-[calc(100vh-72px)] w-full max-w-4xl items-center px-5 py-12 sm:px-8">
      <section className="panel w-full p-7 sm:p-10">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-accent-soft text-accent"><UsersRound size={22} aria-hidden="true" /></div>
        <p className="mt-6 text-[10px] font-semibold uppercase tracking-[0.17em] text-accent">LearnOS collaboration / {section}</p>
        <h1 className="mt-2 text-4xl font-medium tracking-[-0.055em]">Built for learning together.</h1>
        <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">{description}</p>
        <div className="mt-6 flex gap-3 rounded-xl border border-border bg-background/70 p-4">
          <LockKeyhole size={17} className="mt-0.5 shrink-0 text-muted" aria-hidden="true" />
          <div><p className="text-xs font-semibold">Shared access is not connected</p><p className="mt-1 text-xs leading-5 text-muted">{needed} No contacts, messages, rooms, or activity are fabricated or stored locally as if they were shared.</p></div>
        </div>
        <div className="mt-7 flex flex-wrap gap-3">
          <Link href="/dashboard" className="button-primary interactive inline-flex min-h-10 items-center gap-2 rounded-xl bg-foreground px-4 text-xs font-semibold text-background hover:bg-accent"><ArrowLeft size={14}/> Back to learning</Link>
          <Link href="/feed" className="interactive inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-4 text-xs font-semibold hover:border-accent hover:text-accent">View my private activity <ArrowRight size={14}/></Link>
        </div>
      </section>
    </main>
  );
}
