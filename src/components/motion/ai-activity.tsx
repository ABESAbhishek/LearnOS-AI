type AiActivityProps = {
  steps?: readonly string[];
  currentStep: number;
  className?: string;
};

const DEFAULT_STEPS = [
  "Analyzing syllabus",
  "Identifying topics",
  "Assessing difficulty",
  "Building knowledge profile",
  "Learning path ready",
] as const;

export function AiActivity({
  steps = DEFAULT_STEPS,
  currentStep,
  className = "",
}: AiActivityProps) {
  const activeStep = Math.min(steps.length - 1, Math.max(0, currentStep));

  return (
    <ol
      className={`ai-activity ${className}`.trim()}
      aria-label="AI processing steps"
      aria-live="polite"
    >
      {steps.map((step, index) => {
        const state = index < activeStep ? "complete" : index === activeStep ? "active" : "upcoming";

        return (
          <li
            key={step}
            className="ai-activity__step"
            data-state={state}
            aria-current={state === "active" ? "step" : undefined}
          >
            <span className="ai-activity__marker" aria-hidden="true">
              {state === "complete" ? "✓" : <span />}
            </span>
            <span className="ai-activity__label">{step}</span>
          </li>
        );
      })}
    </ol>
  );
}
