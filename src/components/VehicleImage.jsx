import { useState } from "react";

export default function VehicleImage({
  src,
  alt,
  className,
  style,
  draggable,
  loading = "lazy",
  ...props
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  if (!src || error) {
    return (
      <div className={`vehicle-img-placeholder${className ? ` ${className}` : ""}`} style={style}>
        <span>{alt || "Imagen no disponible"}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`vehicle-img${loaded ? " vehicle-img--loaded" : " vehicle-img--loading"}${className ? ` ${className}` : ""}`}
      loading={loading}
      decoding="async"
      draggable={draggable ?? "false"}
      onLoad={() => setLoaded(true)}
      onError={() => setError(true)}
      style={style}
      {...props}
    />
  );
}
