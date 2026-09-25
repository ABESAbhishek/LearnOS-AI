"use client";

import { useEffect, useId, useState, type CSSProperties, type DragEvent } from "react";
import Link from "next/link";
import { ArrowRight, Check, FileText, FolderUp, Sparkles, X, AlertCircle } from "lucide-react";
import { FeatureFrame, FeatureHeading, SectionLabel } from "@/components/features/feature-frame";
import { AnimatedNumber } from "@/components/motion/animated-number";
import { ProgressBar } from "@/components/motion/progress-bar";
import { useLearning } from "@/context/learning-context";
import { BASELINE_DSA_COURSE } from "@/types/course";

type Material = {
  id: string;
  name: string;
  type: string;
  size: string;
  file?: File;
  isSample?: boolean;
};

type UploadStage = "upload" | "analyzing" | "results";

const ANALYSIS_STEPS = [
  "Uploading learning material",
  "Reading document contents",
  "Understanding syllabus outline",
  "Mapping topics & difficulty",
  "Building learning structure",
  "Learning path ready",
] as const;

const SAMPLE_MATERIALS: Material[] = [
  { id: "sample-syllabus", name: "DSA_Syllabus.pdf", type: "PDF", size: "1.8 MB", isSample: true },
  { id: "sample-pyq", name: "Previous_Year_Questions.pdf", type: "PDF", size: "2.4 MB", isSample: true },
  { id: "sample-notes", name: "DSA_Notes.pdf", type: "PDF", size: "1.1 MB", isSample: true },
];

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(bytes / (1024 * 1024))} MB`;
}

function toMaterial(file: File, index: number): Material {
  const extension = file.name.split(".").pop()?.toUpperCase() || "FILE";
  return {
    id: `${file.name}-${file.lastModified}-${Date.now()}-${index}`,
    name: file.name,
    type: extension,
    size: formatFileSize(file.size),
    file,
  };
}

function AnalysisStepList({ currentStep }: { currentStep: number }) {
  return (
    <ol className="ai-activity" aria-label="LearnOS material analysis">
      {ANALYSIS_STEPS.map((label, index) => {
        const state = index < currentStep ? "complete" : index === currentStep ? "active" : "upcoming";
        return (
          <li key={label} className="ai-activity__step" data-state={state} aria-current={state === "active" ? "step" : undefined}>
            <span className="ai-activity__marker" aria-hidden="true">
              {state === "complete" ? <Check size={13} strokeWidth={2} /> : <span />}
            </span>
            <span className="min-w-0">
              <span className="mb-0.5 block text-[9px] font-semibold uppercase tracking-[0.14em] text-muted">Step 0{index + 1}</span>
              <span className="ai-activity__label block">{label}</span>
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export function UploadExperience() {
  const inputId = useId();
  const [materials, setMaterials] = useState<Material[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [stage, setStage] = useState<UploadStage>("upload");
  const [analysisStep, setAnalysisStep] = useState(0);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { courseModel, analysisSource, setCourseAnalysis } = useLearning();

  useEffect(() => {
    if (stage !== "analyzing") return;
    const delay = analysisStep === ANALYSIS_STEPS.length - 1 ? 900 : 640;
    const timer = window.setTimeout(() => {
      if (analysisStep === ANALYSIS_STEPS.length - 1) {
        setStage("results");
      } else {
        setAnalysisStep((step) => step + 1);
      }
    }, delay);
    return () => window.clearTimeout(timer);
  }, [analysisStep, stage]);

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
      setMaterials((current) => [...current, ...validFiles.map(toMaterial)]);
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
    if (materials.length === 0) return;
    setUploadError(null);
    setAnalysisStep(0);
    setStage("analyzing");

    // Initiate real server analysis
    try {
      const fileMaterial = materials.find((m) => m.file);
      let response: Response;

      if (fileMaterial && fileMaterial.file) {
        const formData = new FormData();
        formData.append("file", fileMaterial.file);
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
        setCourseAnalysis({
          courseModel: data.courseModel,
          source: data.source,
          materialsCount: materials.length,
          error: data.error,
        });
      } else {
        const errData = await response.json().catch(() => ({}));
        setCourseAnalysis({
          courseModel: BASELINE_DSA_COURSE,
          source: "baseline",
          materialsCount: materials.length,
          error: errData.error || "Analysis service unavailable. Active baseline loaded.",
        });
      }
    } catch {
      setCourseAnalysis({
        courseModel: BASELINE_DSA_COURSE,
        source: "baseline",
        materialsCount: materials.length,
        error: "Network error during analysis. Active baseline loaded.",
      });
    }
  }

  function returnToUpload() {
    setAnalysisStep(0);
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
            {stage === "results" && analysisSource === "gemini" ? (
              <>
                <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-foreground font-medium">Gemini 3.8 Flash</span>
              </>
            ) : (
              <>
                <span className="size-1.5 rounded-full bg-accent" />
                <span>DSA Workspace</span>
              </>
            )}
          </span>
        }
      />

      {stage === "upload" && (
        <div className="grid items-start gap-5 lg:grid-cols-[1.12fr_0.88fr]">
          <section className="panel motion-reveal motion-reveal--card p-5 sm:p-8" data-motion-reveal>
            <div className="mb-6 flex items-center justify-between gap-4">
              <div>
                <SectionLabel>Raw material / 01</SectionLabel>
                <h2 className="mt-2 text-xl font-medium tracking-[-0.04em]">Your course, in its own words.</h2>
              </div>
              <FileText aria-hidden="true" className="text-muted" size={19} strokeWidth={1.6} />
            </div>

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
              <span className="mt-1.5 text-xs text-muted">PDF or TXT documents</span>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-accent underline decoration-accent/30 underline-offset-4">or browse files</span>
            </label>

            {materials.length > 0 && (
              <div className="motion-reveal motion-reveal--node mt-6" data-motion-reveal>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <SectionLabel>Added materials / {String(materials.length).padStart(2, "0")}</SectionLabel>
                  <span className="text-[10px] text-muted">Ready for LearnOS analysis</span>
                </div>
                <ul className="grid gap-2" aria-label="Added learning materials">
                  {materials.map((material, index) => (
                    <li
                      key={material.id}
                      className="motion-reveal motion-reveal--plan-item flex min-w-0 items-center gap-3 rounded-xl border border-border bg-white/35 px-3 py-3"
                      data-motion-reveal
                      style={{ "--reveal-delay": `${index * 65}ms` } as CSSProperties}
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-background text-accent"><FileText aria-hidden="true" size={16} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium">{material.name}</span>
                        <span className="mt-0.5 block text-[10px] text-muted">{material.type} <span className="px-1 text-border">/</span> {material.size}</span>
                      </span>
                      <span className="shrink-0 rounded-md bg-accent-soft/70 px-2 py-1 text-[9px] font-medium text-accent">Ready</span>
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
              <span className="text-xs text-muted">{materials.length ? `${materials.length} ${materials.length === 1 ? "material" : "materials"} ready for LearnOS` : "Start with a syllabus, notes or past questions."}</span>
              <button
                type="button"
                className="button-primary interactive inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-foreground px-4 text-sm font-medium text-background hover:bg-accent disabled:cursor-not-allowed disabled:opacity-40"
                disabled={materials.length === 0}
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
                Or try the DSA sample materials
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
            <p className="mt-1 border-t border-border pt-4 text-[11px] leading-5 text-muted">Powered by Gemini 3.8 Flash structured syllabus reasoning with deterministic baseline fallback.</p>
          </aside>
        </div>
      )}

      {stage === "analyzing" && (
        <section className="panel motion-reveal motion-reveal--section p-5 sm:p-9" data-motion-reveal>
          <div className="mx-auto max-w-3xl">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-xl bg-accent-soft text-accent"><Sparkles aria-hidden="true" size={18} /></span>
                <div>
                  <span className="inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[0.15em] text-accent"><span className="ai-pulse size-1.5 rounded-full bg-accent" /> LearnOS is understanding your course</span>
                  <p className="mt-1 text-xs text-muted">{materials.length} {materials.length === 1 ? "document" : "documents"} in this analysis</p>
                </div>
              </div>
              <span className="font-mono text-xs text-muted">0{analysisStep + 1} <span className="text-border">/</span> 06</span>
            </div>
            <div className="mt-7"><ProgressBar value={((analysisStep + 1) / ANALYSIS_STEPS.length) * 100} label="Material analysis progress" className="h-1.5" /></div>
            <div className="mt-7 grid gap-7 md:grid-cols-[0.9fr_1.1fr] md:gap-12">
              <div>
                <SectionLabel>Raw material / Analysis / Structure</SectionLabel>
                <h2 className="mt-4 text-3xl font-medium leading-tight tracking-[-0.05em] sm:text-4xl">A course outline is becoming a map.</h2>
                <p className="mt-3 text-sm leading-6 text-muted">LearnOS is connecting your syllabus topics with prerequisites and difficulty structures.</p>
              </div>
              <AnalysisStepList currentStep={analysisStep} />
            </div>
            <p className="sr-only" aria-live="polite" aria-atomic="true">Step 0{analysisStep + 1}: {ANALYSIS_STEPS[analysisStep]}</p>
            <div className="mt-7 flex items-center gap-2 border-t border-border pt-4 text-xs text-muted">
              <span className="ai-pulse size-1.5 rounded-full bg-accent" />
              <span>Analyzing curriculum with LearnOS AI pipeline</span>
            </div>
          </div>
        </section>
      )}

      {stage === "results" && (
        <div className="grid gap-8">
          <section aria-label="Structured learning results" className="motion-reveal motion-reveal--section" data-motion-reveal>
            <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
              <div>
                <SectionLabel>Structured learning / Ready</SectionLabel>
                <p className="mt-2 text-sm text-muted">
                  LearnOS structured <span className="font-medium text-foreground">{courseModel.courseName}</span> across {materials.length} {materials.length === 1 ? "document" : "documents"}.
                </p>
              </div>
              <button type="button" onClick={returnToUpload} className="interactive text-xs font-medium text-accent hover:text-foreground">Upload another syllabus</button>
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {[
                { value: courseModel.totalTopics, label: "Topics identified" },
                { value: courseModel.totalSubtopics, label: "Concepts & subtopics" },
                { value: courseModel.highPriorityCount, label: "High-priority areas" },
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
                <SectionLabel>Topic preview / {courseModel.courseName}</SectionLabel>
                <h2 id="topic-preview-title" className="mt-2 text-xl font-medium tracking-[-0.04em]">A syllabus with structured signals.</h2>
              </div>
              <span className="text-xs text-muted">Difficulty · importance · logical study order</span>
            </div>
            <ul className="motion-stagger grid gap-2 sm:grid-cols-2 xl:grid-cols-3" aria-label="Analyzed curriculum topics">
              {courseModel.topics.map((topic, index) => (
                <li
                  key={topic.name}
                  className="motion-reveal motion-reveal--plan-item flex flex-col rounded-xl border border-border bg-white/25 px-4 py-3"
                  data-motion-reveal
                  style={{ "--reveal-delay": `${index * 45}ms` } as CSSProperties}
                >
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium">{topic.name}</span>
                    <span
                      className={`rounded-md px-2 py-1 text-[9px] font-medium ${
                        topic.importance === "High"
                          ? "bg-accent-soft text-accent"
                          : "bg-background text-muted"
                      }`}
                    >
                      {topic.importance} priority
                    </span>
                  </span>
                  <span className="mt-2 text-[11px] text-muted line-clamp-1">
                    {topic.subtopics.slice(0, 3).join(" · ")}
                  </span>
                  <span className="mt-3 flex items-center justify-between gap-3 border-t border-border/70 pt-2.5 text-[10px] text-muted">
                    <span>{topic.difficulty}</span>
                    <span>
                      {topic.prerequisites.length > 0
                        ? `Req: ${topic.prerequisites[0]}`
                        : `Order #${topic.studyOrder}`}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel motion-reveal motion-reveal--card flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-7" data-motion-reveal>
            <div className="max-w-xl">
              <SectionLabel>02 / Assess</SectionLabel>
              <h2 className="mt-2 text-2xl font-medium tracking-[-0.045em]">Your syllabus is understood.</h2>
              <p className="mt-2 text-sm leading-6 text-muted">Next, let&apos;s find out what you already know with a diagnostic assessment.</p>
            </div>
            <Link href="/assessment" className="button-primary interactive inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-xl bg-foreground px-4 text-sm font-medium text-background hover:bg-accent">
              Start Diagnostic Assessment <ArrowRight aria-hidden="true" size={15} />
            </Link>
          </section>
        </div>
      )}
    </FeatureFrame>
  );
}
