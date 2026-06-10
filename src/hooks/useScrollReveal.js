import { useEffect, useRef } from "react";

const observer =
  typeof IntersectionObserver !== "undefined"
    ? new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("ox-revealed");
              observer.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
      )
    : null;

export function useScrollReveal(delay = 0) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || !observer) return;

    el.style.setProperty("--reveal-delay", `${delay}ms`);
    observer.observe(el);

    return () => observer.unobserve(el);
  }, [delay]);

  return ref;
}
