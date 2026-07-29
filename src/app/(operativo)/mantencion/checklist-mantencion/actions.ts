"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";
import { revalidateTag, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  MANT_CHECKLIST_MANT_TAG,
  MANT_PARTES_TAG,
  nextCorrelativoChecklistMant,
} from "@/lib/terreno/queries";
import {
  SECCION_A,
  SECCION_B,
  TIPO_MANTENCION_OPCIONES,
  type ChecklistMantData,
  type ValorItem,
} from "@/lib/terreno/checklist-mantencion-items";

const VALORES_ITEM: ValorItem[] = ["SI", "NO", "NA"];

// Un registro "Rechazado" es un documento que el supervisor desestimó: no sirve
// como origen del check list. Mismo criterio que prefillChecklistDesdeRegistro
// (src/lib/terreno/cadena.ts), donde la constante es privada del módulo.
const REGISTRO_RECHAZADO = "Rechazado";
const CODIGOS_A = new Set(SECCION_A.map((i) => i.codigo));
const CODIGOS_B = new Set(SECCION_B.map((i) => i.codigo));

// Construye un items limpio SOLO con códigos conocidos y valores válidos.
// Evita persistir JSON arbitrario enviado por el cliente.
function limpiarItems(input: ChecklistMantData | undefined): ChecklistMantData {
  const limpiarSeccion = (
    raw: Record<string, { valor?: ValorItem | null; obs?: string | null }> | undefined,
    codigos: Set<string>,
  ) => {
    const out: ChecklistMantData["seccion_a"] = {};
    for (const [codigo, item] of Object.entries(raw ?? {})) {
      if (!codigos.has(codigo)) continue;
      const valor = item?.valor && VALORES_ITEM.includes(item.valor) ? item.valor : null;
      out[codigo] = { valor, obs: item?.obs?.trim() || null };
    }
    return out;
  };
  const correctivas = Array.isArray(input?.seccion_c)
    ? input.seccion_c
        .filter((s): s is string => typeof s === "string")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 50)
    : [];
  return {
    seccion_a: limpiarSeccion(input?.seccion_a, CODIGOS_A),
    seccion_b: limpiarSeccion(input?.seccion_b, CODIGOS_B),
    seccion_c: correctivas,
  };
}
import type { UserSession } from "@/types";

type ActionResult = { error: string };

// Datos de cabecera del check list: los mismos campos que se pueden crear y
// los únicos que se pueden corregir después. Los 83 ítems y la sección C no
// forman parte de la cabecera.
export type ChecklistMantCabeceraInput = {
  equipo_id: string;
  responsable_id: string;
  fecha: string; // YYYY-MM-DD
  tipo_mantencion: string;
  km: string;
  horometro: string;
  proxima_mantencion: string;
  observaciones_generales: string;
};

export type ChecklistMantInput = ChecklistMantCabeceraInput & {
  items: ChecklistMantData;
  /**
   * Registro de ingreso/salida del que salió este check list (?desde=<id>).
   * Solo el id: el servidor vuelve a leer el registro antes de persistir el
   * vínculo. Null cuando el documento nace suelto.
   */
  registro_id?: string | null;
};

// Validación compartida por creación y corrección de cabecera. Devuelve la
// fecha ya parseada o el error listo para mostrar.
function validarCabecera(
  input: ChecklistMantCabeceraInput,
): { fecha: Date } | ActionResult {
  if (!input.equipo_id) return { error: "Debes seleccionar un equipo." };
  if (!input.responsable_id) return { error: "Debes seleccionar un encargado." };
  if (!TIPO_MANTENCION_OPCIONES.includes(input.tipo_mantencion)) {
    return { error: "Tipo de mantención inválido." };
  }
  const fecha = input.fecha ? new Date(input.fecha) : null;
  if (!fecha || Number.isNaN(fecha.getTime())) {
    return { error: "La fecha es obligatoria y válida." };
  }
  return { fecha };
}

function puedeGestionar(session: Pick<UserSession, "rol" | "area">): boolean {
  return (
    canAccessModule(session, "MANTENCION") &&
    (session.rol === "ADMINISTRADOR" || session.rol === "SUPERVISOR")
  );
}

function esCodigo(e: unknown, code: string): boolean {
  return (
    !!e &&
    typeof e === "object" &&
    "code" in e &&
    (e as { code?: string }).code === code
  );
}

function num(raw: string): number | null {
  const t = raw?.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isNaN(n) || n < 0 ? null : n;
}

export async function createChecklistMantencion(
  input: ChecklistMantInput,
): Promise<ActionResult | void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!puedeGestionar(session)) {
    return { error: "No tienes permisos para crear check list de mantenimiento." };
  }

  const validado = validarCabecera(input);
  if ("error" in validado) return validado;
  const { fecha } = validado;

  // Snapshot de la patente desde el equipo (los documentos históricos no cambian).
  const equipo = await prisma.mantEquipo.findUnique({
    where: { id: input.equipo_id },
    select: { patente: true },
  });
  if (!equipo) return { error: "El equipo seleccionado no existe." };

  // Traza del origen: el cliente manda solo el id y acá se vuelve a leer. El
  // vínculo se guarda únicamente si el registro existe, no fue borrado, no está
  // "Rechazado" y es del MISMO equipo que se está guardando: si el usuario
  // cambió el equipo en el formulario, ese registro dejó de ser su origen.
  // Cuando algo no calza se guarda sin vínculo — un problema de trazabilidad
  // nunca hace perder el documento del usuario.
  const registroId = input.registro_id?.trim() || null;
  let registro_id: string | null = null;
  if (registroId) {
    const origen = await prisma.mantParteDiario.findFirst({
      where: {
        id: registroId,
        deleted_at: null,
        estado: { not: REGISTRO_RECHAZADO },
        equipo_id: input.equipo_id,
      },
      select: { id: true },
    });
    registro_id = origen?.id ?? null;
  }

  const anio = fecha.getUTCFullYear();
  let nuevo: { id: string } | null = null;
  // Reintenta si el correlativo fue tomado por una request concurrente
  // (índice único (correlativo, anio) en DB → P2002).
  for (let intento = 0; intento < 4 && !nuevo; intento++) {
    const correlativo = await nextCorrelativoChecklistMant(anio);
    try {
      nuevo = await prisma.mantChecklistMantencion.create({
        data: {
          correlativo,
          anio,
          equipo_id: input.equipo_id,
          registro_id,
          responsable_id: input.responsable_id,
          fecha,
          tipo_mantencion: input.tipo_mantencion,
          empresa: "SOLTERRA",
          patente_snapshot: equipo.patente,
          km_snapshot: num(input.km),
          horometro_snapshot: num(input.horometro),
          proxima_mantencion: num(input.proxima_mantencion),
          items: limpiarItems(input.items) as never,
          observaciones_generales: input.observaciones_generales?.trim() || null,
        },
        select: { id: true },
      });
    } catch (e: unknown) {
      if (esCodigo(e, "P2002")) continue; // correlativo duplicado por carrera → reintentar
      if (esCodigo(e, "P2003")) {
        return { error: "El equipo o el encargado seleccionado no existe." };
      }
      return { error: "No se pudo guardar el check list. Intenta nuevamente." };
    }
  }
  if (!nuevo) {
    return { error: "No se pudo asignar un número de documento. Intenta nuevamente." };
  }

  revalidateTag(MANT_CHECKLIST_MANT_TAG);
  // Los dos lados de la relación: si quedó vinculado, el registro de Operación
  // pasó a tener un check list colgando y sus vistas cacheadas deben refrescar.
  if (registro_id) revalidateTag(MANT_PARTES_TAG);
  revalidatePath("/mantencion/checklist-mantencion");

  redirect(`/mantencion/checklist-mantencion/${nuevo.id}`);
}

// Corrección de la cabecera de un check list ya guardado. Es la red de
// seguridad del autorrellenado: un dato mal copiado se arregla aquí, sin
// anular el documento (lo que quemaría el correlativo del año) ni volver a
// marcar los 83 ítems.
//
// Lo que NO toca, a propósito:
//  - correlativo y anio: el número del documento nunca se renumera, aunque la
//    fecha corregida caiga en otro año.
//  - items (secciones A, B y C): son el registro de la revisión física.
//  - empresa y los campos de anulación.
export async function updateChecklistMantencionCabecera(
  id: string,
  input: ChecklistMantCabeceraInput,
): Promise<ActionResult | void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!puedeGestionar(session)) {
    return { error: "No tienes permisos para editar check list de mantenimiento." };
  }
  if (!id) return { error: "El check list no existe." };

  const validado = validarCabecera(input);
  if ("error" in validado) return validado;
  const { fecha } = validado;

  const actual = await prisma.mantChecklistMantencion.findUnique({
    where: { id },
    select: { equipo_id: true, anulado_at: true },
  });
  if (!actual) return { error: "El check list no existe." };
  if (actual.anulado_at) {
    return { error: "Un check list anulado no se puede editar." };
  }

  const equipo = await prisma.mantEquipo.findUnique({
    where: { id: input.equipo_id },
    select: { patente: true },
  });
  if (!equipo) return { error: "El equipo seleccionado no existe." };

  // La patente es un snapshot histórico: solo se vuelve a tomar si cambió el
  // equipo del documento, igual que en la creación.
  const cambioEquipo = input.equipo_id !== actual.equipo_id;

  try {
    await prisma.mantChecklistMantencion.update({
      where: { id },
      data: {
        equipo_id: input.equipo_id,
        responsable_id: input.responsable_id,
        fecha,
        tipo_mantencion: input.tipo_mantencion,
        km_snapshot: num(input.km),
        horometro_snapshot: num(input.horometro),
        proxima_mantencion: num(input.proxima_mantencion),
        observaciones_generales: input.observaciones_generales?.trim() || null,
        ...(cambioEquipo ? { patente_snapshot: equipo.patente } : {}),
      },
    });
  } catch (e: unknown) {
    if (esCodigo(e, "P2025")) return { error: "El check list no existe." };
    if (esCodigo(e, "P2003")) {
      return { error: "El equipo o el encargado seleccionado no existe." };
    }
    return { error: "No se pudieron guardar los cambios. Intenta nuevamente." };
  }

  revalidateTag(MANT_CHECKLIST_MANT_TAG);
  revalidatePath("/mantencion/checklist-mantencion");
  revalidatePath(`/mantencion/checklist-mantencion/${id}`);

  redirect(`/mantencion/checklist-mantencion/${id}`);
}

export async function anularChecklistMantencion(
  id: string,
  motivo: string,
): Promise<ActionResult | void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!puedeGestionar(session)) {
    return { error: "No tienes permisos para anular check list de mantenimiento." };
  }
  const motivoLimpio = motivo.trim();
  if (!motivoLimpio) return { error: "Debes indicar el motivo de anulación." };

  try {
    await prisma.mantChecklistMantencion.update({
      where: { id },
      data: {
        anulado_at: new Date(),
        motivo_anulacion: motivoLimpio,
        anulado_por_id: session.id,
      },
    });
  } catch (e: unknown) {
    if (esCodigo(e, "P2025")) return { error: "El check list no existe." };
    return { error: "No se pudo anular el check list. Intenta nuevamente." };
  }

  revalidateTag(MANT_CHECKLIST_MANT_TAG);
  revalidatePath("/mantencion/checklist-mantencion");
  revalidatePath(`/mantencion/checklist-mantencion/${id}`);

  redirect(`/mantencion/checklist-mantencion/${id}`);
}
