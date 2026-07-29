import Link from "next/link";

// Aviso discreto que se muestra arriba de un formulario prellenado desde otro
// documento de la cadena (registro → check list → orden de trabajo →
// certificado). Explica de dónde salieron los datos y deja claro que todo se
// puede corregir.
//
// El estilo replica DraftBanner.tsx (mismo directorio, misma función: aviso no
// intrusivo sobre un formulario): borde #253158/15 sobre fondo #f6f7f9, texto
// #253158 de 14px. No introduce paleta, tipografía ni espaciados nuevos.
//
// Server component: no necesita interactividad.
export default function OrigenBanner({
  titulo,
  detalle,
  href,
}: {
  /** Ej: "Datos copiados del Registro del 27/07/2026". */
  titulo: string;
  /** Ej: "EX-014 · Excavadora". Opcional. */
  detalle?: string;
  /** Si viene, el título enlaza al documento de origen. */
  href?: string;
}) {
  return (
    <div className="rounded-lg border border-[#253158]/15 bg-[#f6f7f9] px-4 py-3">
      <p className="text-sm text-[#253158]">
        {href ? (
          <Link
            href={href}
            className="font-semibold underline underline-offset-2 transition hover:text-[#1b2540]"
          >
            {titulo}
          </Link>
        ) : (
          <span className="font-semibold">{titulo}</span>
        )}
        {detalle && <span className="text-gray-500"> · {detalle}</span>}
        <span className="text-gray-500"> — puedes corregir cualquier campo.</span>
      </p>
    </div>
  );
}
