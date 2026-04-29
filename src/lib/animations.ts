import { useEffect, useRef } from "react";

/**
 * useScrollReveal — IntersectionObserver-based fade-in/slide-up
 *
 * Adds the class `revealed` to any descendant `.reveal` element of the
 * returned ref once it enters the viewport. Children can use the inline
 * style `--reveal-delay` to stagger.
 *
 * Respects prefers-reduced-motion (CSS handles bypass).
 */
export function useScrollReveal<T extends HTMLElement = HTMLElement>(opts?: {
  threshold?: number;
  rootMargin?: string;
}) {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    if (typeof IntersectionObserver === "undefined") {
      // Fallback : reveal everything immediately.
      root.querySelectorAll<HTMLElement>(".reveal").forEach((el) =>
        el.classList.add("revealed"),
      );
      return;
    }
    const targets = Array.from(root.querySelectorAll<HTMLElement>(".reveal"));
    if (targets.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("revealed");
            observer.unobserve(entry.target);
          }
        }
      },
      {
        threshold: opts?.threshold ?? 0.12,
        rootMargin: opts?.rootMargin ?? "0px 0px -8% 0px",
      },
    );

    targets.forEach((t) => observer.observe(t));
    return () => observer.disconnect();
  }, [opts?.threshold, opts?.rootMargin]);

  return ref;
}

/** Compose `--reveal-delay` style for a child index (80ms default stagger). */
export function staggerStyle(
  index: number,
  stepMs = 80,
  startMs = 0,
): React.CSSProperties {
  return { ["--reveal-delay" as string]: `${startMs + index * stepMs}ms` };
}
