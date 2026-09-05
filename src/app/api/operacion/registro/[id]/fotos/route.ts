export const dynamic = "force-dynamic";

import { randomUUID } from "crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { fileContentMatchesMime } from "@/lib/file-validation";
import { canAccessModule } from "@/lib/modules";
import { prisma } from "@/lib/prisma";
import { deleteFile, uploadFile } from "@/lib/supabase/storage";
import { MANT_PARTES_TAG } from "@/lib/terreno/queries";
import type { UserSession } from "@/types";

// Fotos del Registro de Ingreso/Salida de Equipos, agrupadas en 3 momentos del
// ciclo: tablero (al ingreso), entrada y salida. Reutiliza el mismo patrón de
// /api/feedback: tope de Content-Length ANTES de bufferizar, MIME verificado
// por magic bytes (nunca por `file.type` ni por el nombre del archivo), y
// limpieza de lo ya subido a Storage si la escritura en BD falla después.

type Grupo = "tablero" | "entrada" | "salida";
const GRUPOS_VALIDOS: Grupo[] = ["tablero", "entrada", "salida"];

const MAX_FOTOS_POR_GRUPO = 6;
const MAX_SIZE_ARCHIVO = 4 * 1024 * 1024; // 4 MB por foto
// Tope del body completo, verificado contra Content-Length ANTES de leer el
// FormData: sin esto, req.formData() bufferiza cualquier tamaño en memoria
// antes de llegar a las validaciones de más abajo (mismo motivo que
// /api/feedback).
//
// El techo NO lo pone esta app: una función serverless de Vercel rechaza el
// payload alrededor de los 4,5 MB, así que un tope mayor acá solo lograría
// que la subida fallara en producción con un error de plataforma en vez de
// con un mensaje entendible. Por eso el cliente sube UNA foto por request y
// la reduce antes de enviarla (ver FotosRegistro.tsx).
const MAX_BODY = 4 * 1024 * 1024 + 256 * 1024; // foto + margen de multipart

// El body del DELETE es solo { grupo, path }: unos pocos cientos de bytes.
// Necesita su propio tope porque el guard del POST no lo cubre — cada handler
// que lee el body tiene que frenar antes de bufferizarlo.
const MAX_BODY_DELETE = 8 * 1024;

// MIME permitido → extensión real en Storage, resuelta desde el MIME ya
// verificado por contenido (no desde el nombre del archivo del usuario). Map
// y no objeto literal: un Content-Type declarado como "constructor" o
// "toString" resolvería a una propiedad heredada de Object.prototype (truthy)
// en un objeto plano y se colaría por la whitelist.
const MIME_PERMITIDOS = new Map<string, string>([
  ["image/png", "png"],
  ["image/jpeg", "jpg"],
  ["image/webp", "webp"],
]);

type RegistroFotos = {
  id: string;
  operador_id: string;
  fotos_tablero: string[];
  fotos_entrada: string[];
  fotos_salida: string[];
};

function esGrupoValido(v: unknown): v is Grupo {
  return typeof v === "string" && GRUPOS_VALIDOS.includes(v as Grupo);
}

function fotosDe(registro: RegistroFotos, grupo: Grupo): string[] {
  if (grupo === "tablero") return registro.fotos_tablero;
  if (grupo === "entrada") return registro.fotos_entrada;
  return registro.fotos_salida;
}

// Misma regla de propiedad que updateParte/registrarSalida (server actions
// del módulo): el operador dueño del registro, o un supervisor/admin.
function esPropietarioOSupervisor(
  session: Pick<UserSession, "id" | "rol">,
  operador_id: string,
): boolean {
  return (
    operador_id === session.id ||
    session.rol === "ADMINISTRADOR" ||
    session.rol === "SUPERVISOR"
  );
}

async function cargarRegistro(id: string): Promise<RegistroFotos | null> {
  return prisma.mantParteDiario.findFirst({
    where: { id, deleted_at: null },
    select: {
      id: true,
      operador_id: true,
      fotos_tablero: true,
      fotos_entrada: true,
      fotos_salida: true,
    },
  });
}

// `push` sobre un array escalar de Postgres es atómico en la fila: dos subidas
// concurrentes al mismo grupo no se pisan (a diferencia de un read-modify-write
// leído en la app y vuelto a escribir completo).
async function pushFotos(
  id: string,
  grupo: Grupo,
  paths: string[],
): Promise<void> {
  if (grupo === "tablero") {
    await prisma.mantParteDiario.update({
      where: { id },
      data: { fotos_tablero: { push: paths } },
    });
    return;
  }
  if (grupo === "entrada") {
    await prisma.mantParteDiario.update({
      where: { id },
      data: { fotos_entrada: { push: paths } },
    });
    return;
  }
  await prisma.mantParteDiario.update({
    where: { id },
    data: { fotos_salida: { push: paths } },
  });
}

// El borrado sí es un set completo (no hay `pull` atómico simple para un path
// exacto vía Prisma). Ventana de carrera aceptada: es un borrado manual de una
// sola foto por un solo usuario, no una subida concurrente.
async function setFotos(
  id: string,
  grupo: Grupo,
  paths: string[],
): Promise<void> {
  if (grupo === "tablero") {
    await prisma.mantParteDiario.update({
      where: { id },
      data: { fotos_tablero: paths },
    });
    return;
  }
  if (grupo === "entrada") {
    await prisma.mantParteDiario.update({
      where: { id },
      data: { fotos_entrada: paths },
    });
    return;
  }
  await prisma.mantParteDiario.update({
    where: { id },
    data: { fotos_salida: paths },
  });
}

function invalidarCache(id: string): void {
  revalidateTag(MANT_PARTES_TAG);
  revalidatePath(`/mantencion/ordenes-trabajo/${id}`);
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json(
      { error: "Debes iniciar sesión para subir fotos." },
      { status: 401 },
    );
  if (!canAccessModule(session, "MANTENCION"))
    return NextResponse.json(
      { error: "No tienes acceso a este módulo." },
      { status: 403 },
    );

  const { id } = await params;
  const registro = await cargarRegistro(id);
  if (!registro)
    return NextResponse.json(
      { error: "El registro no existe." },
      { status: 404 },
    );
  if (!esPropietarioOSupervisor(session, registro.operador_id))
    return NextResponse.json(
      { error: "Solo puedes subir fotos a tus propios registros." },
      { status: 403 },
    );

  const largoDeclarado = Number(req.headers.get("content-length"));
  if (Number.isFinite(largoDeclarado) && largoDeclarado > MAX_BODY)
    return NextResponse.json(
      { error: "La foto pesa demasiado. Intenta con una imagen más liviana." },
      { status: 413 },
    );

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const grupo = (formData.get("grupo") as string | null)?.trim();
  if (!esGrupoValido(grupo))
    return NextResponse.json(
      { error: "Grupo de fotos inválido." },
      { status: 400 },
    );

  const archivos = formData
    .getAll("fotos")
    .filter((v): v is File => typeof v !== "string" && v.size > 0);
  if (archivos.length === 0)
    return NextResponse.json(
      { error: "No se recibió ninguna foto." },
      { status: 400 },
    );

  const existentes = fotosDe(registro, grupo);
  if (existentes.length + archivos.length > MAX_FOTOS_POR_GRUPO)
    return NextResponse.json(
      {
        error: `Puedes tener hasta ${MAX_FOTOS_POR_GRUPO} fotos en este grupo (ya tienes ${existentes.length}).`,
      },
      { status: 400 },
    );

  // Todo se valida ANTES de subir nada a Storage: un rechazo no debe dejar
  // archivos huérfanos en el bucket.
  const preparados: { buffer: Buffer; mime: string; ext: string }[] = [];
  for (const archivo of archivos) {
    if (archivo.size > MAX_SIZE_ARCHIVO)
      return NextResponse.json(
        { error: "Cada foto debe pesar menos de 4 MB." },
        { status: 413 },
      );
    const ext = MIME_PERMITIDOS.get(archivo.type);
    if (!ext)
      return NextResponse.json(
        { error: "Solo se permiten imágenes JPG, PNG o WEBP." },
        { status: 400 },
      );
    const buffer = Buffer.from(await archivo.arrayBuffer());
    // El MIME del navegador es declarativo: se verifica el contenido real.
    if (!fileContentMatchesMime(archivo.type, buffer))
      return NextResponse.json(
        {
          error:
            "Uno de los archivos no es una imagen válida. Adjunta fotos en JPG, PNG o WEBP.",
        },
        { status: 400 },
      );
    preparados.push({ buffer, mime: archivo.type, ext });
  }

  const subidos: string[] = [];
  try {
    for (const preparado of preparados) {
      const path = `registros/${id}/${grupo}/${randomUUID()}.${preparado.ext}`;
      await uploadFile(path, preparado.buffer, preparado.mime);
      subidos.push(path);
    }
    await pushFotos(id, grupo, subidos);
  } catch (e) {
    console.error("[registro-fotos] Error al guardar fotos:", e);
    for (const path of subidos) {
      try {
        await deleteFile(path);
      } catch {
        // Peor caso: un archivo huérfano en un bucket privado. No bloquea nada.
      }
    }
    return NextResponse.json(
      { error: "No se pudieron guardar las fotos. Intenta nuevamente." },
      { status: 500 },
    );
  }

  invalidarCache(id);
  return NextResponse.json({ ok: true, paths: subidos });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session)
    return NextResponse.json(
      { error: "Debes iniciar sesión para borrar fotos." },
      { status: 401 },
    );
  if (!canAccessModule(session, "MANTENCION"))
    return NextResponse.json(
      { error: "No tienes acceso a este módulo." },
      { status: 403 },
    );

  const { id } = await params;
  const registro = await cargarRegistro(id);
  if (!registro)
    return NextResponse.json(
      { error: "El registro no existe." },
      { status: 404 },
    );
  if (!esPropietarioOSupervisor(session, registro.operador_id))
    return NextResponse.json(
      { error: "Solo puedes borrar fotos de tus propios registros." },
      { status: 403 },
    );

  const largoDeclarado = Number(req.headers.get("content-length"));
  if (Number.isFinite(largoDeclarado) && largoDeclarado > MAX_BODY_DELETE)
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 413 });

  let body: { grupo?: unknown; path?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const { grupo, path } = body;
  if (!esGrupoValido(grupo) || typeof path !== "string" || !path)
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });

  // El prefijo obligatorio evita que se pueda borrar un archivo de otro
  // registro o de otro módulo pasando una ruta arbitraria en el body.
  const prefijo = `registros/${id}/${grupo}/`;
  if (!path.startsWith(prefijo))
    return NextResponse.json(
      { error: "Ruta de archivo inválida." },
      { status: 400 },
    );

  const actuales = fotosDe(registro, grupo);
  if (!actuales.includes(path))
    return NextResponse.json(
      { error: "La foto no existe en este registro." },
      { status: 404 },
    );

  const restantes = actuales.filter((p) => p !== path);
  try {
    await setFotos(id, grupo, restantes);
  } catch (e) {
    console.error("[registro-fotos] Error al actualizar el registro:", e);
    return NextResponse.json(
      { error: "No se pudo borrar la foto. Intenta nuevamente." },
      { status: 500 },
    );
  }

  try {
    await deleteFile(path);
  } catch (e) {
    // La BD ya quedó consistente: un archivo huérfano en Storage no rompe
    // nada, una referencia rota en la BD sí. No se revierte por esto.
    console.error(
      "[registro-fotos] No se pudo borrar el archivo de Storage:",
      e,
    );
  }

  invalidarCache(id);
  return NextResponse.json({ ok: true });
}
