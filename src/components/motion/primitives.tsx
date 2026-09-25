import type { CSSProperties, ReactNode } from "react";

type RevealTag = "article" | "div" | "h1" | "h2" | "li" | "p" | "section";
type RevealVariant = "section" | "card" | "stat" | "node" | "plan-item";

type RevealProps = {
  as?: RevealTag;
  children: ReactNode;
  className?: string;
  delayMs?: number;
  id?: string;
  variant?: RevealVariant;
  "aria-label"?: string;
  "aria-labelledby"?: string;
  role?: string;
};

export function Reveal({
  as = "div",
  children,
  className = "",
  delayMs = 0,
  id,
  variant = "section",
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledBy,
  role,
}: RevealProps) {
  const Tag = as;
  const style = delayMs
    ? ({ "--reveal-delay": `${delayMs}ms` } as CSSProperties)
    : undefined;

  return (
    <Tag
      id={id}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabelledBy}
      role={role}
      data-motion-reveal
      className={`motion-reveal motion-reveal--${variant} ${className}`.trim()}
      style={style}
    >
      {children}
    </Tag>
  );
}

type StaggerTag = "div" | "ol" | "ul";

type StaggerProps = {
  as?: StaggerTag;
  children: ReactNode;
  className?: string;
};

export function Stagger({ as = "div", children, className = "" }: StaggerProps) {
  const Tag = as;
  return <Tag className={`motion-stagger ${className}`.trim()}>{children}</Tag>;
}

type AIStatusProps = {
  label: string;
  className?: string;
  state?: "active" | "ready" | "quiet";
};

export function AIStatus({ label, className = "", state = "active" }: AIStatusProps) {
  return (
    <span className={`ai-status ${className}`.trim()} data-state={state}>
      <span className="ai-status__dot" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

type ChapterTransitionProps = {
  chapter: string;
  label: string;
  children: ReactNode;
  className?: string;
};

export function ChapterTransition({
  chapter,
  label,
  children,
  className = "",
}: ChapterTransitionProps) {
  return (
    <section
      className={`chapter-transition motion-reveal motion-reveal--section ${className}`.trim()}
      data-motion-reveal
      data-chapter={chapter}
    >
      <p className="chapter-transition__label">
        <span>Chapter {chapter}</span>
        <span>{label}</span>
      </p>
      {children}
    </section>
  );
}
