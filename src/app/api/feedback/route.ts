import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { uploadFile, deleteFile } from "@/lib/supabase/storage";
import { prisma } from "@/lib/prisma";
import { fileContentMatchesMime } from "@/lib/file-validation";
import { notificarReporteFeedback } from "@/lib/feedback/notificar";
import { randomUUID } from "crypto";

const MAX_ADJUNTOS = 3;
const MAX_SIZE_ARCHIVO = 3 * 1024 * 1024;
// Vercel corta el body de una función serverless cerca de los 4,5 MB. El tope
// combinado se queda por debajo a propósito: si el navegador manda más, la
// request muere en la plataforma y el usuario no ve un error entendible.
const MAX_SIZE_TOTAL = 4 * 1024 * 1024;
// Tope del cuerpo completo, aplicado ANTES de bufferizar nada. MAX_SIZE_TOTAL
// cubre las imágenes; el margen cubre los campos de texto y los separadores
// multipart.
const MAX_BODY = MAX_SIZE_TOTAL + 64 * 1024;

// Control de abuso por autor: es el único endpoint del portal abierto al rol
// USUARIO que escribe en Storage.
const VENTANA_ANTIFLOOD_MS = 10 * 60 * 1000;
const MAX_REPORTES_VENTANA = 5;

const MAX_MENSAJE = 2000;
const MAX_RUTA = 300;
const MAX_MODULO = 60;
const MAX_VIEWPORT = 40;
const MAX_USER_AGENT = 400;

const TIPOS_VALIDOS = new Set(["Problema", "Sugerencia", "Consulta"]);

// MIME permitido → extensión del archivo en Storage. La extensión sale del MIME
// verificado por magic bytes, no del nombre que envía el navegador: así no hay
// que sanitizar nombres de archivo del usuario.
// Es un Map y no un objeto literal a propósito: sobre un objeto, un Content-Type
// como "constructor" o "toString" resuelve a una propiedad heredada de
// Object.prototype (truthy) y se colaría por la whitelist. Map solo ve claves
// propias.
const MIME_PERMITIDOS = new Map<string, string>([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
]);

function esCodigo(e: unknown, code: string): boolean {
  return (
    !!e &&
    typeof e === "object" &&
    "code" in e &&
    (e as { code?: string }).code === code
  );
}

/** Metadato de diagnóstico: se recorta en silencio, nunca invalida un reporte. */
function recortar(
  valor: FormDataEntryValue | null,
  max: number,
): string | null {
  if (typeof valor !== "string") return null;
  const limpio = valor.trim();
  return limpio ? limpio.slice(0, max) : null;
}

async function siguienteCorrelativo(anio: number): Promise<number> {
  const max = await prisma.feedbackReport.aggregate({
    _max: { correlativo: true },
    where: { anio },
  });
  return (max._max.correlativo ?? 0) + 1;
}

/**
 * Deshace un envío que falló a mitad de camino: borra los archivos ya subidos y
 * elimina el reporte (el borrado en cascada se lleva sus adjuntos). Cada paso va
 * aislado: si la limpieza falla, no debe tapar el error original.
 */
async function revertirEnvio(
  paths: string[],
  reporteId: string,
): Promise<void> {
  for (const path of paths) {
    try {
      await deleteFile(path);
    } catch {
      // Peor caso: una imagen huérfana en un bucket privado. No bloquea nada.
    }
  }
  try {
    await prisma.feedbackReport.delete({ where: { id: reporteId } });
  } catch {
    // El reporte queda sin sus imágenes; el mensaje de texto sigue siendo útil.
  }
}

export async function POST(req: NextRequest) {
  // Las rutas /api no pasan por el middleware: el handler se auto-protege.
  // getSession() valida contra Supabase Auth; la variante "fast" lee la cookie
  // sin verificarla y no sirve para proteger nada.
  const session = await getSession();
  if (!session)
    return NextResponse.json(
      {
        error:
          "Tu sesión expiró. Vuelve a iniciar sesión y envía el reporte otra vez.",
      },
      { status: 401 },
    );

  // Sin filtro por rol a propósito: cualquier persona con sesión puede reportar
  // un problema, incluido el rol USUARIO. Por eso este endpoint existe aparte de
  // /api/documentos/upload, que sí bloquea a USUARIO.

  // `req.formData()` bufferiza el cuerpo COMPLETO en memoria y los route
  // handlers no tienen tope propio de body (en `next start` no hay nada delante
  // que lo corte). Sin este chequeo, un envío de cientos de MB se lee entero
  // antes de llegar a las validaciones de tamaño de más abajo. Si no viene
  // content-length no se puede decidir acá: los topes por archivo y por total
  // siguen aplicando después.
  const largoDeclarado = Number(req.headers.get("content-length"));
  if (Number.isFinite(largoDeclarado) && largoDeclarado > MAX_BODY)
    return NextResponse.json(
      {
        error:
          "El reporte pesa demasiado. Envía menos imágenes o más livianas.",
      },
      { status: 413 },
    );

  // Control de abuso, antes de leer el cuerpo: bajo un bucle de POSTs no se
  // bufferiza nada ni se escribe en Storage. Si el conteo falla, no se bloquea
  // el envío: recibir el reporte importa más que aplicar el tope.
  let recientes = 0;
  try {
    recientes = await prisma.feedbackReport.count({
      where: {
        autor_id: session.id,
        created_at: { gte: new Date(Date.now() - VENTANA_ANTIFLOOD_MS) },
      },
    });
  } catch {
    // Sin conteo no hay tope; el resto de las validaciones sigue en pie.
  }
  if (recientes >= MAX_REPORTES_VENTANA)
    return NextResponse.json(
      {
        error:
          "Ya enviaste varios reportes seguidos. Espera unos minutos antes de enviar otro; los anteriores ya llegaron.",
      },
      { status: 429 },
    );

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const mensaje = ((formData.get("mensaje") as string | null) ?? "").trim();
  if (!mensaje)
    return NextResponse.json(
      { error: "Escribe un mensaje antes de enviar el reporte." },
      { status: 400 },
    );
  if (mensaje.length > MAX_MENSAJE)
    return NextResponse.json(
      { error: `El mensaje no puede superar los ${MAX_MENSAJE} caracteres.` },
      { status: 400 },
    );

  const tipo =
    ((formData.get("tipo") as string | null) ?? "").trim() || "Problema";
  if (!TIPOS_VALIDOS.has(tipo))
    return NextResponse.json(
      { error: "Tipo de reporte inválido." },
      { status: 400 },
    );

  const ruta = recortar(formData.get("ruta"), MAX_RUTA);
  const modulo = recortar(formData.get("modulo"), MAX_MODULO);
  const viewport = recortar(formData.get("viewport"), MAX_VIEWPORT);
  const user_agent =
    req.headers.get("user-agent")?.slice(0, MAX_USER_AGENT) ?? null;

  // El input vacío de un <input type="file"> llega como archivo de 0 bytes. La
  // lista cruda se conserva porque el cliente numera la captura sobre ELLA: el
  // índice se traduce más abajo contra la lista ya filtrada.
  const adjuntosCrudos = formData.getAll("adjuntos");
  const archivos = adjuntosCrudos.filter(
    (valor): valor is File => typeof valor !== "string" && valor.size > 0,
  );

  if (archivos.length > MAX_ADJUNTOS)
    return NextResponse.json(
      { error: `Puedes adjuntar hasta ${MAX_ADJUNTOS} imágenes por reporte.` },
      { status: 400 },
    );

  let pesoTotal = 0;
  // La extensión se resuelve junto con la validación del MIME y viaja con el
  // archivo: la ruta en Storage no vuelve a consultar el mapa más adelante.
  const validados: { archivo: File; ext: string }[] = [];
  for (const archivo of archivos) {
    const ext = MIME_PERMITIDOS.get(archivo.type);
    if (!ext)
      return NextResponse.json(
        { error: "Solo se permiten imágenes PNG, JPG o WEBP." },
        { status: 415 },
      );
    if (archivo.size > MAX_SIZE_ARCHIVO)
      return NextResponse.json(
        { error: "Cada imagen debe pesar menos de 3 MB." },
        { status: 413 },
      );
    pesoTotal += archivo.size;
    validados.push({ archivo, ext });
  }
  if (pesoTotal > MAX_SIZE_TOTAL)
    return NextResponse.json(
      {
        error:
          "Las imágenes suman más de 4 MB. Envía menos imágenes o más livianas.",
      },
      { status: 413 },
    );

  // Índice de la captura anotada dentro de "adjuntos". El cliente lo calcula
  // sobre la lista SIN filtrar, así que se resuelve contra `adjuntosCrudos` y
  // recién ahí se traduce a la posición dentro de `archivos`: si se cuela una
  // entrada vacía, la marca no puede correrse al adjunto equivocado. Si lo
  // apuntado quedó fuera, no se marca ninguna captura — es una pista para la
  // bandeja, no un dato crítico.
  const capturaIndexCrudo = (
    (formData.get("captura_index") as string | null) ?? ""
  ).trim();
  let capturaIndex = -1;
  if (capturaIndexCrudo) {
    const n = Number.parseInt(capturaIndexCrudo, 10);
    if (Number.isInteger(n) && n >= 0 && n < adjuntosCrudos.length) {
      const referido = adjuntosCrudos[n];
      if (typeof referido !== "string")
        capturaIndex = archivos.indexOf(referido);
    }
  }

  // Todo se valida ANTES de escribir en la base o en Storage: un rechazo no debe
  // dejar un reporte a medias ni un archivo huérfano en el bucket.
  const preparados: {
    buffer: Buffer;
    mime: string;
    ext: string;
    tamano: number;
    esCaptura: boolean;
  }[] = [];
  for (const [i, { archivo, ext }] of validados.entries()) {
    const buffer = Buffer.from(await archivo.arrayBuffer());
    // El MIME del navegador es declarativo: verificar el contenido real.
    if (!fileContentMatchesMime(archivo.type, buffer))
      return NextResponse.json(
        {
          error:
            "Ese archivo no es una imagen válida. Adjunta una foto o una captura en JPG, PNG o WEBP.",
        },
        { status: 415 },
      );
    preparados.push({
      buffer,
      mime: archivo.type,
      ext,
      tamano: archivo.size,
      esCaptura: i === capturaIndex,
    });
  }

  const anio = new Date().getUTCFullYear();
  let reporte: {
    id: string;
    correlativo: number;
    created_at: Date;
  } | null = null;
  // Reintenta si el correlativo fue tomado por una request concurrente
  // (índice único (correlativo, anio) en DB → P2002). Mismo patrón que los
  // documentos de mantención.
  for (let intento = 0; intento < 4 && !reporte; intento++) {
    const correlativo = await siguienteCorrelativo(anio);
    try {
      reporte = await prisma.feedbackReport.create({
        data: {
          correlativo,
          anio,
          autor_id: session.id,
          tipo,
          mensaje,
          ruta,
          modulo,
          user_agent,
          viewport,
        },
        select: { id: true, correlativo: true, created_at: true },
      });
    } catch (e: unknown) {
      if (esCodigo(e, "P2002")) continue; // correlativo duplicado por carrera → reintentar
      return NextResponse.json(
        { error: "No se pudo guardar el reporte. Intenta nuevamente." },
        { status: 500 },
      );
    }
  }
  if (!reporte)
    return NextResponse.json(
      { error: "No se pudo guardar el reporte. Intenta nuevamente." },
      { status: 500 },
    );

  // Binding inmutable: TypeScript pierde el estrechamiento de un `let` dentro de
  // los closures que vienen más abajo.
  const creado = reporte;

  // ORDEN: primero el reporte, después los archivos.
  // La ruta acordada en Storage es "feedback/<reporteId>/<uuid>.<ext>", así que
  // el id del reporte tiene que existir antes de poder subir nada. Como
  // contrapartida, una subida cortada a la mitad dejaría archivos sin fila: por
  // eso cualquier falla posterior borra lo ya subido y elimina el reporte
  // completo (revertirEnvio). Se prefiere no dejar rastro antes que dejar un
  // reporte en la bandeja con imágenes que no cargan.
  const subidos: {
    path: string;
    mime: string;
    tamano: number;
    esCaptura: boolean;
  }[] = [];
  try {
    for (const preparado of preparados) {
      const path = `feedback/${creado.id}/${randomUUID()}.${preparado.ext}`;
      await uploadFile(path, preparado.buffer, preparado.mime);
      subidos.push({
        path,
        mime: preparado.mime,
        tamano: preparado.tamano,
        esCaptura: preparado.esCaptura,
      });
    }

    if (subidos.length > 0) {
      await prisma.feedbackAdjunto.createMany({
        data: subidos.map((adjunto) => ({
          reporte_id: creado.id,
          storage_path: adjunto.path,
          mime: adjunto.mime,
          tamano: adjunto.tamano,
          es_captura: adjunto.esCaptura,
        })),
      });
    }
  } catch {
    await revertirEnvio(
      subidos.map((adjunto) => adjunto.path),
      creado.id,
    );
    return NextResponse.json(
      {
        error:
          "No se pudieron guardar las imágenes del reporte. Intenta nuevamente.",
      },
      { status: 500 },
    );
  }

  // Mismo criterio silencioso que el registro de auditoría
  // (src/lib/audit/index.ts): un fallo del aviso jamás rompe la operación del
  // usuario. El reporte ya está guardado y visible en la bandeja.
  try {
    await notificarReporteFeedback({
      id: creado.id,
      correlativo: creado.correlativo,
      anio,
      tipo,
      autorNombre: session.nombre,
      autorEmail: session.email,
      ruta,
      modulo,
      mensaje,
      totalAdjuntos: subidos.length,
      creadoEn: creado.created_at,
    });
  } catch {
    // El aviso por correo es accesorio.
  }

  return NextResponse.json(
    { id: creado.id, correlativo: creado.correlativo, anio },
    { status: 201 },
  );
}
