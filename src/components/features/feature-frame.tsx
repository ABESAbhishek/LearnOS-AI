import type { ReactNode } from "react";

type FeatureFrameProps = {
  activeHref?: string;
  children: ReactNode;
};

export function FeatureFrame({ children }: FeatureFrameProps) {
  return (
    <main className="mx-auto w-full max-w-[1440px] px-6 pb-16 pt-10 sm:px-10 sm:pt-14 lg:px-16">
      {children}
    </main>
  );
}

type FeatureHeadingProps = {
  eyebrow: string;
  title: string;
  description: string;
  aside?: ReactNode;
};

export function FeatureHeading({ eyebrow, title, description, aside }: FeatureHeadingProps) {
  return (
    <header className="motion-reveal motion-reveal--section mb-8 flex flex-col gap-5 sm:mb-10 sm:flex-row sm:items-end sm:justify-between" data-motion-reveal>
      <div className="max-w-3xl">
        <p className="mb-4 text-[11px] font-semibold uppercase tracking-[0.19em] text-accent">
          {eyebrow}
        </p>
        <h1 className="text-4xl font-medium leading-[1.06] tracking-[-0.06em] sm:text-5xl lg:text-[3.65rem]">
          {title}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted sm:text-base">
          {description}
        </p>
      </div>
      {aside}
    </header>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">
      {children}
    </p>
  );
}
