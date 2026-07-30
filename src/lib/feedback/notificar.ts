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
 *  - Se envían las DOS versiones, HTML y texto plano. El texto plano no es
 *    opcional: mejora la entregabilidad y es lo que leen los lectores de
 *    pantalla y los clientes que bloquean HTML. Sin imágenes ni logos externos.
 *
 * Este archivo resuelve configuración, extracto, enlace y envío. La maqueta
 * (asunto, HTML y texto) la arma `./correo-template`, que es una función pura.
 *
 * SERVER-ONLY: `RESEND_API_KEY`, `SOPORTE_EMAILS` y `SOPORTE_EMAIL_FROM` no
 * llevan prefijo NEXT_PUBLIC_ y nunca deben llegar al cliente.
 */

import { Resend } from "resend";
import { construirCorreoFeedback } from "./correo-template";

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
  creadoEn?: Date;
};

// El servidor corre en UTC. La casilla de soporte está en Chile, así que la fecha
// del reporte se formatea en su zona: si no, un reporte de las 21:00 se lee como
// del día siguiente. El cliente de correo muestra cuándo LLEGÓ el aviso, que no
// es lo mismo que cuándo se creó el reporte si el envío se reintenta.
function fechaChile(fecha: Date): string {
  return new Intl.DateTimeFormat("es-CL", {
    timeZone: "America/Santiago",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(fecha);
}

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
    (process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000");
  return url.replace(/\/+$/, "");
}

export async function notificarReporteFeedback(
  datos: DatosAvisoFeedback,
): Promise<void> {
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
    //
    // Se nombra la variable que falta y se registra en CADA intento, no una vez
    // por proceso: esto es un error de configuración, no un evento por reporte.
    // Silenciarlo deja al operador sabiendo que algo falta pero no qué, y en
    // serverless el aviso "una sola vez" se pierde con la instancia que lo emitió.
    const faltan = [
      !apiKey && "RESEND_API_KEY",
      !remitente && "SOPORTE_EMAIL_FROM",
      destinatarios.length === 0 && "SOPORTE_NOTIFICAR_A (o SOPORTE_EMAILS)",
    ].filter(Boolean);

    console.warn(
      `[feedback] Aviso por correo desactivado: falta ${faltan.join(", ")}. ` +
        `El reporte ${datos.correlativo}/${datos.anio} quedó guardado en la bandeja. ` +
        `Si acabas de cargar la variable, el despliegue en curso todavía no la ve: hay que volver a desplegar.`,
    );
    return;
  }

  const enlace = `${baseUrl()}/soporte/${datos.id}`;

  // La plantilla recibe el extracto ya recortado: el mensaje completo no sale
  // del portal. Solo presentación, sin acceso a entorno ni a la base.
  const correo = construirCorreoFeedback({
    correlativo: datos.correlativo,
    anio: datos.anio,
    tipo: datos.tipo,
    autorNombre: datos.autorNombre,
    autorEmail: datos.autorEmail,
    ruta: datos.ruta,
    modulo: datos.modulo,
    totalAdjuntos: datos.totalAdjuntos,
    mensaje: extracto(datos.mensaje),
    enlace,
    ...(datos.creadoEn ? { fechaLegible: fechaChile(datos.creadoEn) } : {}),
  });

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: remitente,
      to: destinatarios,
      replyTo: datos.autorEmail,
      subject: correo.asunto,
      html: correo.html,
      text: correo.texto,
    });

    if (error) {
      // Resend devuelve el error en la respuesta, no lo lanza.
      console.warn(
        `[feedback] No se pudo enviar el aviso del reporte ${datos.id}: ${error.message}`,
      );
    }
  } catch {
    // Red caída, DNS, timeout: el aviso es accesorio, el reporte ya está guardado.
    console.warn(
      `[feedback] Falló el envío del aviso del reporte ${datos.id}.`,
    );
  }
}
