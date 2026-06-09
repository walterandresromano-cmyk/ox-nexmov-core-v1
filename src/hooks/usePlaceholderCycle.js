import { useEffect, useRef, useState } from "react";

const SUGGESTIONS = [
  "Toyota Corolla 2022...",
  "Ford Ranger XLS...",
  "Volkswagen Polo...",
  "Chevrolet Onix Plus...",
  "Honda Civic EX...",
  "Renault Duster 4x4...",
  "Peugeot 208 GT...",
  "Fiat Cronos Drive...",
];

const TYPE_SPEED  = 60;
const ERASE_SPEED = 35;
const HOLD_MS     = 1800;
const PAUSE_MS    = 400;

export function usePlaceholderCycle(active = true) {
  const [text, setText] = useState("");
  const indexRef  = useRef(0);
  const frameRef  = useRef(null);

  useEffect(() => {
    if (!active) { setText(""); return; }

    let cancelled = false;

    function delay(ms) {
      return new Promise((res) => { frameRef.current = setTimeout(res, ms); });
    }

    async function run() {
      while (!cancelled) {
        const phrase = SUGGESTIONS[indexRef.current % SUGGESTIONS.length];
        indexRef.current++;

        // type
        for (let i = 1; i <= phrase.length; i++) {
          if (cancelled) return;
          setText(phrase.slice(0, i));
          await delay(TYPE_SPEED);
        }

        await delay(HOLD_MS);

        // erase
        for (let i = phrase.length - 1; i >= 0; i--) {
          if (cancelled) return;
          setText(phrase.slice(0, i));
          await delay(ERASE_SPEED);
        }

        await delay(PAUSE_MS);
      }
    }

    run();
    return () => { cancelled = true; clearTimeout(frameRef.current); };
  }, [active]);

  return text;
}
