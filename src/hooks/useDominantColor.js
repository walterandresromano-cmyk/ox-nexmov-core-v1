import { useEffect, useState } from "react";

const cache = new Map();

function extractDominantColor(imageUrl) {
  return new Promise((resolve) => {
    if (cache.has(imageUrl)) {
      resolve(cache.get(imageUrl));
      return;
    }

    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = 8;
        canvas.height = 8;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, 8, 8);

        const data = ctx.getImageData(0, 0, 8, 8).data;
        let rSum = 0, gSum = 0, bSum = 0, count = 0;

        for (let i = 0; i < data.length; i += 4) {
          const r = data[i], g = data[i + 1], b = data[i + 2], a = data[i + 3];
          if (a < 128) continue;

          const brightness = (r + g + b) / 3;
          if (brightness < 25 || brightness > 240) continue;

          // Descartar grises puros (baja saturación)
          const max = Math.max(r, g, b);
          const min = Math.min(r, g, b);
          const saturation = max === 0 ? 0 : (max - min) / max;
          if (saturation < 0.12) continue;

          rSum += r; gSum += g; bSum += b; count++;
        }

        if (count < 3) {
          cache.set(imageUrl, null);
          resolve(null);
          return;
        }

        const result = {
          r: Math.round(rSum / count),
          g: Math.round(gSum / count),
          b: Math.round(bSum / count),
        };
        cache.set(imageUrl, result);
        resolve(result);
      } catch {
        cache.set(imageUrl, null);
        resolve(null);
      }
    };

    img.onerror = () => {
      cache.set(imageUrl, null);
      resolve(null);
    };

    img.src = imageUrl;
  });
}

export function useDominantColor(imageUrl) {
  const [color, setColor] = useState(null);

  useEffect(() => {
    if (!imageUrl) return;
    let cancelled = false;

    extractDominantColor(imageUrl).then((result) => {
      if (!cancelled) setColor(result);
    });

    return () => { cancelled = true; };
  }, [imageUrl]);

  return color;
}
