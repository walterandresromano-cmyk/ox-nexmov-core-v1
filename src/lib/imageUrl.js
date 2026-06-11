const SUPABASE_OBJECT_RE = /\/storage\/v1\/object\/public\//;

// Width + quality por contexto de uso
export const IMAGE_SIZES = {
  thumb:  { w: 160,  q: 82 },
  card:   { w: 480,  q: 80 },
  detail: { w: 960,  q: 82 },
  hero:   { w: 1280, q: 85 },
};

/**
 * Convierte una URL de Supabase Storage al endpoint de transformación
 * con WebP, ancho y calidad opcionales.
 * Devuelve la URL original sin cambios si no es de Supabase Storage.
 */
export function getOptimizedUrl(url, sizeKey = "card") {
  if (!url || typeof url !== "string") return url ?? "";
  if (!SUPABASE_OBJECT_RE.test(url)) return url;

  const { w, q } = IMAGE_SIZES[sizeKey] ?? IMAGE_SIZES.card;
  const base = url.replace(
    "/storage/v1/object/public/",
    "/storage/v1/render/image/public/"
  );
  return `${base}?width=${w}&quality=${q}&format=webp`;
}

/**
 * Genera el atributo srcset (1x / 2x) para imágenes Supabase.
 * Devuelve string vacío para URLs externas.
 */
export function getSrcSet(url, sizeKey = "card") {
  if (!url || typeof url !== "string") return "";
  if (!SUPABASE_OBJECT_RE.test(url)) return "";

  const { w, q } = IMAGE_SIZES[sizeKey] ?? IMAGE_SIZES.card;
  const w2x = Math.min(w * 2, 1920);
  const q2x = Math.max(q - 5, 70);
  const base = url.replace(
    "/storage/v1/object/public/",
    "/storage/v1/render/image/public/"
  );
  return (
    `${base}?width=${w}&quality=${q}&format=webp 1x, ` +
    `${base}?width=${w2x}&quality=${q2x}&format=webp 2x`
  );
}

/**
 * Comprime un File de imagen a WebP antes de subirlo.
 * Si el browser no soporta WebP en canvas, devuelve el archivo original.
 * maxWidth: 1920px — suficiente para cualquier uso en la plataforma.
 */
export async function compressToWebP(file, { maxWidth = 1920, quality = 0.82 } = {}) {
  // Solo comprimir imágenes de tipo image/*
  if (!file?.type?.startsWith("image/")) return file;

  return new Promise((resolve) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      const scale = Math.min(1, maxWidth / (img.naturalWidth || maxWidth));
      const w = Math.round((img.naturalWidth || maxWidth) * scale);
      const h = Math.round((img.naturalHeight || maxWidth) * scale);

      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, w, h);

      canvas.toBlob(
        (blob) => {
          if (!blob) { resolve(file); return; }
          // Si WebP es mayor que el original, usar el original
          if (blob.size >= file.size) { resolve(file); return; }
          const webpName = file.name.replace(/\.[^.]+$/, ".webp");
          resolve(new File([blob], webpName, { type: "image/webp" }));
        },
        "image/webp",
        quality
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(file);
    };

    img.src = objectUrl;
  });
}
