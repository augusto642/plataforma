import React from 'react';

/**
 * Central 216 — ícone Material Symbols auto-hospedado (o mesmo sistema
 * de ícones do protótipo Stitch v2). A fonte variável vive em
 * /public/fonts/material-symbols-outlined.woff2 e a classe
 * .material-symbols-outlined em globals.css; nada de CDN no runtime.
 *
 * Uso: <MaterialIcon name="terminal" className="text-[20px]" />
 * O nome é o identificador do glifo (ex.: "check_circle",
 * "arrow_forward", "smart_toy"). Sem o glifo, renderiza o nome como
 * texto — por isso os nomes usados aqui são validados no spec.
 */
export function MaterialIcon({
  name,
  className = '',
  filled = false,
}: {
  name: string;
  className?: string;
  filled?: boolean;
}) {
  return (
    <span
      aria-hidden="true"
      className={`material-symbols-outlined ${className}`}
      style={
        filled
          ? { fontVariationSettings: "'FILL' 1, 'wght' 400, 'GRAD' 0, 'opsz' 24" }
          : undefined
      }
    >
      {name}
    </span>
  );
}
