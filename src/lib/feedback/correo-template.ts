/**
 * Plantilla del aviso por correo de un reporte de feedback.
 *
 * FUNCIÓN PURA. Este módulo no lee `process.env`, no toca red, no toca Prisma y
 * no importa nada del proyecto: recibe datos ya resueltos y devuelve asunto,
 * HTML y texto plano. Así se puede renderizar en aislamiento para revisar el
 * diseño sin levantar la app. La configuración, el recorte del extracto, el
 * armado del enlace y el envío siguen viviendo en `./notificar`.
 *
 * PRIVACIDAD: el correo NUNCA lleva las imágenes ni el mensaje completo. Una
 * captura del portal puede contener RUTs, montos y datos de clientes. Aquí solo
 * va el extracto que entrega el llamador y el enlace a la bandeja.
 *
 * REGLAS DE HTML PARA CORREO (esto no es la web):
 *  - Layout con tablas anidadas. Outlook usa el motor de Word: sin flex, sin
 *    grid, sin float.
 *  - Estilos inline. El único <style> es el bloque de media queries para móvil,
 *    y el diseño tiene que verse bien sin él (Outlook lo ignora).
 *  - Cero imágenes, cero fuentes web, cero SVG, cero JavaScript. Los clientes
 *    bloquean imágenes por defecto: la identidad se logra con tipografía, color
 *    y espaciado.
 *  - `color-scheme: light` + bgcolor y color explícitos en cada celda, porque
 *    Gmail invierte colores en modo oscuro y sin eso queda texto oscuro sobre
 *    fondo oscuro.
 */

export type DatosCorreoFeedback = {
  correlativo: number;
  anio: number;
  tipo: string;
  autorNombre: string;
  autorEmail: string;
  ruta: string | null;
  modulo: string | null;
  totalAdjuntos: number;
  /** Extracto ya recortado por el llamador. Nunca el mensaje completo. */
  mensaje: string;
  /** URL absoluta al reporte, ya armada por el llamador. */
  enlace: string;
  /** Opcional, ya formateada por el llamador (zona de Chile). */
  fechaLegible?: string;
};

export type CorreoFeedback = { asunto: string; html: string; texto: string };

// Pila de fuentes del sistema. Comillas simples: el valor va dentro de un
// atributo style delimitado por comillas dobles.
const FUENTE =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif";

const AZUL = "#253158";
const AZUL_ATENUADO = "#a9b2cb";
const GRIS_ETIQUETA = "#8b93a5";
const GRIS_TEXTO = "#5b6273";
const GRIS_FONDO = "#f6f7f9";
const BORDE = "#e6e9ef";
const BORDE_FILA = "#edeff3";
const BLANCO = "#ffffff";

type ColorTipo = { fondo: string; texto: string; borde: string };

// Mismo criterio que la bandeja del portal: TIPO_COLORS en
// `src/app/(portal)/soporte/vocabulario.ts`, con esas clases de Tailwind
// traducidas a hex para poder ir inline. Si allá cambia un color, cambiarlo
// también acá (el correo no puede importar clases). El mapa es abierto con
// fallback: el catálogo de tipos puede crecer.
const TIPO_COLORES: Record<string, ColorTipo> = {
  // bg-red-50 / text-[#c6352e] / border-red-200
  Problema: { fondo: "#fef2f2", texto: "#c6352e", borde: "#fecaca" },
  // bg-indigo-50 / text-indigo-600 / border-indigo-200
  Sugerencia: { fondo: "#eef2ff", texto: "#4f46e5", borde: "#c7d2fe" },
  // bg-sky-50 / text-sky-600 / border-sky-200
  Consulta: { fondo: "#f0f9ff", texto: "#0284c7", borde: "#bae6fd" },
};

// bg-gray-50 / text-gray-500 / border-gray-200
const TIPO_COLOR_FALLBACK: ColorTipo = {
  fondo: "#f9fafb",
  texto: "#6b7280",
  borde: "#e5e7eb",
};

// Espejo de MODULO_LABELS del vocabulario. Solo presentación: el dato que llega
// es el del enum, y si aparece uno nuevo se muestra tal cual.
const MODULO_LABELS: Record<string, string> = {
  COMERCIAL: "Comercial",
  MANTENCION: "Mantención",
  OPERACION: "Operación",
};

/**
 * Escapa lo que escribe un usuario antes de interpolarlo en el HTML. Sin
 * dependencias a propósito. Cubre atributos y contenido: un mensaje con
 * "<script>" o con "</td>" no puede romper la maqueta ni inyectar nada.
 */
function escapar(valor: string): string {
  return valor
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Escapa y además conserva los saltos de línea que escribió la persona. En HTML
 * un \n colapsa a un espacio, así que sin esto un reporte escrito en varios
 * párrafos llega como un bloque corrido y se pierde su estructura.
 * El escapado va PRIMERO: así el <br> que se inserta es el único markup posible.
 */
function conSaltos(valor: string): string {
  return escapar(valor).replace(/\r\n|\r|\n/g, "<br />");
}

/** Solo http/https llegan a un href. Cualquier otra cosa se muestra como texto. */
function urlSegura(enlace: string): string | null {
  const limpio = enlace.trim();
  return /^https?:\/\//i.test(limpio) ? limpio : null;
}

function etiquetaAdjuntos(total: number): string {
  if (total <= 0) return "Sin imágenes";
  if (total === 1) return "1 imagen";
  return `${total} imágenes`;
}

/** Fila etiqueta/valor. La etiqueta va a la izquierda en desktop y arriba en móvil. */
function fila(etiqueta: string, valorHtml: string, ultima = false): string {
  const borde = ultima ? "none" : `1px solid ${BORDE_FILA}`;
  return `
              <tr>
                <td class="et" bgcolor="${BLANCO}" valign="top" width="148" style="width:148px; padding:14px 16px 14px 0; border-bottom:${borde}; font-family:${FUENTE}; font-size:10px; line-height:16px; letter-spacing:1px; text-transform:uppercase; font-weight:700; color:${GRIS_ETIQUETA}; mso-line-height-rule:exactly;">${etiqueta}</td>
                <td class="val" bgcolor="${BLANCO}" valign="top" style="padding:14px 0; border-bottom:${borde}; font-family:${FUENTE}; font-size:14px; line-height:20px; color:${AZUL}; font-weight:600; overflow-wrap:break-word; word-break:break-word; mso-line-height-rule:exactly;">${valorHtml}</td>
              </tr>`;
}

export function construirCorreoFeedback(
  datos: DatosCorreoFeedback,
): CorreoFeedback {
  const numero = `${datos.correlativo}/${datos.anio}`;
  const asunto = `Solterra · Reporte N°${datos.correlativo} — ${datos.tipo}`;

  const tipo = datos.tipo.trim();
  const color = TIPO_COLORES[tipo] ?? TIPO_COLOR_FALLBACK;
  const modulo = datos.modulo
    ? (MODULO_LABELS[datos.modulo] ?? datos.modulo)
    : null;
  const adjuntos = etiquetaAdjuntos(datos.totalAdjuntos);
  const extracto = datos.mensaje.trim();

  const enlaceOk = urlSegura(datos.enlace);
  const enlaceTexto = escapar(datos.enlace.trim());

  // --- Texto plano ------------------------------------------------------
  // No es opcional: mejora la entregabilidad y es lo que leen los lectores de
  // pantalla y los clientes que bloquean HTML.
  const texto = [
    "Se recibió un nuevo reporte desde el portal Solterra.",
    "",
    `N° de reporte: ${numero}`,
    `Tipo: ${tipo}`,
    `Enviado por: ${datos.autorNombre} (${datos.autorEmail})`,
    `Pantalla: ${datos.ruta ?? "no informada"}`,
    `Módulo: ${modulo ?? "no informado"}`,
    `Imágenes adjuntas: ${datos.totalAdjuntos}`,
    ...(datos.fechaLegible ? [`Fecha: ${datos.fechaLegible}`] : []),
    "",
    "Mensaje (extracto):",
    extracto,
    "",
    `Ver el reporte completo: ${datos.enlace.trim()}`,
    "",
    "El mensaje completo y las imágenes no se envían por correo: quedan en el portal, en almacenamiento privado.",
  ].join("\n");

  // --- HTML -------------------------------------------------------------
  // Lo que Gmail muestra en la bandeja: resume el reporte, no repite el asunto.
  const preheader = escapar(
    `${tipo} de ${datos.autorNombre}${modulo ? ` · ${modulo}` : ""} · ${adjuntos.toLowerCase()} en el portal`,
  );

  const filas = [
    fila(
      "Enviado por",
      `<div style="font-family:${FUENTE}; font-size:14px; line-height:20px; color:${AZUL}; font-weight:600;">${escapar(datos.autorNombre)}</div>
                  <div style="font-family:${FUENTE}; font-size:12px; line-height:18px; color:${GRIS_TEXTO}; font-weight:400; padding-top:2px;">${escapar(datos.autorEmail)}</div>`,
    ),
    fila("Pantalla", escapar(datos.ruta ?? "No informada")),
    fila("Módulo", escapar(modulo ?? "No informado")),
    fila("Imágenes adjuntas", escapar(adjuntos), !datos.fechaLegible),
    ...(datos.fechaLegible
      ? [fila("Fecha", escapar(datos.fechaLegible), true)]
      : []),
  ].join("");

  const botonInterior = enlaceOk
    ? `<a href="${escapar(enlaceOk)}" style="display:block; font-family:${FUENTE}; font-size:15px; line-height:20px; font-weight:600; color:${BLANCO}; text-decoration:none; letter-spacing:0.2px; mso-line-height-rule:exactly;">Ver el reporte completo</a>`
    : `<span style="display:block; font-family:${FUENTE}; font-size:15px; line-height:20px; font-weight:600; color:${BLANCO}; letter-spacing:0.2px;">Ver el reporte completo</span>`;

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta http-equiv="X-UA-Compatible" content="IE=edge">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<meta name="x-apple-disable-message-reformatting">
<title>${escapar(asunto)}</title>
<!--[if mso]>
<style>body,table,td,a,div,span{font-family:Arial,Helvetica,sans-serif !important;}</style>
<![endif]-->
<style>
  /* Único bloque de CSS: solo móvil. Outlook lo ignora y el diseño se sostiene
     igual porque todo lo estructural va inline. */
  @media only screen and (max-width:480px) {
    .banda { padding:22px 20px !important; }
    .caja { padding:24px 20px !important; }
    .titulo { font-size:19px !important; line-height:26px !important; }
    .col { display:block !important; width:100% !important; text-align:left !important; }
    .col-badge { padding:12px 0 0 0 !important; }
    /* align="right" se traduce a float:right en el navegador; al apilar hay que soltarlo */
    .col-badge table { float:none !important; }
    .et { display:block !important; width:100% !important; padding:14px 0 2px 0 !important; border-bottom:0 !important; }
    .val { display:block !important; width:100% !important; padding:0 0 14px 0 !important; }
    .pie { padding:20px !important; }
  }
</style>
</head>
<body style="margin:0; padding:0; width:100%; background-color:${GRIS_FONDO}; -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%;">
<div style="display:none; font-size:0; line-height:0; max-height:0; max-width:0; overflow:hidden; opacity:0; mso-hide:all;">${preheader}&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;&#8203;</div>
<table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="${GRIS_FONDO}" style="width:100%; background-color:${GRIS_FONDO};">
  <tr>
    <td align="center" style="padding:28px 12px 36px 12px;">
      <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="600" style="width:600px; max-width:600px;">

        <!-- Cabecera -->
        <tr>
          <td class="banda" bgcolor="${AZUL}" style="background-color:${AZUL}; padding:26px 32px; border-left:1px solid ${AZUL}; border-right:1px solid ${AZUL}; border-radius:8px 8px 0 0;">
            <div style="font-family:${FUENTE}; font-size:19px; line-height:24px; font-weight:700; letter-spacing:6px; color:${BLANCO}; mso-line-height-rule:exactly;">SOLTERRA</div>
            <div style="font-family:${FUENTE}; font-size:10px; line-height:16px; font-weight:600; letter-spacing:1.6px; text-transform:uppercase; color:${AZUL_ATENUADO}; padding-top:7px; mso-line-height-rule:exactly;">Portal · Reportes de soporte</div>
          </td>
        </tr>

        <!-- Cuerpo -->
        <tr>
          <td class="caja" bgcolor="${BLANCO}" style="background-color:${BLANCO}; padding:32px; border-left:1px solid ${BORDE}; border-right:1px solid ${BORDE};">

            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
              <tr>
                <td class="col" valign="middle" align="left" bgcolor="${BLANCO}" style="background-color:${BLANCO}; font-family:${FUENTE};">
                  <span class="titulo" style="font-family:${FUENTE}; font-size:24px; line-height:30px; font-weight:700; color:${AZUL}; letter-spacing:-0.2px; mso-line-height-rule:exactly;">Reporte N° ${escapar(numero)}</span>
                </td>
                <td class="col col-badge" valign="middle" align="right" bgcolor="${BLANCO}" style="background-color:${BLANCO}; text-align:right;">
                  <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="right" style="display:inline-table;">
                    <tr>
                      <td bgcolor="${color.fondo}" align="center" style="background-color:${color.fondo}; border:1px solid ${color.borde}; border-radius:999px; padding:7px 15px; font-family:${FUENTE}; font-size:10px; line-height:14px; font-weight:700; letter-spacing:1.1px; text-transform:uppercase; color:${color.texto}; white-space:nowrap; mso-line-height-rule:exactly;">${escapar(tipo)}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>

            <div style="font-family:${FUENTE}; font-size:14px; line-height:22px; color:${GRIS_TEXTO}; padding-top:10px; mso-line-height-rule:exactly;">Se recibió un nuevo reporte desde el portal Solterra.</div>

            <!-- Datos del reporte -->
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%; border-top:1px solid ${BORDE}; margin-top:24px;">${filas}
            </table>

            <!-- Extracto del mensaje -->
            <div style="font-family:${FUENTE}; font-size:10px; line-height:16px; letter-spacing:1px; text-transform:uppercase; font-weight:700; color:${GRIS_ETIQUETA}; padding:26px 0 10px 0; mso-line-height-rule:exactly;">Mensaje (extracto)</div>
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="width:100%;">
              <tr>
                <td bgcolor="${AZUL}" width="4" style="width:4px; background-color:${AZUL}; font-size:0; line-height:0;">&nbsp;</td>
                <td bgcolor="${GRIS_FONDO}" style="background-color:${GRIS_FONDO}; padding:16px 18px; font-family:${FUENTE}; font-size:14px; line-height:22px; color:#3f4658; overflow-wrap:break-word; word-break:break-word; mso-line-height-rule:exactly;">${conSaltos(extracto)}</td>
              </tr>
            </table>

            <!-- Botón a prueba de Outlook: el padding y el fondo van en la celda -->
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" align="center" style="margin:28px auto 0 auto;">
              <tr>
                <td bgcolor="${AZUL}" align="center" style="background-color:${AZUL}; border-radius:6px; padding:14px 30px;">${botonInterior}</td>
              </tr>
            </table>
            <div style="font-family:${FUENTE}; font-size:11px; line-height:18px; color:${GRIS_ETIQUETA}; text-align:center; padding-top:14px; word-break:break-all; mso-line-height-rule:exactly;">Si el botón no funciona, abre este enlace:<br>${
              enlaceOk
                ? `<a href="${escapar(enlaceOk)}" style="color:${AZUL}; text-decoration:underline;">${enlaceTexto}</a>`
                : enlaceTexto
            }</div>

          </td>
        </tr>

        <!-- Pie -->
        <tr>
          <td class="pie" bgcolor="${BLANCO}" style="background-color:${BLANCO}; padding:22px 32px 26px 32px; border:1px solid ${BORDE}; border-top:1px solid ${BORDE_FILA}; border-radius:0 0 8px 8px;">
            <div style="font-family:${FUENTE}; font-size:11px; line-height:18px; color:${GRIS_ETIQUETA}; mso-line-height-rule:exactly;">El mensaje completo y las imágenes no se envían por correo: quedan en el portal, en almacenamiento privado.</div>
            <div style="font-family:${FUENTE}; font-size:11px; line-height:18px; color:${GRIS_ETIQUETA}; padding-top:8px; mso-line-height-rule:exactly;">Aviso automático del Portal Solterra.</div>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

  return { asunto, html, texto };
}
