/**
 * Abre un PDF para imprimir en vez de descargarlo.
 *
 * Los endpoints de PDF del portal responden con
 * `Content-Disposition: attachment`, así que abrir la URL directamente
 * (`window.open(pdfUrl)`) dispara una descarga en vez de mostrar el visor
 * del navegador. Al traer el PDF como blob y abrir una URL `blob:` ese
 * header ya no interviene: el navegador muestra el PDF en su visor nativo,
 * desde donde el usuario puede imprimir.
 */

export type PdfPrintResult =
  | { ok: true }
  | { ok: false; reason: "popup-blocked" | "fetch-error" };

/**
 * IMPORTANTE: la pestaña se abre de forma SÍNCRONA, antes del `fetch`. Si se
 * abre después de un `await` se pierde el gesto del usuario y el bloqueador
 * de pop-ups la cancela en varios navegadores (Safari, y Chrome con
 * configuración estricta).
 */
export async function openPdfForPrint(pdfUrl: string): Promise<PdfPrintResult> {
  const ventana = window.open("", "_blank");
  if (!ventana) {
    return { ok: false, reason: "popup-blocked" };
  }

  try {
    const res = await fetch(pdfUrl);
    if (!res.ok) {
      throw new Error(`No se pudo obtener el PDF (${res.status}).`);
    }
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    ventana.location.href = blobUrl;
    // Revoke diferido: al terminar este handler el visor de la pestaña
    // nueva todavía está leyendo el blob.
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    return { ok: true };
  } catch {
    ventana.close();
    return { ok: false, reason: "fetch-error" };
  }
}
