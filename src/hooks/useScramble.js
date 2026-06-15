import { startTransition, useEffect, useRef, useState } from "react";

const CHARS = "0123456789";
// Update every 3rd frame (~50ms) instead of every frame to halve main-thread work
// while keeping the animation visually smooth.
const FRAME_SKIP = 2;

export function useScramble(targetValue, { duration = 900, delay = 0, onComplete } = {}) {
  const [display, setDisplay] = useState("0");
  const frameRef = useRef(null);
  const startRef = useRef(null);
  const skipRef  = useRef(0);
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  useEffect(() => {
    const target = String(Number(targetValue || 0).toLocaleString("es-AR"));

    const timeout = setTimeout(() => {
      startRef.current = null;
      skipRef.current  = 0;

      function tick(ts) {
        if (!startRef.current) startRef.current = ts;

        // Skip frames to reduce setState frequency (and thus TBT)
        skipRef.current = (skipRef.current + 1) % FRAME_SKIP;
        if (skipRef.current !== 0) {
          frameRef.current = requestAnimationFrame(tick);
          return;
        }

        const elapsed  = ts - startRef.current;
        const progress = Math.min(elapsed / duration, 1);
        const fixedCount = Math.floor(progress * target.length);

        const scrambled = target
          .split("")
          .map((char, i) => {
            if (i < fixedCount) return char;
            if (char === "." || char === "," || char === " ") return char;
            return CHARS[Math.floor(Math.random() * CHARS.length)];
          })
          .join("");

        if (progress < 1) {
          startTransition(() => setDisplay(scrambled));
          frameRef.current = requestAnimationFrame(tick);
        } else {
          startTransition(() => setDisplay(target));
          onCompleteRef.current?.();
        }
      }

      frameRef.current = requestAnimationFrame(tick);
    }, delay);

    return () => {
      clearTimeout(timeout);
      if (frameRef.current) cancelAnimationFrame(frameRef.current);
    };
  }, [targetValue, duration, delay]);

  return display;
}
