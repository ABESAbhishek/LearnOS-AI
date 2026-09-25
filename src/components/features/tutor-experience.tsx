"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Brain,
  Check,
  Layers,
  Lightbulb,
  Play,
  RotateCcw,
  Sparkles,
} from "lucide-react";
import { FeatureFrame } from "@/components/features/feature-frame";
import { useLearning } from "@/context/learning-context";
import {
  CANONICAL_TUTOR_EXPLANATION,
  type TutorExplanation,
} from "@/types/tutor";

type StageId = 0 | 1 | 2;

const STAGES = [
  {
    id: 0,
    number: "01",
    label: "CONCEPT",
    title: "Core Intuition",
    summary: "Intuitive analogy and fundamental mechanics.",
  },
  {
    id: 1,
    number: "02",
    label: "VISUAL EXAMPLE",
    title: "Interactive Stepper",
    summary: "Step through the process one layer at a time.",
  },
  {
    id: 2,
    number: "03",
    label: "PRACTICE",
    title: "Check Your Understanding",
    summary: "Verify your grasp to unlock your adapted study plan.",
  },
] as const;

export function TutorExperience() {
  const {
    knowledgeScores,
    currentFocus,
    courseModel,
    tutorPracticeCompleted,
    completeTutorPractice,
    tutorSource,
    setTutorSource,
  } = useLearning();

  // Dynamically determine the lowest-scoring topic to remediate
  let calculatedWeakTopic = "Graphs";
  let lowestMastery = 100;
  if (knowledgeScores && Object.keys(knowledgeScores).length > 0) {
    Object.entries(knowledgeScores).forEach(([t, s]) => {
      if (s < lowestMastery) {
        lowestMastery = s;
        calculatedWeakTopic = t;
      }
    });
  }

  // Find subtopics from courseModel if available
  const matchedCourseTopic = courseModel?.topics?.find(
    (t) => t.name.toLowerCase() === calculatedWeakTopic.toLowerCase()
  );
  const weakAreas = useMemo(() => {
    return matchedCourseTopic?.subtopics && matchedCourseTopic.subtopics.length > 0
      ? matchedCourseTopic.subtopics
      : currentFocus && currentFocus.length > 0
      ? currentFocus
      : [calculatedWeakTopic];
  }, [matchedCourseTopic, currentFocus, calculatedWeakTopic]);

  const weakMastery = knowledgeScores[calculatedWeakTopic] ?? lowestMastery ?? 31;

  const [currentStage, setCurrentStage] = useState<StageId>(0);
  const [traversalStep, setTraversalStep] = useState(0);
  const [selectedPracticeOption, setSelectedPracticeOption] = useState<number | null>(null);
  const [practiceSubmitted, setPracticeSubmitted] = useState(false);
  const [practiceError, setPracticeError] = useState(false);
  const [explanation, setExplanation] = useState<TutorExplanation>(CANONICAL_TUTOR_EXPLANATION);

  // Request personalized AI Tutor content grounded in the weak topic
  useEffect(() => {
    let isMounted = true;

    fetch("/api/tutor-explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topic: calculatedWeakTopic,
        mastery: weakMastery,
        weakAreas,
        stage: 0,
      }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("Tutor API error");
        return res.json();
      })
      .then((data) => {
        if (!isMounted) return;
        if (data && data.explanation && data.source === "gemini") {
          setExplanation(data.explanation);
          setTutorSource("gemini");
        } else {
          if (data && data.explanation) {
            setExplanation(data.explanation);
          }
          setTutorSource("baseline");
        }
      })
      .catch(() => {
        if (isMounted) {
          setTutorSource("baseline");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [calculatedWeakTopic, weakMastery, weakAreas, setTutorSource]);

  const steps = explanation.visualSteps && explanation.visualSteps.length > 0
    ? explanation.visualSteps
    : CANONICAL_TUTOR_EXPLANATION.visualSteps;
  const currentStepIndex = Math.min(traversalStep, steps.length - 1);
  const activeStep = steps[currentStepIndex] || steps[0];

  const isGraphTopic =
    explanation.topic.toLowerCase().includes("graph") ||
    calculatedWeakTopic.toLowerCase().includes("graph");

  function nextStage() {
    if (currentStage < 2) {
      setCurrentStage((prev) => (prev + 1) as StageId);
    }
  }

  function prevStage() {
    if (currentStage > 0) {
      setCurrentStage((prev) => (prev - 1) as StageId);
    }
  }

  function handlePracticeSubmit() {
    if (selectedPracticeOption === null) return;
    if (selectedPracticeOption === explanation.practiceQuestion.correctOption) {
      setPracticeSubmitted(true);
      setPracticeError(false);
      completeTutorPractice(calculatedWeakTopic);
    } else {
      setPracticeError(true);
    }
  }

  return (
    <FeatureFrame activeHref="/tutor">
      {/* Header */}
      <section className="motion-reveal motion-reveal--section mb-8" data-motion-reveal>
        <div className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#5F5A54]">
          <span>04 / Learn</span>
          <span className="h-px w-10 bg-black/20" />
          <span>AI Tutor Session</span>
        </div>

        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="text-4xl font-semibold tracking-[-0.05em] text-[#111111] sm:text-5xl lg:text-6xl">
              Let&apos;s strengthen your {explanation.topic}.
            </h1>
            <p className="mt-3 text-base leading-7 text-[#5F5A54] sm:text-lg">
              LearnOS identified {explanation.topic.toLowerCase()} as your current priority gap ({weakMastery}% mastery).
              This session breaks down {weakAreas.slice(0, 2).join(" & ") || explanation.topic} into intuitive foundations.
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2.5 rounded-full border border-black/15 bg-[#F8F2EA] px-4 py-2.5 shadow-sm">
            <span className="relative flex h-2.5 w-2.5">
              <span
                className={`absolute inline-flex h-full w-full animate-ping rounded-full ${
                  tutorSource === "gemini" ? "bg-emerald-500" : "bg-[#2563EB]"
                } opacity-60`}
              />
              <span
                className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                  tutorSource === "gemini" ? "bg-emerald-500" : "bg-[#2563EB]"
                }`}
              />
            </span>
            <span className="text-xs font-medium text-[#111111]">
              {tutorSource === "gemini" ? (
                <>Gemini 3.8 Flash Tutor &middot; {explanation.topic}</>
              ) : (
                <>Targeted Session &middot; {explanation.topic}</>
              )}
            </span>
          </div>
        </div>
      </section>

      {/* 3-Stage Progress Nav */}
      <div className="mb-8 flex flex-col gap-2 rounded-2xl border border-[var(--border)] bg-[#F8F2EA]/80 p-3 sm:flex-row sm:items-center sm:justify-between sm:p-2">
        <div className="grid grid-cols-3 gap-2 w-full">
          {STAGES.map((stage) => {
            const isActive = currentStage === stage.id;
            const isCompleted = currentStage > stage.id || (stage.id === 2 && tutorPracticeCompleted);

            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => setCurrentStage(stage.id as StageId)}
                className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition-all ${
                  isActive
                    ? "bg-white shadow-sm ring-1 ring-black/10 text-[#111111]"
                    : "text-[#5F5A54] hover:bg-black/5"
                }`}
              >
                <span
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold ${
                    isCompleted
                      ? "bg-[#2563EB] text-white"
                      : isActive
                      ? "bg-[#111111] text-white"
                      : "border border-black/20 text-[#5F5A54]"
                  }`}
                >
                  {isCompleted ? <Check size={12} strokeWidth={2.5} /> : stage.number}
                </span>
                <div className="min-w-0">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#5F5A54]">
                    {stage.label}
                  </span>
                  <span className="hidden truncate text-xs font-medium sm:block">
                    {stage.id === 0 ? "Intuition" : stage.id === 1 ? "Visual Stepper" : "Practice Check"}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Layout: Active Stage (Left) & Pedagogical Context (Right) */}
      <div className="grid items-start gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Left Column: Stage Content */}
        <div className="panel motion-reveal motion-reveal--section min-h-[580px] p-6 sm:p-9" data-motion-reveal>
          {/* ========================================================================= */}
          {/* STAGE 1: CONCEPT — Core Intuition & Key Points                            */}
          {/* ========================================================================= */}
          {currentStage === 0 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2563EB]">
                    Stage 01 / Core Intuition
                  </span>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                    Understanding {explanation.topic}
                  </h2>
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E8F0FF] text-[#2563EB]">
                  <Brain size={20} />
                </div>
              </div>

              <p className="text-sm leading-7 text-[#5F5A54] sm:text-base">
                {explanation.intuition}
              </p>

              {/* Key Principles Card */}
              <div className="rounded-2xl border border-[var(--border)] bg-[#F5EEE5]/80 p-5">
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-[#111111]">
                  Core Principles of {explanation.topic}
                </h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {explanation.keyPoints.map((point, idx) => (
                    <div key={idx} className="rounded-xl border border-black/10 bg-white p-3.5">
                      <span className="font-mono text-[10px] font-semibold text-[#2563EB]">
                        0{idx + 1}
                      </span>
                      <p className="mt-1 text-xs leading-relaxed text-[#111111]">{point}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Queue Mechanics Diagram if Graph Topic */}
              {isGraphTopic ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[#F8F2EA] p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5F5A54]">
                      Why a Queue (FIFO)?
                    </span>
                    <span className="text-xs font-mono text-[#2563EB]">First-In, First-Out</span>
                  </div>
                  <p className="mt-2 text-xs leading-6 text-[#5F5A54]">
                    If you used a Stack (LIFO), you would dive deep down a single path (DFS).
                    The Queue guarantees horizontal layer order.
                  </p>

                  <div className="mt-4 flex flex-wrap items-center gap-2 rounded-xl bg-white p-3 text-xs">
                    <span className="font-medium text-[#5F5A54]">Queue state:</span>
                    <span className="rounded-lg bg-[#E8F0FF] px-2.5 py-1 font-mono font-semibold text-[#2563EB]">
                      [ A ]
                    </span>
                    <span className="text-black/30">&rarr;</span>
                    <span className="rounded-lg bg-[#E8F0FF] px-2.5 py-1 font-mono font-semibold text-[#2563EB]">
                      [ B, C ]
                    </span>
                    <span className="text-black/30">&rarr;</span>
                    <span className="rounded-lg bg-[#E8F0FF] px-2.5 py-1 font-mono font-semibold text-[#2563EB]">
                      [ C, D ]
                    </span>
                    <span className="text-black/30">&rarr;</span>
                    <span className="rounded-lg bg-black/5 px-2.5 py-1 font-mono font-semibold text-[#111111]">
                      [ Empty ]
                    </span>
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-[var(--border)] bg-[#F8F2EA] p-5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#5F5A54]">
                      Mental Model &amp; Invariants
                    </span>
                    <span className="text-xs font-mono text-[#2563EB]">Core Invariant</span>
                  </div>
                  <p className="mt-2 text-xs leading-6 text-[#5F5A54]">
                    Mastering {explanation.topic} relies on preserving invariants at each transformation. Keep the rules above in mind as you trace the visual stepper.
                  </p>
                </div>
              )}

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={nextStage}
                  className="button-primary interactive inline-flex items-center gap-2 rounded-xl bg-[#111111] px-5 py-3 text-sm font-medium text-white hover:bg-[#2563EB]"
                >
                  <span>Next: Interactive Stepper</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STAGE 2: VISUAL EXAMPLE — Step-by-Step Stepper                            */}
          {/* ========================================================================= */}
          {currentStage === 1 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2563EB]">
                    Stage 02 / Visual Example
                  </span>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                    Visual Walkthrough: {explanation.topic}
                  </h2>
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E8F0FF] text-[#2563EB]">
                  <Layers size={20} />
                </div>
              </div>

              <p className="text-sm text-[#5F5A54]">
                Step through each phase to observe how {explanation.topic} progresses systematically from start to finish.
              </p>

              {/* Interactive Canvas */}
              <div className="relative flex flex-col items-center justify-center rounded-2xl border border-[var(--border)] bg-[#F5EEE5]/70 p-6 sm:p-8">
                {/* Visual Graph Representation if Graph Topic */}
                {isGraphTopic && (
                  <div className="relative h-48 w-full max-w-[420px]">
                    <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
                      {/* Line A -> B */}
                      <line
                        x1="50%"
                        y1="22%"
                        x2="28%"
                        y2="75%"
                        stroke={currentStepIndex >= 1 ? "#2563EB" : "rgba(17,17,17,0.2)"}
                        strokeWidth={currentStepIndex >= 1 ? 2.5 : 1.5}
                        strokeDasharray={currentStepIndex >= 1 ? "none" : "3 3"}
                      />
                      {/* Line A -> C */}
                      <line
                        x1="50%"
                        y1="22%"
                        x2="72%"
                        y2="75%"
                        stroke={currentStepIndex >= 2 ? "#2563EB" : "rgba(17,17,17,0.2)"}
                        strokeWidth={currentStepIndex >= 2 ? 2.5 : 1.5}
                        strokeDasharray={currentStepIndex >= 2 ? "none" : "3 3"}
                      />
                      {/* Line B -> D */}
                      <line
                        x1="28%"
                        y1="75%"
                        x2="10%"
                        y2="75%"
                        stroke={currentStepIndex >= 3 ? "#2563EB" : "rgba(17,17,17,0.2)"}
                        strokeWidth={currentStepIndex >= 3 ? 2.5 : 1.5}
                        strokeDasharray={currentStepIndex >= 3 ? "none" : "3 3"}
                      />
                    </svg>

                    {/* Node A (Root, Layer 0) */}
                    <div
                      className={`absolute left-1/2 top-4 flex h-13 w-13 -translate-x-1/2 items-center justify-center rounded-full text-sm font-bold transition-all duration-300 ${
                        currentStepIndex >= 0
                          ? "bg-[#2563EB] text-white shadow-md ring-4 ring-[#2563EB]/25"
                          : "border border-black/20 bg-white text-[#111111]"
                      }`}
                    >
                      A
                    </div>
                    <span className="absolute left-1/2 top-0 -translate-x-1/2 text-[9px] font-semibold uppercase tracking-wider text-[#5F5A54]">
                      Layer 0
                    </span>

                    {/* Node B (Layer 1) */}
                    <div
                      className={`absolute left-[24%] top-24 flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold transition-all duration-300 ${
                        currentStepIndex >= 1
                          ? "bg-[#2563EB] text-white shadow-md ring-4 ring-[#2563EB]/25"
                          : "border border-black/20 bg-white text-[#111111]"
                      }`}
                    >
                      B
                    </div>

                    {/* Node C (Layer 1) */}
                    <div
                      className={`absolute right-[24%] top-24 flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold transition-all duration-300 ${
                        currentStepIndex >= 2
                          ? "bg-[#2563EB] text-white shadow-md ring-4 ring-[#2563EB]/25"
                          : "border border-black/20 bg-white text-[#111111]"
                      }`}
                    >
                      C
                    </div>

                    {/* Node D (Layer 2) */}
                    <div
                      className={`absolute left-[2%] top-24 flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold transition-all duration-300 ${
                        currentStepIndex >= 3
                          ? "bg-[#2563EB] text-white shadow-md ring-4 ring-[#2563EB]/25"
                          : "border border-black/20 bg-white text-[#111111]"
                      }`}
                    >
                      D
                    </div>
                  </div>
                )}

                {/* Step Pipeline Badges */}
                <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
                  {steps.map((st, idx) => {
                    const isPassed = idx <= currentStepIndex;
                    const isCurrent = idx === currentStepIndex;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setTraversalStep(idx)}
                        className={`interactive flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                          isCurrent
                            ? "bg-[#2563EB] text-white shadow-sm"
                            : isPassed
                            ? "bg-white border border-[#2563EB]/30 text-[#2563EB]"
                            : "bg-white/60 border border-black/10 text-[#5F5A54]"
                        }`}
                      >
                        <span className="font-mono text-[10px]">0{idx + 1}</span>
                        <span className="truncate max-w-[120px]">{st.title}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Traversal Step Explanatory Banner */}
                <div className="mt-4 w-full rounded-xl border border-black/10 bg-white p-4">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-[#2563EB]">
                      Step {currentStepIndex + 1} of {steps.length}: {activeStep.title}
                    </span>
                    <span className="font-mono text-[11px] text-[#5F5A54]">
                      Progress: {Math.round(((currentStepIndex + 1) / steps.length) * 100)}%
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-[#111111]">
                    {activeStep.description}
                  </p>
                </div>

                {/* Stepper Controls */}
                <div className="mt-4 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setTraversalStep((prev) => Math.max(0, prev - 1))}
                    disabled={currentStepIndex === 0}
                    className="interactive rounded-lg border border-black/15 bg-white px-3 py-1.5 text-xs font-medium text-[#111111] hover:bg-black/5 disabled:opacity-40"
                  >
                    Previous Step
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setTraversalStep((prev) => (prev < steps.length - 1 ? prev + 1 : 0))
                    }
                    className="button-primary interactive inline-flex items-center gap-1.5 rounded-lg bg-[#2563EB] px-3.5 py-1.5 text-xs font-medium text-white hover:bg-[#1d4ed8]"
                  >
                    {currentStepIndex === steps.length - 1 ? (
                      <>
                        <RotateCcw size={12} /> Replay
                      </>
                    ) : (
                      <>
                        <Play size={12} /> Step Forward
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
                <button
                  type="button"
                  onClick={prevStage}
                  className="interactive text-xs font-medium text-[#5F5A54] hover:text-[#111111]"
                >
                  &larr; Back to Concept
                </button>
                <button
                  type="button"
                  onClick={nextStage}
                  className="button-primary interactive inline-flex items-center gap-2 rounded-xl bg-[#111111] px-5 py-3 text-sm font-medium text-white hover:bg-[#2563EB]"
                >
                  <span>Proceed to Practice Check</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* STAGE 3: PRACTICE — Interactive Check for Understanding                   */}
          {/* ========================================================================= */}
          {currentStage === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#2563EB]">
                    Stage 03 / Applied Practice
                  </span>
                  <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">
                    Verify Your {explanation.topic} Understanding
                  </h2>
                </div>
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#E8F0FF] text-[#2563EB]">
                  <Lightbulb size={20} />
                </div>
              </div>

              <p className="text-sm text-[#5F5A54]">
                To adapt your learning plan and verify this topic gap is resolved, answer the question below.
              </p>

              {/* Question Card */}
              <div className="rounded-2xl border border-[var(--border)] bg-[#F8F2EA] p-5 sm:p-6">
                <span className="rounded-md bg-[#2563EB]/10 px-2 py-0.5 text-[10px] font-bold text-[#2563EB]">
                  PRACTICE QUESTION
                </span>
                <h3 className="mt-3 text-base font-semibold text-[#111111]">
                  {explanation.practiceQuestion.prompt}
                </h3>

                {/* Option Choices */}
                <div className="mt-5 space-y-2.5" role="group" aria-label="Practice options">
                  {explanation.practiceQuestion.options.map((option, idx) => {
                    const isSelected = selectedPracticeOption === idx;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => {
                          setSelectedPracticeOption(idx);
                          setPracticeError(false);
                        }}
                        className={`flex w-full items-start gap-3 rounded-xl border p-3.5 text-left text-xs leading-relaxed transition-all ${
                          isSelected
                            ? "border-[#2563EB] bg-[#E8F0FF] text-[#111111] shadow-sm"
                            : "border-black/10 bg-white hover:border-black/25 text-[#5F5A54]"
                        }`}
                      >
                        <span
                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
                            isSelected
                              ? "border-[#2563EB] bg-[#2563EB] text-white"
                              : "border-black/20 text-[#5F5A54]"
                          }`}
                        >
                          {String.fromCharCode(65 + idx)}
                        </span>
                        <span className="flex-1">{option}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Feedback Banner */}
                {practiceError && (
                  <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                    Not quite. Review the principles and steps in Stage 1 and 2, then select another option!
                  </div>
                )}

                {practiceSubmitted && (
                  <div className="mt-4 rounded-xl border border-[#2563EB]/25 bg-[#E8F0FF] p-4 text-xs text-[#111111]">
                    <div className="flex items-center gap-2 font-semibold text-[#2563EB]">
                      <Check size={16} strokeWidth={2.5} />
                      <span>Correct! Conceptual Gap Mastered</span>
                    </div>
                    <p className="mt-1 leading-5 text-[#5F5A54]">
                      Great job! You have demonstrated clear grasp of {explanation.topic} and verified the concept thoroughly.
                    </p>
                    <p className="mt-2 font-medium text-[#2563EB]">
                      {explanation.topic} mastery increased to 74%! Your Adaptive Study Plan has been updated.
                    </p>
                  </div>
                )}

                {/* Submit Action */}
                <div className="mt-5 flex items-center justify-between border-t border-[var(--border)] pt-4">
                  <button
                    type="button"
                    onClick={prevStage}
                    className="interactive text-xs font-medium text-[#5F5A54] hover:text-[#111111]"
                  >
                    &larr; Back to Visual Example
                  </button>

                  {!practiceSubmitted ? (
                    <button
                      type="button"
                      onClick={handlePracticeSubmit}
                      disabled={selectedPracticeOption === null}
                      className="button-primary interactive inline-flex items-center gap-2 rounded-xl bg-[#111111] px-5 py-2.5 text-xs font-semibold text-white hover:bg-[#2563EB] disabled:opacity-40"
                    >
                      Check Answer
                    </button>
                  ) : (
                    <Link
                      href="/plan"
                      className="button-primary interactive inline-flex items-center gap-2 rounded-xl bg-[#2563EB] px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-[#1d4ed8]"
                    >
                      <span>View Adapted Study Plan</span>
                      <ArrowRight size={14} />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Pedagogical Context Panel (Editorial) */}
        <aside className="space-y-6">
          <div className="panel motion-reveal motion-reveal--card border-[#2563EB]/20 bg-[#E8F0FF]/80 p-6 sm:p-7" data-motion-reveal>
            <div className="flex items-center gap-2 text-[#2563EB]">
              <Sparkles size={16} />
              <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                Why This Lesson?
              </span>
            </div>

            <h3 className="mt-4 text-2xl font-semibold tracking-tight text-[#111111]">
              Built around your gap.
            </h3>

            <p className="mt-2 text-xs leading-6 text-[#3F3B37]">
              LearnOS does not teach random curriculum. Your diagnostic check-in identified {explanation.topic}
              as your lowest score ({weakMastery}%). We target this concept first so you can unlock downstream applications.
            </p>

            <div className="mt-6 space-y-3.5 border-t border-[#2563EB]/15 pt-5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#5F5A54]">Current Understanding:</span>
                <span className="font-mono font-bold text-[#111111]">{weakMastery}%</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#5F5A54]">Priority Concepts:</span>
                <span className="font-semibold text-[#2563EB] truncate max-w-[150px]">
                  {weakAreas.slice(0, 2).join(" · ")}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-[#5F5A54]">Pedagogical Type:</span>
                <span className="text-[#111111]">Conceptual &rarr; Visual &rarr; Practice</span>
              </div>
            </div>

            <div className="mt-6 border-t border-[#2563EB]/15 pt-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5F5A54]">
                The Continuous Learning Loop
              </p>
              <div className="mt-3 space-y-2 text-xs">
                <div className="flex items-center gap-2.5">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#2563EB] text-white text-[9px]">
                    ✓
                  </span>
                  <span className="text-[#111111]">
                    01 / Identify Gap ({explanation.topic} {weakMastery}%)
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#2563EB] text-white text-[9px]">
                    ✓
                  </span>
                  <span className="text-[#111111]">02 / Teach Intuition</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] ${
                      tutorPracticeCompleted
                        ? "bg-[#2563EB] text-white"
                        : "border border-[#2563EB] text-[#2563EB]"
                    }`}
                  >
                    {tutorPracticeCompleted ? "✓" : "3"}
                  </span>
                  <span className={tutorPracticeCompleted ? "text-[#111111]" : "text-[#2563EB] font-medium"}>
                    03 / Verify Practice
                  </span>
                </div>
                <div className="flex items-center gap-2.5">
                  <span
                    className={`flex h-4 w-4 items-center justify-center rounded-full text-[9px] ${
                      tutorPracticeCompleted
                        ? "border border-[#2563EB] text-[#2563EB]"
                        : "border border-black/20 text-[#5F5A54]"
                    }`}
                  >
                    4
                  </span>
                  <span className={tutorPracticeCompleted ? "text-[#2563EB] font-medium" : "text-[#5F5A54]"}>
                    04 / Adapt Study Plan
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="panel motion-reveal motion-reveal--card p-5" data-motion-reveal>
            <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5F5A54]">
              Quick Reference
            </span>
            <h4 className="mt-2 text-sm font-semibold text-[#111111]">
              {explanation.topic} Key Rules
            </h4>
            <div className="mt-3 space-y-2 text-xs text-[#5F5A54]">
              {explanation.keyPoints.slice(0, 2).map((kp, idx) => (
                <p key={idx}>
                  <strong>Point {idx + 1}:</strong> {kp}
                </p>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </FeatureFrame>
  );
}
