"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { FileDown, MessageCircle, Mail, Loader2 } from "lucide-react";

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
  /**
   * Fetcher opcional para PDFs que NO se obtienen por GET (ej. el cotizador, que
   * re-ejecuta el cálculo server-side vía POST). Si se pasa, se usa en lugar de
   * fetch(pdfUrl). El fetch del PDF SOLO ocurre al presionar un botón, nunca al montar.
   */
  getPdfBlob?: () => Promise<Blob>;
}

type Accion = "download" | "whatsapp" | "email";

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
  getPdfBlob,
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
      <p className="text-[11px] text-gray-400">
        En algunos dispositivos el archivo se comparte automáticamente. Si no, se descargará para adjuntarlo manualmente.
      </p>
      {aviso && <p className="text-xs text-amber-600">{aviso}</p>}
    </div>
  );
}
