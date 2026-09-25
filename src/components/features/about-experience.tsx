"use client";

import Link from "next/link";
import {
  FileText,
  HelpCircle,
  Network,
  GraduationCap,
  CalendarCheck,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Brain,
  Layers,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";

const PILLARS = [
  {
    step: "01",
    title: "Syllabus & Material Ingestion",
    icon: FileText,
    tag: "Topic Extraction",
    description:
      "Transform static syllabi, lecture slides, and PDF/TXT notes into structured learning taxonomies. The engine maps core topics, foundational competencies, and prerequisite dependencies automatically.",
  },
  {
    step: "02",
    title: "Adaptive Diagnostic Assessment",
    icon: HelpCircle,
    tag: "Gap Detection",
    description:
      "Targeted multi-level diagnostic evaluations probe conceptual boundaries. Rather than generic trivia, questions isolate the exact mechanics of learner misconceptions.",
  },
  {
    step: "03",
    title: "Dynamic Knowledge Map",
    icon: Network,
    tag: "Visual Mastery Graph",
    description:
      "An interactive visual graph connects topic nodes with prerequisite paths. Live mastery scores (0–100%) reflect assessment evidence, surfacing weak spots in real time.",
  },
  {
    step: "04",
    title: "Pedagogical AI Tutor",
    icon: GraduationCap,
    tag: "Socratic Guided Learning",
    description:
      "Structured 3-stage mastery flow: Intuitive Analogy, Step-by-Step Visual Mechanics, and an Interactive Practice Check. Builds durable mental models tailored to detected weaknesses.",
  },
  {
    step: "05",
    title: "Adaptive Study Plan",
    icon: CalendarCheck,
    tag: "Dynamic Sequencing",
    description:
      "A living, prioritized 4-task curriculum that recalibrates immediately as students practice and master prerequisite concepts, ensuring every study minute focuses on maximum impact.",
  },
];

export function AboutExperience() {
  const { isAuthenticated } = useAuth();
  const ctaHref = isAuthenticated ? "/dashboard" : "/login";
  const ctaLabel = isAuthenticated ? "Open Workspace" : "Student Login";

  return (
    <main className="mx-auto w-full max-w-[1200px] px-6 py-12 sm:px-10 lg:px-14 lg:py-16">
      
      {/* Hero Section */}
      <section className="space-y-6 text-center max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[#FBF8F4] px-4 py-1.5 text-xs font-semibold tracking-[0.14em] uppercase text-[#2563EB]">
          <Sparkles size={14} className="text-[#2563EB]" />
          Platform Architecture & Vision
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-[-0.05em] text-[#111111] leading-[1.08]">
          The Intelligent Operating System for Deep Learning
        </h1>

        <p className="text-base sm:text-lg text-[#5F5A54] leading-relaxed">
          LearnOS AI replaces passive reading with an active, closed-loop pedagogical engine.
          By linking material analysis directly to diagnostic testing, visual knowledge graphs, and adaptive planning,
          it guarantees every student learns with absolute direction.
        </p>

        {/* Primary CTA */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
          <Link
            href={ctaHref}
            className="inline-flex items-center gap-2 rounded-full bg-[#111111] px-6 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-[#222222] transition active:scale-[0.99]"
          >
            <span>{ctaLabel}</span>
            <ArrowRight size={16} />
          </Link>
          <a
            href="#pillars"
            className="inline-flex items-center gap-2 rounded-full border border-[var(--border)] bg-[#FBF8F4] px-6 py-3.5 text-sm font-medium text-[#111111] hover:bg-black/5 transition"
          >
            Explore the 5 Pillars
          </a>
        </div>
      </section>

      {/* The 5 Pillars Section */}
      <section id="pillars" className="mt-20 space-y-12">
        <div className="text-center space-y-3">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#2563EB]">
            Five Core Architectural Pillars
          </p>
          <h2 className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em] text-[#111111]">
            How LearnOS Closes the Learning Loop
          </h2>
          <p className="text-sm text-[#5F5A54] max-w-xl mx-auto">
            From raw curriculum ingestion to continuous mastery recalibration, each module communicates through shared learning state.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {PILLARS.map((pillar) => {
            const Icon = pillar.icon;
            return (
              <div
                key={pillar.step}
                className="group relative flex flex-col justify-between rounded-3xl border border-[var(--border)] bg-[#FBF8F4] p-7 transition hover:border-[#2563EB]/40 hover:shadow-md"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono font-semibold tracking-wider text-[#5F5A54]/80">
                      PILLAR {pillar.step}
                    </span>
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#E8F0FF] text-[#2563EB] group-hover:bg-[#2563EB] group-hover:text-white transition">
                      <Icon size={20} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <span className="inline-block text-[11px] font-semibold uppercase tracking-wider text-[#2563EB]">
                      {pillar.tag}
                    </span>
                    <h3 className="text-lg font-semibold tracking-[-0.02em] text-[#111111]">
                      {pillar.title}
                    </h3>
                    <p className="text-sm text-[#5F5A54] leading-relaxed">
                      {pillar.description}
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-[var(--border)]/60 flex items-center justify-between text-xs text-[#5F5A54]">
                  <span className="flex items-center gap-1.5 font-medium">
                    <ShieldCheck size={13} className="text-[#2563EB]" />
                    Deterministic Fallback Protected
                  </span>
                </div>
              </div>
            );
          })}

          {/* Architectural Synthesis Card */}
          <div className="group relative flex flex-col justify-between rounded-3xl border border-[#2563EB]/30 bg-gradient-to-br from-[#E8F0FF]/60 via-[#FBF8F4] to-[#FBF8F4] p-7 transition hover:shadow-md">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono font-semibold tracking-wider text-[#2563EB]">
                  COHESIVE LOOP
                </span>
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#2563EB] text-white">
                  <Brain size={20} />
                </div>
              </div>

              <div className="space-y-2">
                <span className="inline-block text-[11px] font-semibold uppercase tracking-wider text-[#2563EB]">
                  Full Loop Integration
                </span>
                <h3 className="text-lg font-semibold tracking-[-0.02em] text-[#111111]">
                  Zero Disjointed Modules
                </h3>
                <p className="text-sm text-[#5F5A54] leading-relaxed">
                  Your syllabus informs your assessment. Your assessment updates your knowledge map. Your knowledge map guides the AI tutor. And your tutor triumphs reshape your daily study plan.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[var(--border)]/60">
              <Link
                href={ctaHref}
                className="inline-flex items-center gap-2 text-xs font-semibold text-[#2563EB] hover:underline"
              >
                <span>Launch Experience</span>
                <ArrowRight size={13} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust & Methodology Banner */}
      <section className="mt-20 rounded-3xl border border-[var(--border)] bg-[#FBF8F4] p-8 sm:p-12 text-center space-y-6">
        <div className="max-w-2xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-black/10 bg-[#F5EEE5] px-3.5 py-1 text-xs font-medium text-[#111111]">
            <Layers size={13} className="text-[#2563EB]" />
            Production Resilience
          </div>

          <h2 className="text-2xl sm:text-3xl font-semibold tracking-[-0.03em] text-[#111111]">
            Engineered with Deterministic Reliability
          </h2>

          <p className="text-sm text-[#5F5A54] leading-relaxed">
            Every AI interaction across syllabus parsing, assessment synthesis, tutor dialogue, and plan adaptation is backed by deterministic fallbacks. Zero dead ends, guaranteed continuity.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href={ctaHref}
            className="inline-flex items-center gap-2 rounded-full bg-[#111111] px-7 py-3.5 text-sm font-semibold text-white shadow-sm hover:bg-[#222222] transition active:scale-[0.99]"
          >
            <span>{ctaLabel}</span>
            <ArrowRight size={16} />
          </Link>
        </div>
      </section>

    </main>
  );
}
