"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Brain,
  CheckCircle2,
  GitBranch,
  Network,
  Sparkles,
  Target,
} from "lucide-react";
import { FeatureFrame } from "@/components/features/feature-frame";
import { ProgressBar } from "@/components/motion/progress-bar";
import { useLearning } from "@/context/learning-context";

type NodeLayout = {
  name: string;
  left: string;
  top: string;
  category: "Foundations" | "Intermediate" | "Advanced";
  description: string;
  recommendation: string;
};

const NODE_LAYOUTS: Record<string, NodeLayout> = {
  Arrays: {
    name: "Arrays",
    left: "4%",
    top: "8%",
    category: "Foundations",
    description: "Contiguous memory layout, O(1) index access, two-pointer techniques.",
    recommendation: "Strong foundation. Provides array buffer intuition for queues and hash buckets.",
  },
  "Linked Lists": {
    name: "Linked Lists",
    left: "37%",
    top: "8%",
    category: "Foundations",
    description: "Pointer-based sequential storage, fast insertion/deletion, fast-slow pointers.",
    recommendation: "Strong. Directly reinforces node chaining used in adjacency lists for graphs.",
  },
  Stacks: {
    name: "Stacks",
    left: "70%",
    top: "8%",
    category: "Foundations",
    description: "LIFO semantics, call-stack recursion, parenthesis matching.",
    recommendation: "Solid understanding. Directly applicable to iterative DFS traversals.",
  },
  Trees: {
    name: "Trees",
    left: "8%",
    top: "58%",
    category: "Intermediate",
    description: "Hierarchical non-linear structures, BST operations, in-order/pre-order traversal.",
    recommendation: "Developing. Tree level-order traversal is a direct special case of graph BFS.",
  },
  Hashing: {
    name: "Hashing",
    left: "40%",
    top: "58%",
    category: "Intermediate",
    description: "Key-value indexing, hash functions, collision resolution with chaining.",
    recommendation: "Needs focus. Visited sets in graph traversal rely on hash set lookup O(1).",
  },
  Graphs: {
    name: "Graphs",
    left: "72%",
    top: "58%",
    category: "Advanced",
    description: "Vertices and edges, cycle detection, BFS level-order queue, DFS recursion.",
    recommendation: "Priority learning gap! Master BFS (ripples in water) and DFS before path algorithms.",
  },
};

function getDynamicRecommendation(
  topicName: string,
  score: number,
  isPrimaryGap: boolean
): string {
  if (isPrimaryGap && score < 60) {
    if (topicName === "Graphs") {
      return "Priority learning gap! Master BFS (ripples in water) and DFS before path algorithms.";
    }
    if (topicName === "Trees") {
      return "Priority learning gap! Master binary search tree invariants and recursive in-order traversals.";
    }
    if (topicName === "Hashing") {
      return "Priority learning gap! Focus on collision resolution via chaining and open addressing.";
    }
    if (topicName === "Stacks") {
      return "Priority learning gap! Review LIFO call-stack simulation, monotonic stacks, and balanced parentheses.";
    }
    if (topicName === "Linked Lists") {
      return "Priority learning gap! Practice pointer re-linking, sentinel head nodes, and fast/slow pointer cycles.";
    }
    if (topicName === "Arrays") {
      return "Priority learning gap! Focus on two-pointer techniques, index boundaries, and contiguous buffer mechanics.";
    }
    return `Priority learning gap! Focus on foundational concepts and core algorithms for ${topicName}.`;
  }

  if (isPrimaryGap && score >= 60) {
    return `Strengthened! Solid intuition established for ${topicName}. Continue reinforcing advanced edge cases.`;
  }

  return (
    NODE_LAYOUTS[topicName]?.recommendation ||
    `Mastery at ${score}%. Continue practicing core operations and algorithmic patterns.`
  );
}

export function KnowledgeMapExperience() {
  const {
    courseModel,
    topics,
    knowledgeScores,
    weakestTopic,
    currentPriority,
    currentFocus,
    currentGap,
    tutorPracticeCompleted,
    isSampleData,
    planAdapted,
  } = useLearning();

  const [userSelectedTopic, setUserSelectedTopic] = useState<string | null>(null);

  // Default selection to the dynamic weakest topic unless the user explicitly selected another node
  const activeTopicName = userSelectedTopic || weakestTopic || topics[0]?.name || "Foundations";

  const weakestScore = knowledgeScores[weakestTopic] ?? 31;
  const isWeakGap = weakestScore < 60;
  const strongestTopics = [...topics].sort((first, second) => second.mastery - first.mastery).slice(0, 2);
  const selectedCourseTopic = courseModel.topics.find((t) => t.name === activeTopicName);
  const selectedLayout = NODE_LAYOUTS[activeTopicName] || {
    name: activeTopicName,
    left: "40%",
    top: "58%",
    category: selectedCourseTopic?.difficulty || "Intermediate",
    description:
      selectedCourseTopic?.subtopics.join(", ") ||
      `${activeTopicName} core principles, concepts, and problem solving.`,
    recommendation: `Mastery at ${knowledgeScores[activeTopicName] ?? 50}%. Continue practicing core operations for ${activeTopicName}.`,
  };
  const selectedScore = knowledgeScores[activeTopicName] ?? 50;
  const isSelectedWeakest = activeTopicName === weakestTopic;
  const dynamicRecommendation = getDynamicRecommendation(
    activeTopicName,
    selectedScore,
    isSelectedWeakest
  );

  return (
    <FeatureFrame activeHref="/knowledge-map">
      {/* Editorial Page Header */}
      <section className="motion-reveal motion-reveal--section mb-10 max-w-4xl" data-motion-reveal>
        <div className="mb-4 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-[#5F5A54]">
          <span>03 / Understand</span>
          <span className="h-px w-10 bg-black/20" />
          <span>Knowledge Map</span>
        </div>

        <h1 className="text-4xl font-semibold tracking-[-0.05em] text-[#111111] sm:text-5xl lg:text-6xl">
          Your knowledge, mapped.
        </h1>

        <p className="mt-4 max-w-2xl text-base leading-7 text-[#5F5A54] sm:text-lg">
          {isSampleData
            ? "Seeded DSA sample values give this map a starting shape. Complete a diagnostic to replace them with your own learning signals."
            : "LearnOS combines your diagnostic responses and syllabus into an interactive picture of what you know and where practice can help."}
        </p>
      </section>

      {/* Main Grid: Interactive SVG Knowledge Graph & Topic Inspector */}
      <div className="grid items-start gap-6 lg:grid-cols-[1.45fr_1fr]">
        
        {/* Left Column: Interactive Topological SVG Map */}
        <section
          className="panel motion-reveal motion-reveal--card flex flex-col p-5 sm:p-7"
          data-motion-reveal
          aria-label="Interactive Graph Topology"
        >
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5F5A54]">
                Topic topology &amp; connections
              </p>
              <h2 className="mt-1 text-xl font-medium tracking-[-0.03em] text-[#111111]">
                Foundations → {weakestTopic === "Graphs" ? "Graph Traversal" : `${weakestTopic} Architecture`}
              </h2>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-black/10 bg-[#F5EEE5] px-3 py-1 text-xs text-[#5F5A54]">
              <GitBranch size={13} className="text-[#2563EB]" /> Select node to inspect
            </span>
          </div>

          {/* SVG Map Container */}
          <div
            className="relative h-[340px] w-full overflow-hidden rounded-2xl border border-[var(--border)] bg-[#F8F2EA]/70 p-2 sm:h-[380px]"
            role="region"
            aria-label={`Interactive ${courseModel.courseName} topic map`}
          >
            {/* Background Topological Connector Paths */}
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="edgeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#111111" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#2563EB" stopOpacity="0.45" />
                </linearGradient>
              </defs>
              {/* Paths from Foundations to Trees and Hashing */}
              <path
                d="M 18 24 C 18 42, 22 45, 22 64"
                fill="none"
                stroke="url(#edgeGradient)"
                strokeWidth="0.8"
                strokeDasharray="2 1.5"
                vectorEffect="non-scaling-stroke"
              />
              <path
                d="M 50 24 C 50 42, 24 45, 22 64"
                fill="none"
                stroke="rgba(17,17,17,0.18)"
                strokeWidth="0.8"
                strokeDasharray="2 1.5"
                vectorEffect="non-scaling-stroke"
              />
              <path
                d="M 50 24 C 50 42, 52 45, 52 64"
                fill="none"
                stroke="rgba(17,17,17,0.18)"
                strokeWidth="0.8"
                strokeDasharray="2 1.5"
                vectorEffect="non-scaling-stroke"
              />
              <path
                d="M 82 24 C 82 42, 54 45, 52 64"
                fill="none"
                stroke="rgba(17,17,17,0.18)"
                strokeWidth="0.8"
                strokeDasharray="2 1.5"
                vectorEffect="non-scaling-stroke"
              />
              {/* Paths from Stacks & Trees & Hashing into Graphs */}
              <path
                d="M 82 24 C 82 44, 84 48, 84 64"
                fill="none"
                stroke="#2563EB"
                strokeOpacity="0.65"
                strokeWidth="1.2"
                strokeDasharray="3 2"
                vectorEffect="non-scaling-stroke"
              />
              <path
                d="M 52 74 C 68 76, 74 76, 84 74"
                fill="none"
                stroke="#2563EB"
                strokeOpacity="0.65"
                strokeWidth="1.2"
                strokeDasharray="3 2"
                vectorEffect="non-scaling-stroke"
              />
              <path
                d="M 22 74 C 40 86, 65 86, 84 76"
                fill="none"
                stroke="#2563EB"
                strokeOpacity="0.45"
                strokeWidth="1"
                strokeDasharray="2 2"
                vectorEffect="non-scaling-stroke"
              />
            </svg>

            {/* Rendered Nodes on the Graph */}
            {topics.map((topic, index) => {
              let layout = NODE_LAYOUTS[topic.name];
              if (!layout) {
                const total = Math.max(1, topics.length);
                const half = Math.ceil(total / 2);
                const row = index < half ? 0 : 1;
                const col = row === 0 ? index : index - half;
                const colCount = row === 0 ? half : total - half;
                const spacing = 100 / (colCount + 1);
                const leftPercent = Math.max(3, Math.min(72, (col + 0.5) * spacing));
                const topPercent = row === 0 ? "8%" : "58%";
                const cTopic = courseModel.topics.find((t) => t.name === topic.name);
                let cat: "Foundations" | "Intermediate" | "Advanced" = row === 0 ? "Foundations" : "Intermediate";
                if (cTopic?.difficulty === "Advanced") cat = "Advanced";
                else if (cTopic?.difficulty === "Foundational") cat = "Foundations";
                else if (cTopic?.difficulty === "Intermediate") cat = "Intermediate";

                layout = {
                  name: topic.name,
                  left: `${leftPercent}%`,
                  top: topPercent,
                  category: cat,
                  description: cTopic?.subtopics.join(", ") || `${topic.name} principles.`,
                  recommendation: `Mastery at ${topic.mastery}%.`,
                };
              }
              const isSelected = activeTopicName === topic.name;
              const isFocus = topic.name === weakestTopic;

              return (
                <button
                  key={topic.name}
                  type="button"
                  onClick={() => setUserSelectedTopic(topic.name)}
                  aria-pressed={isSelected}
                  className={`motion-reveal motion-reveal--node absolute z-10 flex w-[28%] flex-col rounded-xl border p-2.5 text-left transition-all duration-200 sm:w-[26%] sm:p-3 ${
                    isSelected
                      ? "border-[#2563EB] bg-[#E8F0FF] shadow-md ring-2 ring-[#2563EB]/25"
                      : isFocus && isWeakGap
                      ? "border-[#2563EB]/60 bg-[#FBF8F4] hover:border-[#2563EB]"
                      : "border-black/15 bg-[#FBF8F4]/95 hover:border-black/35 hover:shadow-sm"
                  }`}
                  data-motion-reveal
                  style={{
                    left: layout.left,
                    top: layout.top,
                    transitionDelay: `${index * 50}ms`,
                  }}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate text-xs font-semibold text-[#111111] sm:text-sm">
                      {topic.name}
                    </span>
                    <span
                      className={`font-mono text-[11px] font-semibold ${
                        isFocus ? "text-[#2563EB]" : "text-[#5F5A54]"
                      }`}
                    >
                      {topic.mastery}%
                    </span>
                  </div>

                  <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-black/10">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        isFocus ? "bg-[#2563EB]" : "bg-[#111111]"
                      }`}
                      style={{ width: `${topic.mastery}%` }}
                    />
                  </div>

                  <div className="mt-2 flex items-center justify-between text-[9px] font-medium uppercase tracking-[0.1em]">
                    <span className="text-[#5F5A54]">{layout.category}</span>
                    {isFocus ? (
                      <span className="text-[#2563EB] font-bold">
                        {isWeakGap ? "Priority Gap" : "Strengthened"}
                      </span>
                    ) : (
                      <span className="text-[#5F5A54]">{topic.level}</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Graph Legend */}
          <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] uppercase tracking-[0.14em] text-[#5F5A54]">
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#111111]" /> Solid Foundations (80%+)
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#5F5A54]" /> Developing (50–79%)
            </span>
            <span className="inline-flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#2563EB]" /> Current Priority Gap (&lt;50%)
            </span>
          </div>

          {/* Topic Mastery List Table below the graph */}
          <div className="mt-6 border-t border-[var(--border)] pt-5">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5F5A54]">
              Mastery Breakdown &middot; {topics.length} Topics
            </p>
            <div className="space-y-2">
              {topics.map((t) => {
                const isSelected = activeTopicName === t.name;
                const isPriority = t.name === weakestTopic;
                return (
                  <button
                    key={t.name}
                    type="button"
                    onClick={() => setUserSelectedTopic(t.name)}
                    className={`flex w-full items-center justify-between rounded-xl px-3.5 py-2.5 text-left transition-colors ${
                      isSelected
                        ? "bg-[#E8F0FF] text-[#2563EB]"
                        : "hover:bg-black/5 text-[#111111]"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className={`h-2 w-2 rounded-full ${
                          isPriority ? "bg-[#2563EB]" : "bg-[#111111]/40"
                        }`}
                      />
                      <span className="text-sm font-medium">{t.name}</span>
                      {isPriority && (
                        <span className="rounded-md bg-[#2563EB]/10 px-2 py-0.5 text-[10px] font-semibold text-[#2563EB]">
                          {tutorPracticeCompleted ? "Refreshed" : "Priority"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-xs text-[#5F5A54]">{t.level}</span>
                      <span className="font-mono text-sm font-semibold">{t.mastery}%</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        {/* Right Column: LearnOS Insight Panel & Topic Inspector */}
        <aside className="space-y-6">
          
          {/* LearnOS Insight: Dynamic Weak Topic Focus */}
          <div className="panel motion-reveal motion-reveal--card border-[#2563EB]/20 bg-[#E8F0FF]/80 p-6 sm:p-7" data-motion-reveal>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[#2563EB]">
                <Sparkles size={16} />
                <span className="text-xs font-semibold uppercase tracking-[0.18em]">
                  LearnOS Insight
                </span>
              </div>
              <span className="rounded-full bg-[#2563EB] px-2.5 py-0.5 text-[10px] font-semibold text-white">
                {isWeakGap ? "Attention Required" : "Progress Made"}
              </span>
            </div>

            <div className="mt-5">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5F5A54]">
                Current Priority
              </p>
              <h3 className="mt-1 text-2xl font-semibold tracking-tight text-[#111111]">
                {currentPriority}
              </h3>
              <p className="mt-1 text-xs text-[#5F5A54]">
                Focus: {currentFocus.join(", ")}
              </p>

              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-semibold tracking-tight text-[#111111]">
                  {weakestScore}%
                </span>
                <span className="text-xs text-[#5F5A54]">current mastery</span>
              </div>
              <ProgressBar
                value={weakestScore}
                label={`${weakestTopic} Mastery`}
                className="mt-3 h-2"
                tone="accent"
              />

              <p className="mt-4 text-xs leading-6 text-[#3F3B37]">
                {isWeakGap
                  ? `${isSampleData ? "Seeded sample values" : "Your current estimates"} show ${strongestTopics[0]?.name || "Foundations"} (${strongestTopics[0]?.mastery ?? 60}%) and ${strongestTopics[1]?.name || "Core"} (${strongestTopics[1]?.mastery ?? 60}%) as the strongest areas. ${weakestTopic} (${weakestScore}%) is the current lowest estimate; focus on ${currentGap}.`
                  : planAdapted
                    ? `Your latest learning evidence has raised every topic estimate above the focus threshold. Continue using the adapted plan to reinforce advanced concepts.`
                    : isSampleData
                      ? "All seeded sample estimates are at or above the focus threshold. A diagnostic will replace them with your own learning evidence."
                      : "All current estimates are at or above the focus threshold. Continue practicing to refine the profile."}
              </p>
            </div>

            {/* 3-Step Mini Flow */}
            <div className="mt-6 border-t border-[#2563EB]/15 pt-5">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-lg bg-white/60 p-2">
                  <span className="block font-mono text-[10px] text-[#2563EB]">01</span>
                  <span className="text-[11px] font-medium text-[#111111]">Gap: {weakestTopic}</span>
                </div>
                <div className="rounded-lg bg-white/60 p-2">
                  <span className="block font-mono text-[10px] text-[#2563EB]">02</span>
                  <span className="text-[11px] font-medium text-[#111111]">
                    Teach: {weakestTopic === "Graphs" ? "BFS" : currentFocus[0] || "Concepts"}
                  </span>
                </div>
                <div className="rounded-lg bg-white/60 p-2">
                  <span className="block font-mono text-[10px] text-[#2563EB]">03</span>
                  <span className="text-[11px] font-medium text-[#111111]">Practice</span>
                </div>
              </div>

              <Link
                href="/tutor"
                className="button-primary interactive mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-[#111111] px-5 py-3.5 text-sm font-medium text-white hover:bg-[#2563EB]"
              >
                <span>{isWeakGap ? `Targeted AI Tutor: ${weakestTopic}` : `Review AI Tutor: ${weakestTopic}`}</span>
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>

          {/* Selected Topic Inspector Card */}
          <div className="panel motion-reveal motion-reveal--card p-6" data-motion-reveal>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#5F5A54]">
                Topic Inspector
              </span>
              <span className="text-xs font-mono font-medium text-[#2563EB]">
                {selectedScore}%
              </span>
            </div>

            <h4 className="mt-2 text-lg font-semibold text-[#111111]">
              {selectedLayout.name}
            </h4>
            <p className="mt-1 text-xs text-[#5F5A54]">
              {selectedLayout.description}
            </p>

            <div className="mt-4 border-t border-[var(--border)] pt-3">
              <p className="text-[11px] font-semibold text-[#111111]">Curriculum Signal:</p>
              <p className="mt-1 text-xs leading-5 text-[#5F5A54]">
                {dynamicRecommendation}
              </p>
            </div>
          </div>

        </aside>
      </div>

      {/* Editorial Chapter / Adaptive Learning Path sequence */}
      <section
        className="panel motion-reveal motion-reveal--section mt-10 p-6 sm:p-9"
        data-motion-reveal
        aria-label="Adaptive Learning Path"
      >
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#5F5A54]">
            Adaptive Architecture
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-[#111111]">
            From Knowledge Gap to Continuous Mastery
          </h2>
          <p className="mt-1 text-sm text-[#5F5A54]">
            How LearnOS turns diagnostic discoveries into an evolving personal curriculum.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            {
              number: "01",
              icon: <Target size={18} />,
              title: "Identify Weakness",
              desc:
                weakestTopic === "Graphs"
                  ? "Graph Traversal flagged at 31% from syllabus analysis & assessment."
                  : `${weakestTopic} flagged at ${weakestScore}% from syllabus analysis & assessment.`,
              active: true,
            },
            {
              number: "02",
              icon: <Brain size={18} />,
              title: "Targeted Teaching",
              desc:
                weakestTopic === "Graphs"
                  ? "AI Tutor introduces BFS 'ripples in water' intuition and queue mechanics."
                  : `AI Tutor introduces ${weakestTopic} core intuition and structural mechanics.`,
              active: true,
            },
            {
              number: "03",
              icon: <Network size={18} />,
              title: "Applied Practice",
              desc: "Interactive traversal checks verify retention before moving ahead.",
              active: tutorPracticeCompleted,
            },
            {
              number: "04",
              icon: <CheckCircle2 size={18} />,
              title: "Adaptive Adaptation",
              desc: "Study Plan immediately updates with customized topological tasks.",
              active: tutorPracticeCompleted,
            },
          ].map((card) => (
            <div
              key={card.number}
              className={`rounded-2xl border p-5 transition-all duration-200 ${
                card.active
                  ? "border-[#2563EB]/30 bg-[#FBF8F4]"
                  : "border-black/10 bg-[#F5EEE5]/60 opacity-70"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-semibold text-[#5F5A54]">
                  {card.number}
                </span>
                <span className="text-[#2563EB]">{card.icon}</span>
              </div>
              <h3 className="mt-6 text-sm font-semibold text-[#111111]">{card.title}</h3>
              <p className="mt-2 text-xs leading-5 text-[#5F5A54]">{card.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </FeatureFrame>
  );
}
