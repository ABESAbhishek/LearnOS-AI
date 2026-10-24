"use client";

import { useEffect, useId, useState, type CSSProperties, type DragEvent } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen, FileText, FolderUp, Sparkles, X, AlertCircle } from "lucide-react";
import { FeatureFrame, FeatureHeading, SectionLabel } from "@/components/features/feature-frame";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { useLearning } from "@/context/learning-context";
import { useDocuments } from "@/context/document-context";
import type { DocumentKnowledgeRepresentation, DocumentSourceReference, SourceDocument } from "@/types/document";

type MaterialStatus = "queued" | "ready" | "error";

type Material = {
  id: string;
  name: string;
  type: string;
  size: string;
  file?: File;
  isSample?: boolean;
  status?: MaterialStatus;
  errorMessage?: string;
};

type UploadStage = "upload" | "analyzing" | "results";

const ANALYSIS_STEPS = [
  "Validate file type, size, and PDF structure",
  "Extract text while preserving page boundaries",
  "Build a source-grounded learning outline",
] as const;

const SAMPLE_MATERIALS: Material[] = [
  { id: "sample-dsa-outline", name: "Built-in DSA course outline", type: "SAMPLE", size: "local demo", isSample: true, status: "ready" },
];
const MAX_UPLOAD_FILES = 3;
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(bytes / (1024 * 1024))} MB`;
}

function toMaterial(file: File, index: number): Material {
  const extension = file.name.split(".").pop()?.toUpperCase() || "FILE";
  const isZeroByte = file.size === 0;
  return {
    id: `${file.name}-${file.lastModified}-${Date.now()}-${index}`,
    name: file.name,
    type: extension,
    size: formatFileSize(file.size),
    file,
    status: isZeroByte ? "error" : "queued",
    errorMessage: isZeroByte ? "The selected file is empty (0 bytes)." : undefined,
  };
}

function AnalysisStepList() {
  return (
    <ol className="grid gap-3" aria-label="Document processing stages">
      {ANALYSIS_STEPS.map((label, index) => (
        <li key={label} className="flex items-start gap-3 rounded-xl border border-border/75 bg-white/20 px-3 py-3">
          <span className="grid size-6 shrink-0 place-items-center rounded-full border border-border font-mono text-[9px] text-accent" aria-hidden="true">0{index + 1}</span>
          <span className="text-xs leading-5 text-foreground">{label}</span>
        </li>
      ))}
    </ol>
  );
}

function SavedSourceLibrary({
  documents,
  focusedSource,
  storageError,
  onRemove,
  onFocus,
}: {
  documents: SourceDocument[];
  focusedSource: { documentId: string; pageNumber: number | null } | null;
  storageError: boolean;
  onRemove: (id: string) => void;
  onFocus: (id: string) => void;
}) {
  if (!documents.length) return null;
  return (
    <section id="library" aria-labelledby="saved-source-title" className="panel motion-reveal motion-reveal--section p-5 sm:p-7" data-motion-reveal>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <SectionLabel>Browser library / {String(documents.length).padStart(2, "0")}</SectionLabel>
          <h2 id="saved-source-title" className="mt-2 text-xl font-medium tracking-[-0.04em]">Your extracted sources.</h2>
          <p className="mt-1 text-xs leading-5 text-muted">Original files are not retained. The extracted text below stays in this browser and can be removed at any time.</p>
        </div>
        {storageError && <span role="status" className="text-[11px] text-amber-700">Browser storage is full; some text may not persist after you leave.</span>}
      </div>
      <div className="grid gap-2">
        {documents.map((document) => {
          const focused = focusedSource?.documentId === document.id;
          const page = focused && focusedSource?.pageNumber !== null
            ? document.pages.find((item) => item.pageNumber === focusedSource?.pageNumber)
            : document.pages[0];
          return (
            <article key={document.id} id={`source-${document.id}`} className="flex items-start gap-2 rounded-xl border border-border bg-white/25 p-2">
              <details open={focused} className="group min-w-0 flex-1">
                <summary className="flex cursor-pointer list-none items-center gap-3 px-1.5 py-1">
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent"><BookOpen aria-hidden="true" size={15} /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{document.title || document.name}</span>
                    <span className="mt-0.5 block text-[10px] text-muted">{document.name} · {document.pageCount ? `${document.pageCount} PDF pages` : "Text document"}{document.truncated ? " · extraction bounded" : ""}</span>
                  </span>
                </summary>
                {page ? (
                  <div className="mt-2 border-t border-border/70 px-2 py-3">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted">{page.pageNumber ? `Page ${page.pageNumber}` : "Extracted text passage"}</p>
                    <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-words font-sans text-xs leading-5 text-foreground">{page.text}</pre>
                    {document.warnings.length > 0 && <p className="mt-2 text-[10px] leading-4 text-muted">{document.warnings.join(" ")}</p>}
                    {!focused && document.pages.length > 1 && <p className="mt-2 text-[10px] text-muted">Open a tutor citation to view its exact page.</p>}
                    <button type="button" onClick={() => onFocus(document.id)} className="interactive mt-2 text-[10px] font-medium text-accent hover:underline">Use this source in the floating tutor</button>
                  </div>
                ) : <p className="mt-2 border-t border-border/70 p-3 text-xs text-muted">No extracted text is available for this source.</p>}
              </details>
              <button type="button" onClick={() => onRemove(document.id)} aria-label={`Remove ${document.name} from this browser`} className="interactive mt-1 grid size-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-background hover:text-foreground">
                <X aria-hidden="true" size={14} />
              </button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function SourceReferenceButton({
  source,
  documents,
  onOpen,
}: {
  source: DocumentSourceReference;
  documents: SourceDocument[];
  onOpen: (documentId: string, pageNumber: number | null) => void;
}) {
  const name = documents.find((document) => document.id === source.documentId)?.name ?? "Source document";
  const pageLabel = source.pageStart
    ? source.pageEnd && source.pageEnd !== source.pageStart ? ` · pp. ${source.pageStart}–${source.pageEnd}` : ` · p. ${source.pageStart}`
    : " · text";
  return (
    <button type="button" onClick={() => onOpen(source.documentId, source.pageStart ?? null)} className="interactive mt-2 inline-flex max-w-full items-center gap-1 text-left text-[10px] font-medium text-accent hover:underline">
      <span className="truncate">{name}{pageLabel}</span>
    </button>
  );
}

export function UploadExperience() {
  const inputId = useId();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [stage, setStage] = useState<UploadStage>("upload");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [documentKnowledge, setDocumentKnowledge] = useState<DocumentKnowledgeRepresentation | null>(null);

  const { courseModel, analysisSource, learningGoal, setLearningGoal, setCourseAnalysis } = useLearning();
  const { documents, addDocuments, removeDocument, documentsError, focusedSource, setFocusedSource, setSelectedDocumentId } = useDocuments();

  function focusDocumentSource(documentId: string, pageNumber: number | null) {
    setSelectedDocumentId(documentId);
    setFocusedSource({ documentId, pageNumber });
    window.setTimeout(() => window.document.getElementById("library")?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth",
      block: "start",
    }), 0);
  }

  useEffect(() => {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: 0, behavior: reducedMotion ? "auto" : "smooth" });
  }, [stage]);

  function addFiles(fileList: FileList | null) {
    if (!fileList?.length) return;
    const validFiles: File[] = [];
    const unsupportedFiles: string[] = [];

    Array.from(fileList).forEach((file) => {
      const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
      if (ext === ".pdf" || ext === ".txt") {
        validFiles.push(file);
      } else {
        unsupportedFiles.push(file.name);
      }
    });

    if (unsupportedFiles.length > 0) {
      setUploadError(
        `Unsupported file type(s): ${unsupportedFiles.join(", ")}. LearnOS currently supports .pdf and .txt documents.`
      );
    } else {
      setUploadError(null);
    }

    if (validFiles.length > 0) {
      const existing = materials.filter((material) => material.file);
      const incoming = validFiles.filter((file) => !existing.some((item) => item.file?.name === file.name && item.file.lastModified === file.lastModified && item.file.size === file.size));
      const nextFiles = [...existing, ...incoming.map((file, index) => toMaterial(file, existing.length + index))];
      if (nextFiles.length > MAX_UPLOAD_FILES) {
        setUploadError(`Choose up to ${MAX_UPLOAD_FILES} files per analysis.`);
        return;
      }
      if (nextFiles.reduce((total, material) => total + (material.file?.size || 0), 0) > MAX_UPLOAD_BYTES) {
        setUploadError("The combined file size must be 10 MB or less.");
        return;
      }
      setMaterials(nextFiles);
    }
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    addFiles(event.dataTransfer.files);
  }

  function removeMaterial(id: string) {
    setMaterials((current) => current.filter((material) => material.id !== id));
  }

  async function startAnalysis() {
    if (materials.length === 0 || stage === "analyzing") return;
    setUploadError(null);
    setStage("analyzing");

    // Initiate real server analysis
    try {
      const fileMaterials = materials.filter((material) => material.file);
      let response: Response;

      if (fileMaterials.length > 0) {
        const formData = new FormData();
        fileMaterials.forEach((material) => {
          if (material.file) formData.append("files", material.file);
        });
        response = await fetch("/api/analyze-syllabus", {
          method: "POST",
          body: formData,
        });
      } else {
        // DSA sample material fallback
        response = await fetch("/api/analyze-syllabus", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ useSample: true }),
        });
      }

      if (response.ok) {
        const data = await response.json();
        if (!data || !data.courseModel || !Array.isArray(data.courseModel.topics)) {
          setUploadError("LearnOS could not read a course structure from those files. Your current profile is unchanged.");
          setStage("upload");
          return;
        }
        setMaterials((current) => current.map((m) => ({ ...m, status: "ready", errorMessage: undefined })));
        setDocumentKnowledge(data.knowledge ?? data.data?.documentKnowledge ?? null);
        if (Array.isArray(data.documents) && data.documents.length > 0) addDocuments(data.documents);
        setCourseAnalysis({
          courseModel: data.courseModel,
          source: data.source,
          materialsCount: materials.length,
          learningGoal,
          isSampleData: materials.every((material) => material.isSample),
          error: data.error,
        });
        setStage("results");
      } else {
        const errData = await response.json().catch(() => ({}));
        const serverError = errData.error || "Analysis service unavailable. Your current profile is unchanged.";
        setUploadError(serverError);
        const failedFileName = errData.failedFileName;
        const failedReason = errData.failedReason || serverError;

        setMaterials((current) => current.map((item) => {
          const isFailed = failedFileName
            ? (item.name === failedFileName || item.file?.name === failedFileName)
            : serverError.toLowerCase().includes(item.name.toLowerCase());
          if (isFailed) {
            return { ...item, status: "error", errorMessage: failedReason };
          }
          return { ...item, status: "queued" };
        }));
        setStage("upload");
      }
    } catch {
      setUploadError("Network error during analysis. Your current profile is unchanged.");
      setStage("upload");
    }
  }

  function returnToUpload() {
    setDocumentKnowledge(null);
    setStage("upload");
  }

  return (
    <FeatureFrame activeHref="/upload">
      <FeatureHeading
        eyebrow="01 / Understand"
        title={stage === "results" ? `${courseModel.courseName} is structured.` : "Give LearnOS your syllabus."}
        description={stage === "results"
          ? "Your course materials now have a shape. Explore the topics LearnOS identified, then use them to guide your diagnostic assessment."
          : "Upload your syllabus, notes, or curriculum documents. LearnOS will turn them into a structured learning map."}
        aside={
          <span className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs text-muted">
            {stage === "results" && analysisSource !== "baseline" ? (
              <>
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-foreground font-medium">AI generated</span>
              </>
            ) : (
              <>
                <span className="size-1.5 rounded-full bg-accent" />
                <span>{stage === "results" ? courseModel.courseName : "Curriculum Workspace"}</span>
              </>
            )}
          </span>
        }
      />

      {stage === "upload" && (
        <>
        <div className="grid items-start gap-5 lg:grid-cols-[1.12fr_0.88fr]">
          <section className="panel motion-reveal motion-reveal--card p-5 sm:p-8" data-motion-reveal>
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <SectionLabel>Raw material / 01</SectionLabel>
                <h2 className="mt-2 text-xl font-medium tracking-[-0.04em]">Your course, in its own words.</h2>
              </div>
              <FileText aria-hidden="true" className="text-muted" size={19} strokeWidth={1.6} />
            </div>

            <label htmlFor={`${inputId}-goal`} className="mb-2 block text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Learning goal <span className="font-normal normal-case tracking-normal">(optional)</span></label>
            <input
              id={`${inputId}-goal`}
              value={learningGoal}
              onChange={(event) => setLearningGoal(event.target.value)}
              maxLength={500}
              placeholder="e.g. Prepare for my data structures exam in 3 weeks"
              className="mb-5 min-h-11 w-full rounded-xl border border-border bg-white/45 px-3.5 text-sm outline-none transition focus:border-accent"
            />

            {uploadError && (
              <div className="mb-4 flex items-center gap-2.5 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-600 dark:text-red-400">
                <AlertCircle size={15} className="shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

            <label
              htmlFor={inputId}
              onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setIsDragging(false);
              }}
              onDrop={handleDrop}
              className={`upload-dropzone interactive peer flex min-h-[250px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-9 text-center transition-colors sm:min-h-[275px] ${isDragging ? "is-dragging border-accent bg-accent-soft/70" : "border-border bg-background/40 hover:border-foreground/35 hover:bg-background/75"}`}
            >
              <input
                id={inputId}
                className="sr-only"
                type="file"
                multiple
                accept=".pdf,.txt"
                onChange={(event) => {
                  addFiles(event.target.files);
                  event.target.value = "";
                }}
              />
              <span className={`grid size-12 place-items-center rounded-2xl transition-colors ${isDragging ? "bg-accent text-white" : "bg-accent-soft text-accent"}`}>
                <FolderUp aria-hidden="true" size={21} strokeWidth={1.6} />
              </span>
              <span className="mt-5 text-base font-medium tracking-[-0.02em]">Drop your learning material here</span>
              <span className="mt-1.5 text-xs text-muted">Up to {MAX_UPLOAD_FILES} PDF or TXT documents · 10 MB total</span>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-accent underline decoration-accent/30 underline-offset-4">or browse files</span>
            </label>

            {materials.length > 0 && (
              <div className="motion-reveal motion-reveal--node mt-6" data-motion-reveal>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <SectionLabel>Added materials / {String(materials.length).padStart(2, "0")}</SectionLabel>
                  <span className={`text-[10px] ${materials.some((m) => m.status === "error") ? "font-medium text-red-600 dark:text-red-400" : "text-muted"}`}>
                    {materials.some((m) => m.status === "error")
                      ? "Action needed: remove unreadable file(s)"
                      : materials.some((m) => m.status === "ready")
                      ? "Extracted and ready for LearnOS"
                      : "Ready for LearnOS analysis"}
                  </span>
                </div>
                <ul className="grid gap-2" aria-label="Added learning materials">
                  {materials.map((material, index) => (
                    <li
                      key={material.id}
                      className={`motion-reveal motion-reveal--plan-item flex min-w-0 items-center gap-3 rounded-xl border px-3 py-3 transition-colors ${
                        material.status === "error"
                          ? "border-red-500/30 bg-red-500/5"
                          : material.status === "ready"
                          ? "border-emerald-500/30 bg-emerald-500/5"
                          : "border-border bg-white/35"
                      }`}
                      data-motion-reveal
                      style={{ "--reveal-delay": `${index * 65}ms` } as CSSProperties}
                    >
                      <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${
                        material.status === "error"
                          ? "bg-red-500/10 text-red-600 dark:text-red-400"
                          : material.status === "ready"
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-background text-accent"
                      }`}>
                        <FileText aria-hidden="true" size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{material.name}</span>
                        <span className="mt-0.5 block text-[10px] text-muted">
                          {material.type} <span className="px-1 text-border">/</span> {material.size}
                          {material.status === "error" && material.errorMessage && (
                            <span className="mt-1 block font-normal text-red-600 dark:text-red-400">
                              {material.errorMessage}
                            </span>
                          )}
                        </span>
                      </span>
                      {material.status === "error" ? (
                        <span className="shrink-0 rounded-md bg-red-500/15 px-2 py-1 text-[9px] font-medium text-red-600 dark:text-red-400">
                          Error
                        </span>
                      ) : material.status === "ready" ? (
                        <span className="shrink-0 rounded-md bg-emerald-500/15 px-2 py-1 text-[9px] font-medium text-emerald-700 dark:text-emerald-400">
                          Ready
                        </span>
                      ) : (
                        <span className="shrink-0 rounded-md bg-accent-soft/70 px-2 py-1 text-[9px] font-medium text-accent">
                          Queued
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeMaterial(material.id)}
                        className="interactive grid size-8 shrink-0 place-items-center rounded-lg text-muted hover:bg-background hover:text-foreground"
                        aria-label={`Remove ${material.name}`}
                      >
                        <X aria-hidden="true" size={15} />
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3 border-t border-border pt-5 sm:flex-row sm:items-center sm:justify-between">
              <span className="text-xs text-muted">
                {materials.length
                  ? materials.some((m) => m.status === "error")
                    ? "Remove failed file(s) before analyzing"
                    : `${materials.length} ${materials.length === 1 ? "material" : "materials"} ready for LearnOS`
                  : "Start with a syllabus, notes or past questions."}
              </span>
              <button
                type="button"
                className="button-primary interactive inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-foreground px-4 text-sm font-medium text-background hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                disabled={materials.length === 0 || materials.every((m) => m.status === "error") || stage === "analyzing"}
                onClick={startAnalysis}
              >
                Analyze with LearnOS <ArrowRight aria-hidden="true" size={15} />
              </button>
            </div>
            {materials.length === 0 && (
              <button
                type="button"
                onClick={() => {
                  setUploadError(null);
                  setMaterials(SAMPLE_MATERIALS);
                }}
                className="interactive mt-4 text-xs text-muted underline decoration-border underline-offset-4 hover:text-accent"
              >
                Or open the built-in DSA sample outline
              </button>
            )}
          </section>

          <aside className="panel motion-reveal motion-reveal--card motion-delay-1 p-5 sm:p-7" data-motion-reveal>
            <SectionLabel>A more useful starting point</SectionLabel>
            <h2 className="mt-3 text-2xl font-medium leading-tight tracking-[-0.045em]">From raw material to a learning path.</h2>
            <p className="mt-3 text-sm leading-6 text-muted">Syllabi describe what a course covers. Notes and curriculum outlines show how it is organized. LearnOS brings those signals together.</p>
            <ol className="mt-7 grid gap-0" aria-label="LearnOS material journey">
              {[
                { step: "01", label: "Raw material", description: "Your syllabus, notes, and PDF/TXT documents" },
                { step: "02", label: "AI analysis", description: "Topics, difficulty, and learning dependencies" },
                { step: "03", label: "Structured learning", description: "A map for what to learn and assess next" },
              ].map((item, index) => (
                <li key={item.step} className="flex gap-3">
                  <span className="flex flex-col items-center">
                    <span className="grid size-7 place-items-center rounded-full border border-border font-mono text-[9px] text-accent">{item.step}</span>
                    {index < 2 && <span className="my-1 h-7 w-px bg-border" aria-hidden="true" />}
                  </span>
                  <span className="pb-5">
                    <span className="block text-sm font-medium">{item.label}</span>
                    <span className="mt-1 block text-xs leading-5 text-muted">{item.description}</span>
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-1 border-t border-border pt-4 text-[11px] leading-5 text-muted">Original files are processed for extraction, then discarded. Extracted text is saved in this browser for source-grounded tutoring; bounded excerpts are sent to the configured provider when you ask a question. Provider keys stay on the server.</p>
          </aside>
        </div>
        <SavedSourceLibrary
          documents={documents}
          focusedSource={focusedSource}
          storageError={documentsError}
          onRemove={removeDocument}
          onFocus={(id) => { setSelectedDocumentId(id); setFocusedSource({ documentId: id, pageNumber: documents.find((document) => document.id === id)?.pages[0]?.pageNumber ?? null }); }}
        />
        </>
      )}

      {stage === "analyzing" && (
        <section className="panel motion-reveal motion-reveal--section p-5 sm:p-9" data-motion-reveal>
          <div className="mx-auto max-w-3xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent"><Sparkles aria-hidden="true" size={18} /></span>
                <div>
                  <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-accent"><span className="ai-pulse size-1.5 rounded-full bg-accent" /> LearnOS is processing your material</span>
                  <p className="mt-1 text-xs text-muted">{materials.length} {materials.length === 1 ? "document" : "documents"} in this analysis</p>
                </div>
              </div>
            </div>
            <div className="mt-7 grid gap-7 md:grid-cols-[0.9fr_1.1fr] md:gap-12">
              <div>
                <SectionLabel>Raw material / Analysis / Structure</SectionLabel>
                <h2 className="mt-4 text-3xl font-medium leading-tight tracking-[-0.05em] sm:text-4xl">Reading the source before building the map.</h2>
                <p className="mt-3 text-sm leading-6 text-muted">Extraction and provider analysis run in one bounded request. This screen stays in a processing state until the server returns a result.</p>
              </div>
              <AnalysisStepList />
            </div>
            <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">Processing the selected learning material.</p>
            <div className="mt-7 flex items-center gap-2 border-t border-border pt-4 text-xs text-muted">
              <span className="ai-pulse size-1.5 rounded-full bg-accent" />
              <span>File extraction · page mapping · source-grounded analysis</span>
            </div>
          </div>
        </section>
      )}

      {stage === "results" && (
        <>
        <div className="grid gap-8">
          <section aria-label="Structured learning results" className="motion-reveal motion-reveal--section" data-motion-reveal>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
              <div>
                <SectionLabel>Structured learning / Ready</SectionLabel>
                <p className="mt-2 text-sm text-muted">
                  {documentKnowledge?.analysisMode === "local-outline"
                    ? <>Text extraction finished for <span className="font-medium text-foreground">{courseModel.courseName}</span>. The local outline contains explicit headings only.</>
                    : <>LearnOS structured <span className="font-medium text-foreground">{courseModel.courseName}</span> across {materials.length} {materials.length === 1 ? "document" : "documents"}.</>}
                </p>
              </div>
              <button type="button" onClick={returnToUpload} className="interactive text-xs font-medium text-accent hover:text-foreground">Upload another syllabus</button>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                { value: courseModel.totalTopics, label: documentKnowledge?.analysisMode === "local-outline" ? "Headings detected" : "Topics identified" },
                { value: courseModel.totalSubtopics, label: documentKnowledge?.analysisMode === "local-outline" ? "Subtopics analyzed" : "Concepts & subtopics" },
                { value: courseModel.highPriorityCount, label: documentKnowledge?.analysisMode === "local-outline" ? "Priority estimates" : "High-priority areas" },
                { value: materials.length, label: materials.length === 1 ? "Material processed" : "Materials processed" },
              ].map((metric, index) => (
                <article key={metric.label} className="panel motion-reveal motion-reveal--stat p-4 sm:p-5" data-motion-reveal style={{ "--reveal-delay": `${index * 70}ms` } as CSSProperties}>
                  <AnimatedNumber value={metric.value} className="text-3xl font-medium tracking-[-0.06em] sm:text-4xl" />
                  <p className="mt-2 text-xs leading-5 text-muted">{metric.label}</p>
                </article>
              ))}
            </div>
          </section>

          <section aria-labelledby="topic-preview-title" className="panel motion-reveal motion-reveal--section p-5 sm:p-7" data-motion-reveal>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
              <div>
                <SectionLabel>{documentKnowledge?.analysisMode === "local-outline" ? "Detected headings" : "Topic preview"} / {courseModel.courseName}</SectionLabel>
                <h2 id="topic-preview-title" className="mt-2 text-xl font-medium tracking-[-0.04em]">A syllabus with structured signals.</h2>
              </div>
              <span className="text-xs text-muted">{documentKnowledge?.analysisMode === "local-outline" ? "Difficulty, prerequisites, and exam weight were not estimated." : "Difficulty · importance · logical study order"}</span>
            </div>
            <ul className="motion-stagger grid gap-2 sm:grid-cols-2 xl:grid-cols-3" aria-label="Analyzed curriculum topics">
              {courseModel.topics.map((topic, index) => (
                <li
                  key={topic.name}
                  className="motion-reveal motion-reveal--plan-item rounded-xl border border-border bg-white/25 transition hover:border-accent/35 hover:bg-accent-soft/20"
                  data-motion-reveal
                  style={{ "--reveal-delay": `${index * 45}ms` } as CSSProperties}
                >
                  <Link
                    href={`/tutor?topic=${encodeURIComponent(topic.name)}`}
                    onClick={() => {
                      const source = documentKnowledge?.topics.find((item) => item.name.toLowerCase() === topic.name.toLowerCase())?.sources[0];
                      if (source) {
                        setSelectedDocumentId(source.documentId);
                        setFocusedSource({ documentId: source.documentId, pageNumber: source.pageStart ?? null });
                      }
                    }}
                    className="flex h-full flex-col p-4 outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-inset"
                    aria-label={`Open a focused LearnOS lesson about ${topic.name}`}
                  >
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">{topic.name}</span>
                    <span
                      className={`rounded-md px-2 py-1 text-[9px] font-medium ${
                        documentKnowledge?.analysisMode === "local-outline"
                          ? "bg-background text-muted"
                          : topic.importance === "High"
                          ? "bg-accent-soft text-accent"
                          : "bg-background text-muted"
                      }`}
                    >
                      {documentKnowledge?.analysisMode === "local-outline" ? "Detected" : `${topic.importance} priority`}
                    </span>
                  </span>
                  <span className="mt-2 text-[11px] text-muted line-clamp-1">
                    {topic.subtopics.length ? topic.subtopics.slice(0, 3).join(" · ") : documentKnowledge?.analysisMode === "local-outline" ? "No subtopics inferred" : ""}
                  </span>
                  <span className="mt-3 flex items-center justify-between gap-3 border-t border-border/70 pt-2.5 text-[10px] text-muted">
                    <span>{documentKnowledge?.analysisMode === "local-outline" ? "Not assessed" : topic.difficulty}</span>
                    <span>
                      {documentKnowledge?.analysisMode === "local-outline"
                        ? `Source order #${topic.studyOrder}`
                        : topic.prerequisites.length > 0
                        ? `Req: ${topic.prerequisites[0]}`
                        : `Order #${topic.studyOrder}`}
                    </span>
                  </span>
                  <span className="mt-2 text-[10px] font-medium text-accent">Open focused lesson →</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {documentKnowledge && (
            <section aria-labelledby="document-intelligence-title" className="panel motion-reveal motion-reveal--section p-5 sm:p-7" data-motion-reveal>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="max-w-3xl">
                  <SectionLabel>Document intelligence / {documentKnowledge.analysisMode === "provider" ? "Source checked" : "Local outline"}</SectionLabel>
                  <h2 id="document-intelligence-title" className="mt-2 text-xl font-medium tracking-[-0.04em]">{documentKnowledge.title}</h2>
                  <p className="mt-2 text-sm leading-6 text-muted">{documentKnowledge.summary}</p>
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-[10px] text-muted">
                  <span className={`size-1.5 rounded-full ${documentKnowledge.analysisMode === "provider" ? "bg-accent" : "bg-amber-600"}`} />
                  {documentKnowledge.analysisMode === "provider" ? `Validated with ${analysisSource}` : "Heading extraction only"}
                </span>
              </div>

              {documentKnowledge.warnings.length > 0 && (
                <ul className="mt-4 grid gap-1.5 rounded-xl border border-amber-700/15 bg-amber-500/5 p-3 text-[11px] leading-5 text-muted" aria-label="Analysis limitations">
                  {documentKnowledge.warnings.map((warning, index) => <li key={`${warning}-${index}`}>{warning}</li>)}
                </ul>
              )}

              {documentKnowledge.analysisMode === "provider" && documentKnowledge.topics.length > 0 && (
                <div className="mt-5">
                  <SectionLabel>Topics, relationships, and source pages</SectionLabel>
                  <ul className="mt-2 grid gap-2 sm:grid-cols-2">
                    {documentKnowledge.topics.map((topic, index) => (
                      <li key={`${topic.name}-${index}`} className="rounded-xl border border-border/80 bg-white/20 p-3">
                        <h3 className="text-xs font-semibold">{topic.name}</h3>
                        {topic.subtopics.length > 0 && <p className="mt-1 text-[11px] leading-5 text-muted">{topic.subtopics.join(" · ")}</p>}
                        {topic.prerequisites.length > 0 && <p className="mt-2 text-[10px] text-muted">Prerequisites: {topic.prerequisites.join(" · ")}</p>}
                        <SourceReferenceButton source={topic.sources[0]} documents={documents} onOpen={focusDocumentSource} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {documentKnowledge.analysisMode === "provider" && documentKnowledge.keyConcepts.length > 0 && (
                <div className="mt-5">
                  <SectionLabel>Key concepts grounded in the source</SectionLabel>
                  <ul className="mt-2 flex flex-wrap gap-2">
                    {documentKnowledge.keyConcepts.map((concept, index) => (
                      <li key={`${concept.name}-${index}`} className="rounded-lg border border-border bg-background/60 px-3 py-2 text-xs">
                        <span>{concept.name}</span>
                        <SourceReferenceButton source={concept.source} documents={documents} onOpen={focusDocumentSource} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {documentKnowledge.definitions.length > 0 && (
                <div className="mt-5 grid gap-2 sm:grid-cols-2">
                  {documentKnowledge.definitions.slice(0, 8).map((definition, index) => (
                    <article key={`${definition.term}-${index}`} className="rounded-xl border border-border/80 bg-white/20 p-3">
                      <h3 className="text-xs font-semibold">{definition.term}</h3>
                      <p className="mt-1 text-xs leading-5 text-muted">{definition.definition}</p>
                      <SourceReferenceButton source={definition.source} documents={documents} onOpen={focusDocumentSource} />
                    </article>
                  ))}
                </div>
              )}

              {(documentKnowledge.formulas.length > 0 || documentKnowledge.examples.length > 0 || documentKnowledge.practiceQuestions.length > 0) && (
                <div className="mt-5 grid gap-3 lg:grid-cols-2">
                  {documentKnowledge.formulas.slice(0, 6).map((formula, index) => (
                    <article key={`${formula.name}-${index}`} className="rounded-xl border border-border/80 bg-white/20 p-3">
                      <h3 className="text-xs font-semibold">{formula.name}</h3>
                      <p className="mt-2 rounded-lg bg-background/65 px-3 py-2 font-mono text-xs">{formula.formula}</p>
                      <p className="mt-2 text-xs leading-5 text-muted">{formula.explanation}</p>
                      <SourceReferenceButton source={formula.source} documents={documents} onOpen={focusDocumentSource} />
                    </article>
                  ))}
                  {documentKnowledge.examples.slice(0, 6).map((example, index) => (
                    <article key={`${example.title}-${index}`} className="rounded-xl border border-border/80 bg-white/20 p-3">
                      <h3 className="text-xs font-semibold">{example.title}</h3>
                      <p className="mt-2 text-xs leading-5 text-muted">{example.description}</p>
                      <SourceReferenceButton source={example.source} documents={documents} onOpen={focusDocumentSource} />
                    </article>
                  ))}
                  {documentKnowledge.practiceQuestions.slice(0, 6).map((question, index) => (
                    <article key={`${question.prompt}-${index}`} className="rounded-xl border border-border/80 bg-white/20 p-3">
                      <h3 className="text-xs font-semibold">Practice from your source</h3>
                      <p className="mt-2 text-xs leading-5">{question.prompt}</p>
                      <details className="mt-2 rounded-lg border border-border/70 bg-background/50 px-3 py-2 text-xs">
                        <summary className="interactive cursor-pointer font-medium text-accent">Reveal answer and explanation</summary>
                        <p className="mt-2 font-medium">{question.answer}</p>
                        <p className="mt-1 leading-5 text-muted">{question.explanation}</p>
                      </details>
                      <SourceReferenceButton source={question.source} documents={documents} onOpen={focusDocumentSource} />
                    </article>
                  ))}
                </div>
              )}
            </section>
          )}

          <section className="panel motion-reveal motion-reveal--card flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7" data-motion-reveal>
            <div className="max-w-xl">
              <SectionLabel>02 / Assess</SectionLabel>
              <h2 className="mt-2 text-2xl font-medium tracking-[-0.045em]">Your materials have a starting structure.</h2>
              <p className="mt-2 text-sm leading-6 text-muted">Next, check what you already understand with a diagnostic assessment. Topics also open a focused tutor lesson.</p>
            </div>
            <Link href="/assessment" className="button-primary interactive inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-foreground px-4 text-sm font-medium text-background hover:bg-accent">
              Start Diagnostic Assessment <ArrowRight aria-hidden="true" size={15} />
            </Link>
          </section>
        </div>
        <SavedSourceLibrary
          documents={documents}
          focusedSource={focusedSource}
          storageError={documentsError}
          onRemove={removeDocument}
          onFocus={(id) => { setSelectedDocumentId(id); setFocusedSource({ documentId: id, pageNumber: documents.find((document) => document.id === id)?.pages[0]?.pageNumber ?? null }); }}
        />
        </>
      )}
    </FeatureFrame>
  );
}
