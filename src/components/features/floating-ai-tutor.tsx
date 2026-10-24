"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { usePathname, useRouter } from "next/navigation";
import { BookOpen, MessageCircle, RotateCcw, Send, Sparkles, X } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { useDocuments } from "@/context/document-context";
import { useLearning } from "@/context/learning-context";
import { retrieveRelevantChunks } from "@/lib/document-intelligence";
import { getTutorChatStorageKey, loadTutorConversation, saveTutorConversation } from "@/lib/tutor-chat-persistence";
import type { TutorChatMessage, TutorChatResponse } from "@/types/document";

const STARTER_PROMPTS = [
  "Summarize this chapter",
  "Explain the hardest concept",
  "Quiz me on this material",
  "What should I learn first?",
];

function makeMessage(role: TutorChatMessage["role"], content: string, extra: Partial<TutorChatMessage> = {}): TutorChatMessage {
  return { id: crypto.randomUUID(), role, content, createdAt: new Date().toISOString(), ...extra };
}

function SafeTutorText({ text }: { text: string }) {
  const parts = text.split(/(```[\w-]*\n[\s\S]*?```)/g).filter(Boolean);
  return (
    <div className="whitespace-pre-wrap break-words text-sm leading-6">
      {parts.map((part, index) => {
        const code = part.match(/^```[\w-]*\n([\s\S]*?)```$/);
        return code
          ? <pre key={index} className="my-2 overflow-x-auto rounded-lg bg-foreground/5 p-3 text-xs leading-5"><code>{code[1]}</code></pre>
          : <span key={index}>{part}</span>;
      })}
    </div>
  );
}

function CitationList({ message, onOpen }: { message: TutorChatMessage; onOpen: (documentId: string, pageNumber: number | null) => void }) {
  if (!message.citations?.length) return null;
  return (
    <ul className="mt-3 flex flex-wrap gap-1.5" aria-label="Answer sources">
      {message.citations.map((citation, index) => (
        <li key={`${citation.documentId}-${citation.pageNumber}-${index}`}>
          <details className="group relative">
            <summary className="interactive flex cursor-pointer list-none items-center gap-1.5 rounded-lg border border-accent/20 bg-accent-soft/70 px-2.5 py-1.5 text-[10px] font-medium text-accent hover:border-accent/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent">
              <BookOpen aria-hidden="true" size={12} />
              <span className="max-w-40 truncate">{citation.documentName}{citation.pageNumber ? ` · p. ${citation.pageNumber}` : " · text"}</span>
            </summary>
            <div className="absolute bottom-full left-0 z-10 mb-2 w-64 max-w-[calc(100vw-5rem)] rounded-xl border border-border bg-surface p-3 shadow-lg">
              <p className="text-[10px] font-semibold text-muted">{citation.sectionTitle}</p>
              <p className="mt-1.5 text-xs leading-5 text-foreground">“{citation.excerpt}”</p>
              <button type="button" onClick={() => onOpen(citation.documentId, citation.pageNumber)} className="interactive mt-2 text-[10px] font-medium text-accent hover:text-foreground">
                Open extracted source
              </button>
            </div>
          </details>
        </li>
      ))}
    </ul>
  );
}

function messageTypeLabel(message: TutorChatMessage) {
  if (message.answerType === "source") return "From your material";
  if (message.answerType === "unsupported") return "Source check";
  if (message.answerType === "general") return "General learning help";
  return "";
}

export function FloatingAITutor() {
  const { isAuthenticated, studentName } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const { documents, selectedDocumentId, setSelectedDocumentId, setFocusedSource } = useDocuments();
  const { learningGoal, weakestTopic, knowledgeScores } = useLearning();
  const storageKey = useMemo(() => getTutorChatStorageKey(studentName), [studentName]);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<TutorChatMessage[]>([]);
  const [hydratedStorageKey, setHydratedStorageKey] = useState<string | null>(null);
  const messagesReady = hydratedStorageKey === storageKey;
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [providerStatus, setProviderStatus] = useState<"unknown" | "available" | "unavailable" | "error">("unknown");
  const [availabilityAttempt, setAvailabilityAttempt] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [sourceMode, setSourceMode] = useState<"documents" | "general" | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const endRef = useRef<HTMLDivElement>(null);
  const sendingRef = useRef(false);
  const visible = isAuthenticated && pathname !== "/login" && pathname !== "/about";

  const selectedDocuments = useMemo(() => selectedDocumentId === "all"
    ? documents
    : documents.filter((document) => document.id === selectedDocumentId), [documents, selectedDocumentId]);
  const selectedName = selectedDocumentId === "all"
    ? "All saved materials"
    : documents.find((document) => document.id === selectedDocumentId)?.name ?? "Saved materials";
  const activeSourceMode = sourceMode ?? (documents.length ? "documents" : "general");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setMessages(loadTutorConversation(window.localStorage, storageKey).messages);
      setHydratedStorageKey(storageKey);
    }, 0);
    return () => window.clearTimeout(timer);
  }, [storageKey]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch("/api/tutor-chat", { method: "GET", cache: "no-store" })
      .then((response) => response.json())
      .then((result: { available?: boolean }) => {
        if (!cancelled) setProviderStatus(result.available ? "available" : "unavailable");
      })
      .catch(() => {
        if (!cancelled) setProviderStatus("error");
      });
    return () => { cancelled = true; };
  }, [open, availabilityAttempt, storageKey]);

  useEffect(() => {
    if (!messagesReady) return;
    saveTutorConversation(window.localStorage, storageKey, { version: 1, messages });
  }, [messages, messagesReady, storageKey]);

  useEffect(() => {
    if (open) {
      const timer = window.setTimeout(() => textareaRef.current?.focus(), 60);
      return () => window.clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "nearest" });
  }, [messages, sending, open]);

  const closePanel = useCallback(() => {
    setOpen(false);
    window.setTimeout(() => buttonRef.current?.focus(), 0);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: globalThis.KeyboardEvent) => {
      if (event.key === "Escape") closePanel();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, closePanel]);

  const sendQuestion = useCallback(async (question: string, priorMessages = messages, appendUser = true) => {
    const normalized = question.trim().slice(0, 600);
    if (!normalized || sendingRef.current || providerStatus !== "available") return;
    sendingRef.current = true;
    setSending(true);
    setError(null);
    const userMessage = appendUser ? makeMessage("user", normalized) : null;
    const nextMessages = userMessage ? [...priorMessages, userMessage] : priorMessages;
    if (userMessage) setMessages(nextMessages);
    setInput("");

    const sources = activeSourceMode === "documents" ? retrieveRelevantChunks(normalized, selectedDocuments, 6) : [];
    try {
      const response = await fetch("/api/tutor-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: normalized,
          history: priorMessages.slice(-8).map(({ role, content }) => ({ role, content })),
          route: pathname === "/" ? "/dashboard" : pathname,
          topic: typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("topic")?.slice(0, 120) : undefined,
          objective: learningGoal.slice(0, 240),
          weakestTopic,
          weakestMastery: knowledgeScores[weakestTopic],
          sourceMode: activeSourceMode === "documents" && sources.length ? "documents" : "general",
          sources: activeSourceMode === "documents" && sources.length ? sources : [],
        }),
      });
      const data = await response.json().catch(() => ({})) as Partial<TutorChatResponse> & { error?: string };
      if (!response.ok || typeof data.answer !== "string" || !Array.isArray(data.citations)) {
        throw new Error(data.error || "The tutor could not respond. Please retry.");
      }
      const assistantMessage = makeMessage("assistant", data.answer, {
        answerType: data.answerType,
        citations: data.citations,
        suggestedPrompt: data.suggestedPrompt,
      });
      setMessages([...nextMessages, assistantMessage].slice(-60));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Tutor request failed. Please retry.");
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }, [activeSourceMode, knowledgeScores, learningGoal, messages, pathname, providerStatus, selectedDocuments, weakestTopic]);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendQuestion(input);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      if (input.trim()) void sendQuestion(input);
    }
  }

  function startNewConversation() {
    if (sending) return;
    if (messages.length && !window.confirm("Start a new tutor conversation? This clears the saved conversation for this demo account.")) return;
    setMessages([]);
    setError(null);
    setInput("");
  }

  function openCitation(documentId: string, pageNumber: number | null) {
    setSelectedDocumentId(documentId);
    setFocusedSource({ documentId, pageNumber });
    setOpen(false);
    router.push("/upload#library");
  }

  if (!visible) return null;

  const retryLast = () => {
    const lastUserIndex = [...messages].map((message) => message.role).lastIndexOf("user");
    if (lastUserIndex < 0) return;
    const lastUser = messages[lastUserIndex];
    void sendQuestion(lastUser.content, messages.slice(0, lastUserIndex), true);
  };

  return (
    <>
      {open && (
        <section
          role="dialog"
          id="floating-tutor-dialog"
          aria-modal="false"
          aria-labelledby="floating-tutor-title"
          className="fixed inset-x-3 bottom-20 z-40 flex h-[min(76dvh,680px)] flex-col overflow-hidden rounded-2xl border border-border bg-surface shadow-[0_24px_80px_rgba(17,17,17,0.18)] motion-reveal motion-reveal--section sm:inset-x-auto sm:bottom-24 sm:right-6 sm:w-[420px]"
        >
          <header className="flex items-center gap-3 border-b border-border px-4 py-3.5">
            <span className="relative grid size-9 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
              <Sparkles aria-hidden="true" size={17} />
              <span className="ai-pulse absolute -right-0.5 -top-0.5 size-2 rounded-full bg-accent" />
            </span>
            <div className="min-w-0 flex-1">
              <h2 id="floating-tutor-title" className="text-sm font-semibold tracking-[-0.02em]">LearnOS Tutor</h2>
              <p className="mt-0.5 truncate text-[10px] text-muted">{activeSourceMode === "documents" ? selectedName : "General learning help"}</p>
            </div>
            <button type="button" onClick={startNewConversation} disabled={sending} aria-label="Start a new tutor conversation" className="interactive grid size-8 place-items-center rounded-lg text-muted hover:bg-background hover:text-foreground disabled:opacity-40">
              <RotateCcw aria-hidden="true" size={14} />
            </button>
            <button type="button" onClick={closePanel} aria-label="Close LearnOS Tutor" className="interactive grid size-8 place-items-center rounded-lg text-muted hover:bg-background hover:text-foreground">
              <X aria-hidden="true" size={16} />
            </button>
          </header>

          <div className="flex flex-wrap items-center gap-2 border-b border-border/70 px-4 py-2.5">
            <label htmlFor="tutor-source-select" className="sr-only">Tutor source</label>
            <select
              id="tutor-source-select"
              value={activeSourceMode === "general" ? "general" : selectedDocumentId}
              onChange={(event) => {
                if (event.target.value === "general") setSourceMode("general");
                else {
                  setSelectedDocumentId(event.target.value);
                  setSourceMode("documents");
                }
              }}
              className="min-w-0 flex-1 rounded-lg border border-border bg-background/60 px-2.5 py-2 text-[11px] text-foreground outline-none focus:border-accent"
            >
              <option value="general">General learning</option>
              {documents.length > 0 && <option value="all">All saved materials</option>}
              {documents.map((document) => <option key={document.id} value={document.id}>{document.name}</option>)}
            </select>
            {activeSourceMode === "documents" && selectedDocuments.length > 0 && <span className="inline-flex items-center gap-1 text-[10px] text-accent"><BookOpen size={12} aria-hidden="true" /> Source grounded</span>}
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4" aria-live="polite" aria-relevant="additions text">
            {messages.length === 0 && (
              <div className="py-2">
                <p className="text-sm font-medium">What are you working through?</p>
                <p className="mt-1 text-xs leading-5 text-muted">
                  {activeSourceMode === "documents" && selectedDocuments.length
                    ? "Answers use retrieved excerpts from the selected material and show verified page references."
                    : "Ask for a simpler explanation, a worked example, a hint, or a quick knowledge check."}
                </p>
                <div className="mt-4 grid gap-2">
                  {STARTER_PROMPTS.map((prompt) => (
                    <button key={prompt} type="button" onClick={() => void sendQuestion(prompt)} disabled={sending || providerStatus !== "available"} className="interactive rounded-xl border border-border bg-white/30 px-3 py-2.5 text-left text-xs text-foreground transition hover:border-accent/40 hover:bg-accent-soft/45 disabled:opacity-50">
                      {prompt}
                    </button>
                  ))}
                </div>
                {activeSourceMode === "documents" && !documents.length && <p className="mt-3 text-[11px] text-muted">No saved documents yet. Upload text or switch to general learning.</p>}
              </div>
            )}

            {messages.map((message) => (
              <article key={message.id} className={`max-w-[92%] ${message.role === "user" ? "ml-auto" : "mr-auto"}`}>
                {message.role === "assistant" && messageTypeLabel(message) && <p className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-muted">{messageTypeLabel(message)}</p>}
                <div className={message.role === "user"
                  ? "rounded-2xl rounded-br-md bg-foreground px-3.5 py-2.5 text-background"
                  : "rounded-2xl rounded-bl-md border border-border bg-background/60 px-3.5 py-2.5 text-foreground"}>
                  <SafeTutorText text={message.content} />
                </div>
                {message.role === "assistant" && <CitationList message={message} onOpen={openCitation} />}
                {message.role === "assistant" && message.suggestedPrompt && (
                  <button type="button" onClick={() => void sendQuestion(message.suggestedPrompt!)} className="interactive mt-2 text-left text-[10px] font-medium text-accent hover:text-foreground">
                    {message.suggestedPrompt} →
                  </button>
                )}
              </article>
            ))}
            {sending && (
              <div className="flex items-center gap-2 text-xs text-muted" role="status">
                <span className="ai-pulse size-1.5 rounded-full bg-accent" />
                <span>{activeSourceMode === "documents" ? "Checking the selected material" : "Thinking through your question"}</span>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <div className="border-t border-border px-3.5 pb-3 pt-3">
            {providerStatus !== "available" && (
              <div className="mb-2 flex items-center justify-between gap-3 rounded-lg border border-border bg-background/60 px-3 py-2 text-[11px] text-muted" role="status" aria-live="polite">
                <p>{providerStatus === "unknown" ? "Checking live tutor availability…" : providerStatus === "error" ? "Tutor availability could not be checked." : "Live tutor is unavailable until an AI provider is configured on the server."}</p>
                {providerStatus === "error" && <button type="button" onClick={() => setAvailabilityAttempt((attempt) => attempt + 1)} className="interactive shrink-0 font-medium text-accent hover:underline">Retry check</button>}
              </div>
            )}
            {error && (
              <div className="mb-2 flex items-center justify-between gap-3 rounded-lg border border-amber-500/25 bg-amber-500/10 px-3 py-2 text-[11px] text-foreground">
                <p>{error}</p>
                <button type="button" onClick={retryLast} disabled={sending} className="interactive shrink-0 text-accent hover:underline disabled:opacity-40">Retry</button>
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex items-end gap-2 rounded-xl border border-border bg-background/70 p-2 focus-within:border-accent/60">
              <label htmlFor="floating-tutor-input" className="sr-only">Ask LearnOS Tutor</label>
              <textarea
                ref={textareaRef}
                id="floating-tutor-input"
                value={input}
                onChange={(event) => setInput(event.target.value.slice(0, 600))}
                onKeyDown={handleKeyDown}
                rows={1}
                maxLength={600}
                disabled={providerStatus !== "available" || sending}
                placeholder={providerStatus === "available" ? "Ask a learning question…" : "Tutor unavailable"}
                className="max-h-28 min-h-9 flex-1 resize-y bg-transparent px-1.5 py-2 text-sm leading-5 outline-none placeholder:text-muted/80"
              />
              <button type="submit" disabled={sending || !input.trim() || providerStatus !== "available"} aria-label="Send question" className="interactive grid size-9 shrink-0 place-items-center rounded-lg bg-foreground text-background transition hover:bg-accent active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-35">
                <Send aria-hidden="true" size={15} />
              </button>
            </form>
            <p className="mt-2 px-1 text-[9px] leading-4 text-muted">Chat is saved locally for this demo account. Relevant excerpts are sent to the configured provider.</p>
          </div>
        </section>
      )}

      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={open ? "Close LearnOS Tutor" : "Open LearnOS Tutor"}
        aria-expanded={open}
        aria-controls="floating-tutor-dialog"
        className="fixed bottom-5 right-5 z-40 inline-flex min-h-12 items-center gap-2 rounded-xl border border-foreground/10 bg-foreground px-4 text-sm font-medium text-background shadow-[0_10px_30px_rgba(17,17,17,0.18)] transition hover:-translate-y-0.5 hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent active:translate-y-0 sm:bottom-6 sm:right-6"
      >
        {open ? <X aria-hidden="true" size={16} /> : <MessageCircle aria-hidden="true" size={16} />}
        <span>Ask LearnOS</span>
      </button>
    </>
  );
}
