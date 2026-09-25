"use client";

import { useEffect, useRef, useState } from "react";

type AnimatedNumberProps = {
  value: number;
  className?: string;
};

export function AnimatedNumber({ value, className = "" }: AnimatedNumberProps) {
  const numberRef = useRef<HTMLSpanElement>(null);
  const [currentValue, setCurrentValue] = useState(0);

  useEffect(() => {
    const node = numberRef.current;
    if (!node) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion || !("IntersectionObserver" in window)) {
      const frame = window.requestAnimationFrame(() => setCurrentValue(value));
      return () => window.cancelAnimationFrame(frame);
    }

    let frameId = 0;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();

      const duration = 720;
      let startTime = 0;
      const animate = (time: number) => {
        if (startTime === 0) startTime = time;
        const progress = Math.min(1, (time - startTime) / duration);
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        setCurrentValue(Math.round(value * easedProgress));
        if (progress < 1) frameId = window.requestAnimationFrame(animate);
      };

      frameId = window.requestAnimationFrame(animate);
    }, { threshold: 0.3 });

    observer.observe(node);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frameId);
    };
  }, [value]);

  const format = (number: number) => new Intl.NumberFormat("en-US").format(number);

  return (
    <span ref={numberRef} className={className} aria-live="off">
      <span className="sr-only">{format(value)}</span>
      <span aria-hidden="true">{format(currentValue)}</span>
    </span>
  );
}
