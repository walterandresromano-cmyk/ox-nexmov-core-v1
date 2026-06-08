import { useEffect, useRef, useState } from "react";

const CHARS = "0123456789";

export function useScramble(targetValue, { duration = 900, delay = 0 } = {}) {
  const [display, setDisplay] = useState("0");
  const frameRef = useRef(null);
  const startRef = useRef(null);

  useEffect(() => {
    const target = String(Number(targetValue || 0).toLocaleString("es-AR"));

    const timeout = setTimeout(() => {
      startRef.current = null;

      function tick(ts) {
        if (!startRef.current) startRef.current = ts;
        const elapsed = ts - startRef.current;
        const progress = Math.min(elapsed / duration, 1);

        // Cuántos caracteres del target ya están "fijados" (de izquierda a derecha)
        const fixedCount = Math.floor(progress * target.length);

        const scrambled = target
          .split("")
          .map((char, i) => {
            if (i < fixedCount) return char;
            if (char === "." || char === "," || char === " ") return char;
            return CHARS[Math.floor(Math.random() * CHARS.length)];
          })
          .join("");

        setDisplay(scrambled);

        if (progress < 1) {
          frameRef.current = requestAnimationFrame(tick);
        } else {
          setDisplay(target);
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
