"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, MessageCircle, Mail, Printer, Loader2 } from "lucide-react";
import { openPdfForPrint } from "@/lib/pdf-print";

interface Props {
  /** URL GET del PDF (ej. /api/contratos/[id]/pdf). */
  pdfUrl: string;
  fileName: string;
  title: string;
  whatsappMessage: string;
  emailSubject: string;
  emailBody: string;
  emailTo?: string;
  /** Layout compacto (flex-wrap siempre) en vez de apilado en móvil. */
  compact?: boolean;
  /** Oculta la nota explicativa (para usar en una fila de header). */
  hideHint?: boolean;
  /**
   * Fetcher opcional para PDFs que NO se obtienen por GET (ej. el cotizador, que
   * re-ejecuta el cálculo server-side vía POST). Si se pasa, se usa en lugar de
   * fetch(pdfUrl). El fetch del PDF SOLO ocurre al presionar un botón, nunca al montar.
   */
  getPdfBlob?: () => Promise<Blob>;
  /**
   * "botones" (default, comportamiento histórico) o "iconos": grupo segmentado
   * compacto de solo-ícono, pensado para vivir en una fila de cabecera donde
   * ya existe una acción primaria (ej. "Editar") y estas acciones de
   * documento deben quedar en un segundo plano visual, sin competir por
   * atención ni introducir colores fuera de la paleta del proyecto.
   */
  variant?: "botones" | "iconos";
  /**
   * Solo aplica con variant="iconos": agrega "Imprimir" como primer ícono
   * del grupo, para poder reemplazar el PrintPdfButton suelto que antes vivía
   * al lado de este componente.
   */
  incluirImprimir?: boolean;
}

type Accion = "download" | "whatsapp" | "email" | "print";

// Limitación real del navegador: wa.me y mailto NO pueden adjuntar un archivo
// automáticamente. La Web Share API (sobre todo en móvil) sí permite compartir
// el archivo; cuando no está disponible (típico en desktop), se descarga el PDF
// y se abre WhatsApp/correo con un mensaje que pide adjuntarlo manualmente.
export default function PdfShareActions({
  pdfUrl,
  fileName,
  title,
  whatsappMessage,
  emailSubject,
  emailBody,
  emailTo,
  compact,
  hideHint,
  getPdfBlob,
  variant = "botones",
  incluirImprimir,
}: Props) {
  const [busy, setBusy] = useState<Accion | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  async function obtenerBlob(): Promise<Blob> {
    if (getPdfBlob) return getPdfBlob();
    const res = await fetch(pdfUrl);
    if (!res.ok) throw new Error("No se pudo obtener el PDF.");
    return res.blob();
  }

  function descargar(blob: Blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1500);
  }

  function puedeCompartirArchivo(file: File): boolean {
    const nav = navigator as Navigator & { canShare?: (data?: ShareData) => boolean };
    return (
      typeof nav.share === "function" &&
      typeof nav.canShare === "function" &&
      nav.canShare({ files: [file] })
    );
  }

  async function handlePrint() {
    setAviso(null);
    setBusy("print");
    // openPdfForPrint abre la pestaña ANTES del fetch (gesto del usuario), y
    // resuelve por su cuenta el problema de que el endpoint responde con
    // Content-Disposition: attachment. No usamos getPdfBlob acá porque hoy
    // esta variante solo se usa con endpoints GET simples.
    const resultado = await openPdfForPrint(pdfUrl);
    setBusy(null);
    if (!resultado.ok) {
      setAviso(
        resultado.reason === "popup-blocked"
          ? "El navegador bloqueó la ventana emergente. Permite las ventanas emergentes para este sitio e intenta de nuevo."
          : "No se pudo abrir el PDF para imprimir. Intenta de nuevo.",
      );
    }
  }

  async function handleDownload() {
    setAviso(null);
    setBusy("download");
    try {
      descargar(await obtenerBlob());
    } catch {
      setAviso("No se pudo descargar el PDF. Intenta de nuevo.");
    } finally {
      setBusy(null);
    }
  }

  async function compartir(accion: Accion, shareText: string, fallback: () => void) {
    setAviso(null);
    setBusy(accion);
    try {
      const blob = await obtenerBlob();
      const file = new File([blob], fileName, { type: "application/pdf" });

      if (puedeCompartirArchivo(file)) {
        try {
          await (navigator as Navigator).share({ files: [file], title, text: shareText });
          return; // compartido nativamente con el archivo adjunto
        } catch (err) {
          // Cancelado por el usuario → no hacemos fallback ruidoso.
          if (err instanceof DOMException && err.name === "AbortError") return;
          // Cualquier otro error → caemos al fallback (descarga + link).
        }
      }

      // Fallback (típico desktop): descargar el PDF y abrir WhatsApp/correo.
      descargar(blob);
      setAviso("El PDF se descargó. Adjúntalo manualmente si no se adjunta solo.");
      fallback();
    } catch {
      setAviso("No se pudo compartir. Probá con Descargar PDF.");
    } finally {
      setBusy(null);
    }
  }

  function handleWhatsApp() {
    void compartir("whatsapp", whatsappMessage, () =>
      window.open(`https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`, "_blank", "noopener,noreferrer"),
    );
  }

  function handleEmail() {
    void compartir("email", emailBody, () => {
      const to = emailTo ?? "";
      window.location.href = `mailto:${to}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    });
  }

  const icon = (a: Accion, Fallback: typeof FileDown) =>
    busy === a ? <Loader2 className="h-4 w-4 animate-spin" /> : <Fallback className="h-4 w-4" />;

  // Variante compacta para cabeceras: UN solo control segmentado (mismo
  // lenguaje visual que la columna "Acciones" del listado de órdenes de
  // trabajo) en vez de varios botones sueltos. Todo en azul de marca — nunca
  // verde — porque acá estas acciones son secundarias frente a "Editar", que
  // es la única acción primaria de la cabecera.
  if (variant === "iconos") {
    const botonIcono = "p-2 text-[#253158] transition hover:bg-gray-50 disabled:opacity-60";
    return (
      <div className="space-y-1">
        <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white overflow-hidden divide-x divide-gray-200">
          {incluirImprimir && (
            <button
              type="button"
              onClick={handlePrint}
              disabled={busy !== null}
              title="Imprimir"
              aria-label="Imprimir"
              className={botonIcono}
            >
              {icon("print", Printer)}
            </button>
          )}
          <button
            type="button"
            onClick={handleDownload}
            disabled={busy !== null}
            title="Descargar PDF"
            aria-label="Descargar PDF"
            className={botonIcono}
          >
            {icon("download", FileDown)}
          </button>
          <button
            type="button"
            onClick={handleWhatsApp}
            disabled={busy !== null}
            title="Enviar por WhatsApp"
            aria-label="Enviar por WhatsApp"
            className={botonIcono}
          >
            {icon("whatsapp", MessageCircle)}
          </button>
          <button
            type="button"
            onClick={handleEmail}
            disabled={busy !== null}
            title="Enviar por correo"
            aria-label="Enviar por correo"
            className={botonIcono}
          >
            {icon("email", Mail)}
          </button>
        </div>
        {aviso && <p className="text-xs text-amber-600">{aviso}</p>}
      </div>
    );
  }

  const wrap = compact
    ? "flex flex-wrap gap-2"
    : "grid grid-cols-1 gap-2 sm:flex sm:flex-wrap";

  return (
    <div className="space-y-2">
      <div className={wrap}>
        <Button
          onClick={handleDownload}
          disabled={busy !== null}
          className="bg-[#253158] hover:bg-[#1e305e] text-white gap-2 min-h-[44px]"
        >
          {icon("download", FileDown)} Descargar PDF
        </Button>
        <Button
          onClick={handleWhatsApp}
          disabled={busy !== null}
          className="bg-white border border-green-600 text-green-700 hover:bg-green-50 gap-2 min-h-[44px]"
        >
          {icon("whatsapp", MessageCircle)} WhatsApp
        </Button>
        <Button
          onClick={handleEmail}
          disabled={busy !== null}
          className="bg-white border border-gray-300 text-[#253158] hover:bg-gray-50 gap-2 min-h-[44px]"
        >
          {icon("email", Mail)} Correo
        </Button>
      </div>
      {!hideHint && (
        <p className="text-[11px] text-gray-400">
          En algunos dispositivos el archivo se comparte automáticamente. Si no, se descargará para adjuntarlo manualmente.
        </p>
      )}
      {aviso && <p className="text-xs text-amber-600">{aviso}</p>}
    </div>
  );
}
