"use client";

import { useState } from "react";
import { Eye, FileDown, Loader2 } from "lucide-react";
import { openPdfForPrint } from "@/lib/pdf-print";

/**
 * Acciones de documento para una fila del listado de certificados de
 * mantención. Hermano de ChecklistPdfAcciones (misma lógica, endpoint
 * distinto): se mantiene como componente propio en vez de generalizar para no
 * tocar el componente ya en producción del check list.
 *
 * "Ver" abre el PDF en el visor del navegador: el endpoint responde con
 * `Content-Disposition: attachment`, así que se reutiliza `openPdfForPrint`,
 * que trae el PDF como blob para esquivar ese header. "Descargar" sí usa el
 * enlace directo, que es donde el header attachment hace lo correcto.
 */
export default function CertificadoPdfAcciones({
  id,
  anulado,
}: {
  id: string;
  anulado?: boolean;
}) {
  const [abriendo, setAbriendo] = useState(false);
  const pdfUrl = `/api/mantencion/certificado/${id}/pdf`;
  const sufijo = anulado ? " (anulado)" : "";

  async function handleVer() {
    if (abriendo) return;
    setAbriendo(true);
    const resultado = await openPdfForPrint(pdfUrl);
    setAbriendo(false);
    if (!resultado.ok) {
      window.alert(
        resultado.reason === "popup-blocked"
          ? "El navegador bloqueó la ventana emergente. Permite las ventanas emergentes para este sitio e intenta de nuevo."
          : "No se pudo abrir el documento. Intenta de nuevo.",
      );
    }
  }

  return (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={() => void handleVer()}
        disabled={abriendo}
        title={`Ver documento${sufijo}`}
        aria-label={`Ver documento${sufijo}`}
        className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-[#253158] disabled:opacity-50"
      >
        {abriendo ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </button>
      <a
        href={pdfUrl}
        title={`Descargar PDF${sufijo}`}
        aria-label={`Descargar PDF${sufijo}`}
        className="rounded-lg p-1.5 text-gray-500 transition hover:bg-gray-100 hover:text-[#253158]"
      >
        <FileDown className="h-4 w-4" />
      </a>
    </div>
  );
}
