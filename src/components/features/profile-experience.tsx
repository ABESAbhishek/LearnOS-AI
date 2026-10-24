"use client";

import { Check, RotateCcw, UserRound } from "lucide-react";
import { AvatarMark } from "@/components/profile/avatar-mark";
import { useAuth } from "@/context/auth-context";
import { useLearning } from "@/context/learning-context";
import { useProfile } from "@/context/profile-context";
import type { AvatarColor, AvatarIcon } from "@/types/profile";

const AVATARS: { icon: AvatarIcon; label: string }[] = [
  { icon: "sparkles", label: "Spark" }, { icon: "book", label: "Book" }, { icon: "bolt", label: "Bolt" }, { icon: "leaf", label: "Leaf" },
];
const COLORS: { color: AvatarColor; label: string }[] = [
  { color: "blue", label: "Blue" }, { color: "violet", label: "Violet" }, { color: "coral", label: "Coral" }, { color: "green", label: "Green" },
];
const INTERESTS = ["Problem solving", "Algorithms", "Exam preparation", "Project learning", "Computer science", "Study habits"];

export function ProfileExperience() {
  const { studentName } = useAuth();
  const { learningGoal, setLearningGoal, courseModel, gamification, topics } = useLearning();
  const { preferences, hydrated, setAvatar, toggleInterest, resetProfile } = useProfile();

  return (
    <main id="main-content" className="mx-auto w-full max-w-5xl px-5 pb-16 pt-10 sm:px-8 lg:pt-14">
      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-accent">Your learning / profile</p>
      <h1 className="mt-3 text-4xl font-medium tracking-[-0.055em] sm:text-5xl">Your learning profile.</h1>
      <p className="mt-3 max-w-2xl text-sm leading-6 text-muted">Customize how your local LearnOS workspace looks and keep your goal in view.</p>

      <div className="mt-8 grid items-start gap-5 lg:grid-cols-[0.85fr_1.15fr]">
        <section className="panel p-6 sm:p-8" aria-labelledby="profile-card-title">
          <div className="flex items-center gap-4">
            <AvatarMark icon={preferences.avatarIcon} color={preferences.avatarColor} size="lg" />
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Local profile</p><h2 id="profile-card-title" className="mt-1 text-2xl font-medium tracking-[-0.04em]">{studentName}</h2></div>
          </div>
          <div className="mt-6 rounded-xl border border-border bg-background/70 p-4">
            <p className="text-xs font-semibold text-foreground">Current learning path</p>
            <p className="mt-1 text-sm text-muted">{courseModel.courseName} · {topics.length} topics</p>
            <p className="mt-2 text-xs leading-5 text-muted">{learningGoal || "Add a goal to personalize your next study session."}</p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div className="rounded-xl border border-border p-3"><span className="block font-mono text-lg font-semibold">{gamification.xp}</span><span className="text-muted">Total XP</span></div>
            <div className="rounded-xl border border-border p-3"><span className="block font-mono text-lg font-semibold">{gamification.badges.length}</span><span className="text-muted">Earned badges</span></div>
          </div>
        </section>

        <section className="panel p-6 sm:p-8" aria-labelledby="customize-title">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">Make it yours</p><h2 id="customize-title" className="mt-1 text-xl font-medium tracking-[-0.04em]">Avatar & learning interests</h2></div>
            <button type="button" onClick={resetProfile} className="interactive inline-flex items-center gap-1.5 text-xs text-muted hover:text-foreground"><RotateCcw size={13} /> Reset avatar</button>
          </div>

          <fieldset className="mt-6">
            <legend className="mb-3 text-xs font-semibold text-foreground">Choose an avatar mark</legend>
            <div className="flex flex-wrap gap-2">
              {AVATARS.map((item) => <button key={item.icon} type="button" onClick={() => setAvatar(item.icon, preferences.avatarColor)} aria-pressed={preferences.avatarIcon === item.icon} className={`interactive flex items-center gap-2 rounded-xl border px-3 py-2 text-xs ${preferences.avatarIcon === item.icon ? "border-accent bg-accent-soft text-accent" : "border-border hover:border-accent/60"}`}><AvatarMark icon={item.icon} color={preferences.avatarColor} size="sm" label="" />{item.label}{preferences.avatarIcon === item.icon && <Check size={13} aria-hidden="true" />}</button>)}
            </div>
          </fieldset>

          <fieldset className="mt-5">
            <legend className="mb-3 text-xs font-semibold text-foreground">Choose a frame color</legend>
            <div className="flex flex-wrap gap-2">
              {COLORS.map((item) => <button key={item.color} type="button" onClick={() => setAvatar(preferences.avatarIcon, item.color)} aria-pressed={preferences.avatarColor === item.color} className={`interactive inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-xs ${preferences.avatarColor === item.color ? "border-accent bg-accent-soft text-accent" : "border-border hover:border-accent/60"}`}><span aria-hidden="true" className={`size-3 rounded-full ${item.color === "blue" ? "bg-blue-500" : item.color === "violet" ? "bg-violet-500" : item.color === "coral" ? "bg-rose-500" : "bg-emerald-500"}`} />{item.label}</button>)}
            </div>
          </fieldset>

          <label htmlFor="learning-goal" className="mt-6 block text-xs font-semibold text-foreground">Current learning goal</label>
          <div className="mt-2 flex items-center gap-2 rounded-xl border border-border bg-white/40 px-3 focus-within:border-accent"><UserRound size={15} className="shrink-0 text-muted" aria-hidden="true" /><input id="learning-goal" value={learningGoal} onChange={(event) => setLearningGoal(event.target.value)} maxLength={500} placeholder="What would you like to learn?" className="min-h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted/70" /></div>
          <fieldset className="mt-6">
            <legend className="mb-3 text-xs font-semibold text-foreground">Learning interests</legend>
            <div className="grid gap-2 sm:grid-cols-2">
              {INTERESTS.map((interest) => <label key={interest} className="flex cursor-pointer items-center gap-2 rounded-lg border border-border px-3 py-2.5 text-xs hover:border-accent/50"><input type="checkbox" checked={preferences.interests.includes(interest)} onChange={() => toggleInterest(interest)} className="accent-blue-600" />{interest}</label>)}
            </div>
          </fieldset>
          <p className="mt-5 border-t border-border pt-4 text-[11px] leading-5 text-muted" role="status">{hydrated ? "Avatar and interests are saved in this browser only." : "Restoring your local profile…"} This profile is private to this device; friends and public profile controls are not connected.</p>
        </section>
      </div>
    </main>
  );
}
