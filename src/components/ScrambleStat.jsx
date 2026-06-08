import { useEffect, useRef, useState } from "react";
import { useScramble } from "../hooks/useScramble.js";

export default function ScrambleStat({ value, label }) {
  const [triggered, setTriggered] = useState(false);
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

  const display = useScramble(triggered ? value : 0, { duration: 1000 });

  return (
    <div ref={ref} className="ox-scramble-stat">
      <strong>{display}</strong>
      <span>{label}</span>
    </div>
  );
}
