/**
 * Aviso por correo a la cuenta técnica cuando entra un reporte de feedback.
 *
 * Reglas del envío:
 *  - Es best-effort. Si falta configuración o Resend falla, la función no lanza:
 *    el usuario ya vio "enviado" y el reporte está guardado en la base.
 *  - El correo NO lleva imágenes ni datos del portal, y del mensaje va solo un
 *    extracto. Una captura de pantalla —o el propio texto— puede contener RUTs,
 *    montos y datos de clientes: eso vive en el portal y se ve solo dentro de la
 *    bandeja (las imágenes, por URL firmada). Aquí va únicamente el enlace.
 *  - Texto plano, sin HTML ni logos externos.
 *
 * SERVER-ONLY: `RESEND_API_KEY`, `SOPORTE_EMAILS` y `SOPORTE_EMAIL_FROM` no
 * llevan prefijo NEXT_PUBLIC_ y nunca deben llegar al cliente.
 */

import { Resend } from "resend";

export type DatosAvisoFeedback = {
  id: string;
  correlativo: number;
  anio: number;
  tipo: string;
  autorNombre: string;
  autorEmail: string;
  ruta: string | null;
  modulo: string | null;
  mensaje: string;
  totalAdjuntos: number;
};

// Un solo aviso por proceso: esta función corre en cada reporte enviado.
let avisoConfigEmitido = false;

// El aviso sale a una casilla externa: del mensaje va solo lo justo para
// priorizar. El texto completo se lee en la bandeja, dentro del portal.
const MAX_MENSAJE_CORREO = 200;

function extracto(mensaje: string): string {
  const limpio = mensaje.trim();
  if (limpio.length <= MAX_MENSAJE_CORREO) return limpio;
  return `${limpio.slice(0, MAX_MENSAJE_CORREO).trimEnd()}…`;
}

// Mismo patrón que el flujo de invitación de usuarios
// (src/app/(portal)/usuarios/actions.ts): variable explícita → dominio de
// Vercel → localhost. Se limpia la barra final para no armar "//soporte".
function baseUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_SITE_URL ??
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");
  return url.replace(/\/+$/, "");
}

export async function notificarReporteFeedback(datos: DatosAvisoFeedback): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const remitente = process.env.SOPORTE_EMAIL_FROM?.trim();
  // Quién RECIBE el aviso es distinto de quién ACCEDE a la bandeja: el proveedor
  // de correo puede restringir a qué direcciones se le permite escribir, así que
  // el destinatario se configura aparte. Si no se define, se cae a la lista de
  // acceso para no dejar el aviso mudo por omisión.
  const destinatarios = (
    process.env.SOPORTE_NOTIFICAR_A ??
    process.env.SOPORTE_EMAILS ??
    ""
  )
    .split(",")
    .map((correo) => correo.trim())
    .filter(Boolean);

  if (!apiKey || !remitente || destinatarios.length === 0) {
    // La herramienta debe funcionar completa sin correo configurado: el reporte
    // igual quedó guardado y visible en la bandeja.
    if (!avisoConfigEmitido) {
      avisoConfigEmitido = true;
      console.warn(
        "[feedback] Aviso por correo desactivado: falta RESEND_API_KEY, SOPORTE_EMAIL_FROM o el destinatario (SOPORTE_NOTIFICAR_A / SOPORTE_EMAILS).",
      );
    }
    return;
  }

  const enlace = `${baseUrl()}/soporte/${datos.id}`;

  const cuerpo = [
    "Se recibió un nuevo reporte desde el portal Solterra.",
    "",
    `N° de reporte: ${datos.correlativo}/${datos.anio}`,
    `Tipo: ${datos.tipo}`,
    `Enviado por: ${datos.autorNombre} (${datos.autorEmail})`,
    `Pantalla: ${datos.ruta ?? "no informada"}`,
    `Módulo: ${datos.modulo ?? "no informado"}`,
    `Imágenes adjuntas: ${datos.totalAdjuntos}`,
    "",
    "Mensaje (extracto):",
    extracto(datos.mensaje),
    "",
    `Ver el reporte completo: ${enlace}`,
    "",
    "El mensaje completo y las imágenes no se envían por correo: quedan en el portal, en almacenamiento privado.",
  ].join("\n");

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: remitente,
      to: destinatarios,
      replyTo: datos.autorEmail,
      subject: `Solterra · Reporte N°${datos.correlativo} — ${datos.tipo}`,
      text: cuerpo,
    });

    if (error) {
      // Resend devuelve el error en la respuesta, no lo lanza.
      console.warn(`[feedback] No se pudo enviar el aviso del reporte ${datos.id}: ${error.message}`);
    }
  } catch {
    // Red caída, DNS, timeout: el aviso es accesorio, el reporte ya está guardado.
    console.warn(`[feedback] Falló el envío del aviso del reporte ${datos.id}.`);
  }
}
