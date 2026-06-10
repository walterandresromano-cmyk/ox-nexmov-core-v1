import { useEffect, useRef, useState, useCallback } from "react";
import { useScramble } from "../hooks/useScramble.js";

export default function ScrambleStat({ value, label }) {
  const [triggered, setTriggered] = useState(false);
  const [done, setDone] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setTriggered(true); observer.disconnect(); } },
      { threshold: 0.4 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleComplete = useCallback(() => {
    setDone(true);
    setTimeout(() => setDone(false), 300);
  }, []);

  const display = useScramble(triggered ? value : 0, { duration: 1000, onComplete: handleComplete });

  return (
    <div ref={ref} className="ox-scramble-stat">
      <strong className={done ? "ox-scramble-done" : ""}>{display}</strong>
      <span>{label}</span>
    </div>
  );
}
