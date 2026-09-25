import type { CSSProperties } from "react";

type ProgressBarProps = {
  value: number;
  label: string;
  className?: string;
  tone?: "accent" | "muted";
};

export function ProgressBar({
  value,
  label,
  className = "",
  tone = "accent",
}: ProgressBarProps) {
  const progress = Math.min(100, Math.max(0, value));

  return (
    <div
      className={`progress-track motion-progress progress-tone-${tone} ${className}`.trim()}
      data-motion-progress
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={progress}
      style={{ "--progress-value": `${progress}%` } as CSSProperties}
    >
      <div className="progress-fill" />
    </div>
  );
}
