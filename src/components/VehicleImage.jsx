import { useMemo, useState } from "react";
import { getOptimizedUrl, getSrcSet } from "../lib/imageUrl.js";

export default function VehicleImage({
  src,
  alt,
  size = "card",
  className,
  style,
  draggable,
  loading = "lazy",
  fetchPriority,
  ...props
}) {
  const [loaded, setLoaded]         = useState(false);
  const [useFallback, setFallback]  = useState(false);
  const [failed, setFailed]         = useState(false);

  const optimizedSrc = useMemo(() => getOptimizedUrl(src, size), [src, size]);
  const srcSet       = useMemo(
    () => (useFallback ? "" : getSrcSet(src, size)),
    [src, size, useFallback]
  );

  function handleError() {
    if (!useFallback && optimizedSrc !== src) {
      // La URL transformada falló (plan free o feature desactivada) → reintentar con original
      setFallback(true);
    } else {
      setFailed(true);
    }
  }

  if (!src || failed) {
    return (
      <div
        className={`vehicle-img-placeholder${className ? ` ${className}` : ""}`}
        style={style}
      >
        <span>{alt || "Imagen no disponible"}</span>
      </div>
    );
  }

  return (
    <img
      src={useFallback ? src : optimizedSrc}
      srcSet={srcSet || undefined}
      alt={alt}
      className={`vehicle-img${loaded ? " vehicle-img--loaded" : " vehicle-img--loading"}${className ? ` ${className}` : ""}`}
      loading={loading}
      decoding="async"
      fetchPriority={fetchPriority}
      draggable={draggable ?? "false"}
      onLoad={() => setLoaded(true)}
      onError={handleError}
      style={style}
      {...props}
    />
  );
}
