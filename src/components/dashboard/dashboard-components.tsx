import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { ProgressBar } from "@/components/motion/progress-bar";

type KnowledgeTopicProps = {
  name: string;
  value: number;
  priority?: boolean;
};

export function KnowledgeTopic({ name, value, priority = false }: KnowledgeTopicProps) {
  return (
    <li
      className={`motion-reveal motion-reveal--plan-item rounded-xl px-3 py-3 ${priority ? "bg-accent-soft/70" : ""}`}
      data-motion-reveal
    >
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <span className={`truncate text-sm font-medium ${priority ? "text-foreground" : ""}`}>
            {name}
          </span>
          {priority && (
            <span className="shrink-0 rounded-md bg-white/70 px-2 py-0.5 text-[10px] font-medium text-accent">
              Focus next
            </span>
          )}
        </div>
        <span className={`font-mono text-xs ${priority ? "text-accent" : "text-muted"}`}>
          {value}%
        </span>
      </div>
      <ProgressBar
        value={value}
        label={`${name} knowledge level`}
        tone={priority ? "accent" : "muted"}
        className="h-1.5"
      />
    </li>
  );
}

type OverviewMetricProps = {
  id: string;
  href: string;
  label: string;
  value: string;
  description: string;
  icon: LucideIcon;
};

export function OverviewMetric({
  id,
  href,
  label,
  value,
  description,
  icon: Icon,
}: OverviewMetricProps) {
  return (
    <Link
      id={id}
      href={href}
      className="panel panel-hover interactive motion-reveal motion-reveal--stat block p-5 sm:p-6"
      data-motion-reveal
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-[0.15em] text-muted">
          {label}
        </span>
        <Icon aria-hidden="true" size={18} strokeWidth={1.6} className="text-accent" />
      </div>
      <p className="mt-5 text-2xl font-medium tracking-[-0.04em]">{value}</p>
      <p className="mt-1 text-sm text-muted">{description}</p>
      <span className="mt-5 inline-flex items-center gap-1.5 text-xs font-medium text-foreground">
        View details <span aria-hidden="true">↗</span>
      </span>
    </Link>
  );
}
