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

/**
 * Compose `--reveal-delay` style for a child index (80ms default stagger).
 *
 * IMPORTANT : on plafonne le delay total à 480ms. Sans ça, un roadbook avec
 * 33 jours aurait son dernier item avec un delay de 33×80=2640ms — quand
 * l'utilisateur scrolle vite, il voit du blanc pendant 2-3s avant que les
 * derniers steps apparaissent. Le plafond garantit qu'aucun item ne tarde
 * de plus de ~½s à se révéler, peu importe l'index.
 */
export function staggerStyle(
  index: number,
  stepMs = 80,
  startMs = 0,
  maxDelayMs = 480,
): React.CSSProperties {
  const raw = startMs + index * stepMs;
  const capped = Math.min(raw, startMs + maxDelayMs);
  return { ["--reveal-delay" as string]: `${capped}ms` };
}
