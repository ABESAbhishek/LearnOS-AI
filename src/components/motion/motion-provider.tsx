"use client";

import { useEffect, type ReactNode } from "react";

type MotionProviderProps = {
  children: ReactNode;
};

const MOTION_TARGETS = "[data-motion-reveal], [data-motion-progress]";

export function MotionProvider({ children }: MotionProviderProps) {
  useEffect(() => {
    if (
      !("IntersectionObserver" in window) ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -32px 0px" },
    );

    const observe = (node: Element) => {
      if (node instanceof HTMLElement && node.matches(MOTION_TARGETS)) {
        observer.observe(node);
      }

      if (node instanceof HTMLElement) {
        node.querySelectorAll<HTMLElement>(MOTION_TARGETS).forEach((target) => {
          observer.observe(target);
        });
      }
    };

    document.querySelectorAll<HTMLElement>(MOTION_TARGETS).forEach((target) => {
      observer.observe(target);
    });
    document.documentElement.classList.add("motion-ready");

    const mutations = new MutationObserver((records) => {
      for (const record of records) {
        record.addedNodes.forEach((node) => {
          if (node instanceof Element) observe(node);
        });
      }
    });

    mutations.observe(document.body, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutations.disconnect();
      document.documentElement.classList.remove("motion-ready");
    };
  }, []);

  return <>{children}</>;
}
