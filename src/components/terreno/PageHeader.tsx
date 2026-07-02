import Link from "next/link";
import type { ReactNode } from "react";

// Cabecera estándar de las páginas de listado del módulo terreno: ícono +
// título + subtítulo, y un botón de acción opcional (ej. "Nuevo X") que cada
// página decide mostrar según permisos. Antes estaba repetida en ~8 páginas.
export default function PageHeader({
  icon,
  titulo,
  subtitulo,
  accion,
}: {
  icon: ReactNode;
  titulo: string;
  subtitulo?: string;
  accion?: { href: string; label: string };
}) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <span className="inline-flex h-11 w-11 items-center justify-center rounded-lg bg-[#253158]/10 text-[#253158]">
          {icon}
        </span>
        <div>
          <h1 className="text-2xl font-bold text-[#253158]">{titulo}</h1>
          {subtitulo && <p className="mt-0.5 text-sm text-gray-500">{subtitulo}</p>}
        </div>
      </div>
      {accion && (
        <Link
          href={accion.href}
          className="rounded-lg bg-[#253158] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1b2540]"
        >
          {accion.label}
        </Link>
      )}
    </header>
  );
}
