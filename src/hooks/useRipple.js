import { useCallback, useRef } from "react";

export function useRipple() {
  const containerRef = useRef(null);

  const trigger = useCallback((e) => {
    const el = containerRef.current;
    if (!el) return;

    const { left, top, width, height } = el.getBoundingClientRect();
    const x = (e.clientX ?? left + width / 2) - left;
    const y = (e.clientY ?? top + height / 2) - top;
    const size = Math.max(width, height) * 2;

    const ripple = document.createElement("span");
    ripple.className = "ox-ripple";
    ripple.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      left: ${x - size / 2}px;
      top: ${y - size / 2}px;
    `;

    el.appendChild(ripple);
    ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
  }, []);

  return { ref: containerRef, trigger };
}
