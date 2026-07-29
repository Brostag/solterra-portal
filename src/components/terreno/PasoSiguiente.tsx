import Link from "next/link";

// Banda de continuidad al final de una página de detalle: propone el siguiente
// documento de la cadena (registro → check list → orden de trabajo →
// certificado) sin cambiar nada de lo que ya está arriba.
//
// Estilos reutilizados tal cual del módulo:
//  - card: "rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6"
//    (secciones de mantencion/planes/[id]/page.tsx y taller/[id]/page.tsx)
//  - botón primario: mismo de PageHeader.tsx y del enlace "Ver orden de
//    trabajo" en planes/[id]/page.tsx
//  - rótulo: mismo "text-xs font-semibold uppercase tracking-wide text-gray-400"
//    que los títulos de sección del detalle
//
// Navegación con <Link> de next/link, que es lo que usan todas las páginas del
// grupo (operativo); InstantLink no se usa en este módulo y además es "use
// client".
//
// Server component: no necesita interactividad.
export default function PasoSiguiente({
  titulo,
  descripcion,
  href,
  cta,
}: {
  /** Ej: "Continuar con el Check List de mantención". */
  titulo: string;
  /** Una línea explicando qué se copia al siguiente paso. Opcional. */
  descripcion?: string;
  href: string;
  /** Texto del botón. Ej: "Crear Check List". */
  cta: string;
}) {
  return (
    <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
            Paso siguiente
          </h2>
          <p className="mt-0.5 text-sm font-semibold text-[#253158]">{titulo}</p>
          {descripcion && (
            <p className="mt-0.5 text-sm text-gray-500">{descripcion}</p>
          )}
        </div>
        <Link
          href={href}
          className="rounded-lg bg-[#253158] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1b2540]"
        >
          {cta}
        </Link>
      </div>
    </section>
  );
}
