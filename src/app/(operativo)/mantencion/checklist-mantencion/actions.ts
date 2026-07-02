"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";
import { revalidateTag, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  MANT_CHECKLIST_MANT_TAG,
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

export type ChecklistMantInput = {
  equipo_id: string;
  responsable_id: string;
  fecha: string; // YYYY-MM-DD
  tipo_mantencion: string;
  km: string;
  horometro: string;
  proxima_mantencion: string;
  observaciones_generales: string;
  items: ChecklistMantData;
};

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

  if (!input.equipo_id) return { error: "Debes seleccionar un equipo." };
  if (!input.responsable_id) return { error: "Debes seleccionar un encargado." };
  if (!TIPO_MANTENCION_OPCIONES.includes(input.tipo_mantencion)) {
    return { error: "Tipo de mantención inválido." };
  }
  const fecha = input.fecha ? new Date(input.fecha) : null;
  if (!fecha || Number.isNaN(fecha.getTime())) {
    return { error: "La fecha es obligatoria y válida." };
  }

  // Snapshot de la patente desde el equipo (los documentos históricos no cambian).
  const equipo = await prisma.mantEquipo.findUnique({
    where: { id: input.equipo_id },
    select: { patente: true },
  });
  if (!equipo) return { error: "El equipo seleccionado no existe." };

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
  revalidatePath("/mantencion/checklist-mantencion");

  redirect(`/mantencion/checklist-mantencion/${nuevo.id}`);
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
