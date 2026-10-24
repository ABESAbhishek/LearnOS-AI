"use client";

import { useId, useState } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, Check, FileText, Sparkles } from "lucide-react";
import { FeatureFrame, FeatureHeading, SectionLabel } from "@/components/features/feature-frame";
import { useLearning } from "@/context/learning-context";
import { validateGeneratedNoteContent, type GeneratedNoteContent } from "@/lib/note2learn";
import type { AISource } from "@/lib/ai/types";
import type { NoteLearningItem } from "@/types/learning";

const MAX_NOTE_BYTES = 5 * 1024 * 1024;

function newItemId() {
  return `note-${globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
}

export function Note2LearnExperience() {
  const inputId = useId();
  const { noteItems, addNoteItem, updateNoteItem, toggleFlashcardMastery, completeNoteQuiz } = useLearning();
  const [file, setFile] = useState<File | null>(null);
  const [topicHint, setTopicHint] = useState("");
  const [activeId, setActiveId] = useState<string | null>(noteItems[0]?.id || null);
  const [revealedCards, setRevealedCards] = useState<Set<string>>(() => new Set());
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeNote = noteItems.find((item) => item.id === activeId) || noteItems[0] || null;

  async function generateLearningItem() {
    if (!file || isGenerating) return;
    setError(null);
    setIsGenerating(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("topic", topicHint.trim().slice(0, 160));
      const response = await fetch("/api/note2learn", { method: "POST", body: formData });
      const payload: unknown = await response.json();
      if (!response.ok || !payload || typeof payload !== "object") {
        const message = payload && typeof payload === "object" && "error" in payload && typeof payload.error === "string"
          ? payload.error
          : "Note2Learn could not process this note.";
        throw new Error(message);
      }
      const responseData = payload as { content?: unknown; source?: unknown; sourceName?: unknown };
      if (!validateGeneratedNoteContent(responseData.content)) throw new Error("The generated learning kit was incomplete. Try another note.");
      const source = ["baseline", "gemini", "groq", "cerebras"].includes(String(responseData.source))
        ? responseData.source as AISource
        : "baseline";
      const content: GeneratedNoteContent = responseData.content;
      const item: NoteLearningItem = {
        id: newItemId(),
        sourceName: typeof responseData.sourceName === "string" ? responseData.sourceName.slice(0, 180) : file.name,
        topic: content.topic.trim().slice(0, 160),
        summary: content.summary.trim().slice(0, 8_000),
        flashcards: content.flashcards.map((card, index) => ({
          id: `${index}-${newItemId()}`,
          front: card.front.trim(),
          back: card.back.trim(),
          mastered: false,
        })),
        quiz: content.quiz.map((question, index) => ({
          id: `${index}-${newItemId()}`,
          prompt: question.prompt.trim(),
          options: question.options.map((option) => option.trim()),
          correctOption: question.correctOption,
          explanation: question.explanation.trim(),
        })),
        source,
        createdAt: new Date().toISOString(),
        answers: {},
      };
      addNoteItem(item);
      setActiveId(item.id);
      setRevealedCards(new Set());
      setFile(null);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Note2Learn could not process this note.");
    } finally {
      setIsGenerating(false);
    }
  }

  function setAnswer(note: NoteLearningItem, questionIndex: number, answer: number) {
    if (note.completedAt) return;
    updateNoteItem(note.id, { answers: { ...note.answers, [String(questionIndex)]: answer } });
  }

  const answeredCount = activeNote ? Object.keys(activeNote.answers).length : 0;
  const quizComplete = Boolean(activeNote && activeNote.quiz.length > 0 && answeredCount === activeNote.quiz.length);

  return (
    <FeatureFrame activeHref="/note2learn">
      <FeatureHeading
        eyebrow="06 / Transform notes"
        title="Turn notes into a learning session."
        description="Extract a concise explanation, recall cards, and a short quiz from one study note. Your generated item and progress stay in this browser."
        aside={<span className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs text-muted"><Sparkles size={14} className="text-accent" /> Note2Learn</span>}
      />

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(280px,0.72fr)_minmax(0,1.28fr)]">
        <aside className="space-y-5">
          <section className="panel p-5 sm:p-6" aria-labelledby="note-upload-title">
            <SectionLabel>One note / one learning kit</SectionLabel>
            <h2 id="note-upload-title" className="mt-2 text-xl font-medium tracking-[-0.04em]">Start with a document.</h2>
            <label htmlFor={inputId} className="mt-5 flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-background/50 p-4 text-center transition-colors hover:border-accent/50 hover:bg-accent-soft/30">
              <FileText size={19} className="text-accent" aria-hidden="true" />
              <span className="mt-2 max-w-full truncate text-sm font-medium">{file?.name || "Choose a PDF or TXT note"}</span>
              <span className="mt-1 text-[11px] text-muted">Maximum 5 MB · text-based PDFs only</span>
            </label>
            <input
              id={inputId}
              className="sr-only"
              type="file"
              accept=".pdf,.txt,application/pdf,text/plain"
              onChange={(event) => {
                const selected = event.currentTarget.files?.[0] || null;
                setError(null);
                if (selected && selected.size > MAX_NOTE_BYTES) {
                  setFile(null);
                  setError("This note is larger than the 5 MB limit.");
                } else {
                  setFile(selected);
                }
              }}
            />
            <label htmlFor={`${inputId}-topic`} className="mt-4 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Topic hint <span className="font-normal normal-case tracking-normal">(optional)</span></label>
            <input
              id={`${inputId}-topic`}
              value={topicHint}
              onChange={(event) => setTopicHint(event.target.value.slice(0, 160))}
              maxLength={160}
              placeholder="e.g. BFS traversal"
              className="mt-2 min-h-10 w-full rounded-lg border border-border bg-white/60 px-3 text-sm outline-none transition focus:border-accent"
            />
            {error && <p className="mt-3 rounded-lg border border-red-300/50 bg-red-50/70 px-3 py-2 text-xs leading-5 text-red-800" role="alert">{error}</p>}
            <button
              type="button"
              onClick={generateLearningItem}
              disabled={!file || isGenerating}
              className="button-primary interactive mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-foreground px-4 text-sm font-medium text-background hover:bg-accent disabled:cursor-not-allowed disabled:opacity-45"
            >
              {isGenerating ? <><span className="ai-pulse size-1.5 rounded-full bg-white" /> Building your learning kit…</> : <>Create learning kit <ArrowRight size={15} /></>}
            </button>
            <p className="mt-4 border-t border-border pt-3 text-[10px] leading-5 text-muted">
              Note text is sent to the configured AI provider for generation. If providers are unavailable, LearnOS uses a deterministic local fallback. Original files are not saved by LearnOS.
            </p>
          </section>

          <section className="panel p-5 sm:p-6" aria-labelledby="saved-notes-title">
            <div className="flex items-center justify-between gap-3">
              <div>
                <SectionLabel>Your library / {noteItems.length}</SectionLabel>
                <h2 id="saved-notes-title" className="mt-2 text-lg font-medium tracking-[-0.04em]">Saved learning kits</h2>
              </div>
              <BookOpen size={17} className="text-muted" aria-hidden="true" />
            </div>
            {noteItems.length ? (
              <ul className="mt-4 grid gap-2">
                {noteItems.map((item) => (
                  <li key={item.id}>
                    <button type="button" onClick={() => setActiveId(item.id)} aria-current={activeNote?.id === item.id ? "true" : undefined} className={`interactive flex w-full items-center justify-between gap-3 rounded-xl border px-3 py-3 text-left ${activeNote?.id === item.id ? "border-accent/35 bg-accent-soft/55" : "border-border bg-white/25 hover:border-foreground/25"}`}>
                      <span className="min-w-0"><span className="block truncate text-xs font-medium">{item.topic}</span><span className="mt-1 block truncate text-[10px] text-muted">{item.sourceName}</span></span>
                      {item.completedAt ? <Check size={14} className="shrink-0 text-accent" aria-label="Quiz complete" /> : <ArrowRight size={14} className="shrink-0 text-muted" aria-hidden="true" />}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-xs leading-5 text-muted">Your generated explanations, flashcards, and quiz progress will appear here.</p>
            )}
          </section>
        </aside>

        <section className="min-w-0" aria-label="Note2Learn content">
          {!activeNote ? (
            <div className="panel grid min-h-80 place-items-center p-8 text-center">
              <div className="max-w-sm"><span className="mx-auto grid size-11 place-items-center rounded-xl bg-accent-soft text-accent"><BookOpen size={20} /></span><h2 className="mt-4 text-xl font-medium tracking-[-0.04em]">Your note becomes a lesson here.</h2><p className="mt-2 text-sm leading-6 text-muted">Choose a PDF or TXT note to create a summary, recall cards, and a short knowledge check.</p></div>
            </div>
          ) : (
            <div className="space-y-5">
              <section className="panel motion-reveal motion-reveal--section p-5 sm:p-7" data-motion-reveal>
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0"><SectionLabel>Source note / {activeNote.source === "baseline" ? "Baseline output" : `${activeNote.source.toUpperCase()} generated`}</SectionLabel><h2 className="mt-2 text-2xl font-medium tracking-[-0.045em]">{activeNote.topic}</h2><p className="mt-1 truncate text-xs text-muted">{activeNote.sourceName}</p></div>
                  <span className="inline-flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-[10px] text-muted"><span className="ai-pulse size-1.5 rounded-full bg-accent" /> Learning kit ready</span>
                </div>
                <div className="mt-5 border-t border-border pt-5"><SectionLabel>Explanation</SectionLabel><p className="mt-3 whitespace-pre-line text-sm leading-7 text-foreground">{activeNote.summary}</p></div>
              </section>

              <section className="panel p-5 sm:p-7" aria-labelledby="flashcards-title">
                <div className="flex flex-wrap items-end justify-between gap-3"><div><SectionLabel>Recall / {activeNote.flashcards.length} cards</SectionLabel><h2 id="flashcards-title" className="mt-2 text-xl font-medium tracking-[-0.04em]">Bring the key ideas back to mind.</h2></div><span className="text-[10px] text-muted">Mark a card learned when you can recall it.</span></div>
                <ol className="mt-5 grid gap-3 sm:grid-cols-2">
                  {activeNote.flashcards.map((card) => {
                    const revealed = revealedCards.has(card.id);
                    return <li key={card.id} className="rounded-xl border border-border bg-white/30 p-4">
                      <p className="text-sm font-medium leading-6">{card.front}</p>
                      {revealed && <p className="mt-3 border-t border-border pt-3 text-xs leading-5 text-muted">{card.back}</p>}
                      <div className="mt-4 flex items-center justify-between gap-2">
                        <button type="button" onClick={() => setRevealedCards((current) => { const next = new Set(current); if (next.has(card.id)) next.delete(card.id); else next.add(card.id); return next; })} className="interactive text-xs font-medium text-accent hover:text-foreground">{revealed ? "Hide answer" : "Show answer"}</button>
                        <button type="button" aria-pressed={card.mastered} onClick={() => toggleFlashcardMastery(activeNote.id, card.id)} className={`interactive rounded-lg border px-2.5 py-1.5 text-[10px] ${card.mastered ? "border-accent/30 bg-accent-soft/60 text-accent" : "border-border text-muted hover:border-accent/40"}`}>{card.mastered ? "Learned" : "Mark learned"}</button>
                      </div>
                    </li>;
                  })}
                </ol>
              </section>

              <section className="panel p-5 sm:p-7" aria-labelledby="note-quiz-title">
                <div className="flex flex-wrap items-end justify-between gap-3"><div><SectionLabel>Check understanding / {activeNote.quiz.length} questions</SectionLabel><h2 id="note-quiz-title" className="mt-2 text-xl font-medium tracking-[-0.04em]">Can you use the ideas?</h2></div>{activeNote.completedAt ? <span className="rounded-lg bg-accent-soft px-3 py-2 text-xs font-medium text-accent">Score {activeNote.quizScore}/{activeNote.quiz.length}</span> : <span className="text-[10px] text-muted">{answeredCount}/{activeNote.quiz.length} answered</span>}</div>
                <ol className="mt-5 grid gap-4">
                  {activeNote.quiz.map((question, questionIndex) => {
                    const answer = activeNote.answers[String(questionIndex)];
                    const answeredCorrectly = answer === question.correctOption;
                    return <li key={question.id} className="rounded-xl border border-border bg-white/25 p-4 sm:p-5">
                      <p className="text-sm font-medium leading-6"><span className="mr-2 font-mono text-[10px] text-accent">0{questionIndex + 1}</span>{question.prompt}</p>
                      <div className="mt-3 grid gap-2">
                        {question.options.map((option, optionIndex) => {
                          const isSelected = answer === optionIndex;
                          return <label key={`${question.id}-${optionIndex}`} className={`flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 text-xs leading-5 ${isSelected ? "border-accent/40 bg-accent-soft/50" : "border-border bg-surface/40 hover:border-foreground/25"}`}>
                            <input type="radio" name={`${activeNote.id}-${question.id}`} value={optionIndex} checked={isSelected} disabled={Boolean(activeNote.completedAt)} onChange={() => setAnswer(activeNote, questionIndex, optionIndex)} className="mt-0.5 accent-blue-600" />
                            <span>{option}</span>
                          </label>;
                        })}
                      </div>
                      {answer !== undefined && <p className="mt-3 rounded-lg bg-background px-3 py-2.5 text-xs leading-5 text-muted" role="status">{answeredCorrectly ? "Correct. " : `The answer is ${question.options[question.correctOption]}. `}{question.explanation}</p>}
                    </li>;
                  })}
                </ol>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
                  <p className="text-[10px] text-muted">Completion is saved in this browser; XP is awarded once for this quiz.</p>
                  {activeNote.completedAt ? <span className="inline-flex items-center gap-1.5 text-xs font-medium text-accent"><Check size={14} /> Quiz complete</span> : <button type="button" disabled={!quizComplete} onClick={() => completeNoteQuiz(activeNote.id)} className="button-primary interactive inline-flex min-h-10 items-center gap-2 rounded-xl bg-foreground px-4 text-xs font-medium text-background hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40">Complete quiz <Check size={14} /></button>}
                </div>
              </section>

              <div className="flex justify-end"><Link href="/plan" className="interactive inline-flex items-center gap-2 text-sm font-medium text-accent hover:text-foreground">Return to your study plan <ArrowRight size={15} /></Link></div>
            </div>
          )}
        </section>
      </div>
    </FeatureFrame>
  );
}
