"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";
import { revalidateTag, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAudit } from "@/lib/audit";
import {
  MANT_CHECKLISTS_TAG,
  OPERACION_DASHBOARD_TAG,
} from "@/lib/terreno/queries";
import {
  CHECKLIST_ITEM_KEYS,
  calcEstadoGeneral,
  type ChecklistItemKey,
} from "@/lib/terreno/checklist-items";
import type { UserSession } from "@/types";

type ActionResult = { error: string };

export type ChecklistInput = {
  equipo_id: string;
  operador_id: string;
  items: Record<ChecklistItemKey, boolean>;
  observaciones: string;
};

// Crear: cualquier usuario con acceso a Operación (el operador llena su checklist).
function puedeCrear(session: Pick<UserSession, "rol" | "area">): boolean {
  return canAccessModule(session, "OPERACION");
}

// Anular: control de supervisión (ADMIN/SUPERVISOR con Operación).
function puedeAnular(session: Pick<UserSession, "rol" | "area">): boolean {
  return (
    canAccessModule(session, "OPERACION") &&
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

export async function createChecklist(
  input: ChecklistInput,
): Promise<ActionResult | void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!puedeCrear(session)) {
    return { error: "No tienes permisos para crear checklists." };
  }

  if (!input.equipo_id) return { error: "Debes seleccionar un equipo." };
  if (!input.operador_id) return { error: "Debes seleccionar un operador." };

  // Normalizar los 15 ítems a booleanos (default true si falta) y calcular estado.
  const items = {} as Record<ChecklistItemKey, boolean>;
  for (const k of CHECKLIST_ITEM_KEYS) {
    items[k] = input.items?.[k] !== false;
  }
  const estado_general = calcEstadoGeneral(items);

  let nuevo: { id: string };
  try {
    nuevo = await prisma.mantChecklist.create({
      data: {
        equipo_id: input.equipo_id,
        operador_id: input.operador_id,
        estado_general,
        observaciones: input.observaciones?.trim() || null,
        ...items,
      },
      select: { id: true },
    });
  } catch (e: unknown) {
    if (esCodigo(e, "P2003")) {
      return { error: "El equipo o el operador seleccionado no existe." };
    }
    return { error: "No se pudo guardar el checklist. Intenta nuevamente." };
  }

  revalidateTag(MANT_CHECKLISTS_TAG);
  revalidateTag(OPERACION_DASHBOARD_TAG);
  revalidatePath("/operacion/checklists");
  revalidatePath("/operacion");

  redirect(`/operacion/checklists/${nuevo.id}`);
}

export async function anularChecklist(
  id: string,
  motivo: string,
): Promise<ActionResult | void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!puedeAnular(session)) {
    return { error: "No tienes permisos para anular checklists." };
  }
  const motivoLimpio = motivo.trim();
  if (!motivoLimpio) return { error: "Debes indicar el motivo de anulación." };

  // updateMany con precondición deleted_at: null, mismo patrón que el borrado:
  // una server action es alcanzable por id, y un update sin ese filtro anularía
  // un checklist ya eliminado.
  let res: { count: number };
  try {
    res = await prisma.mantChecklist.updateMany({
      where: { id, deleted_at: null },
      data: {
        anulado_at: new Date(),
        motivo_anulacion: motivoLimpio,
        anulado_por_id: session.id,
      },
    });
  } catch {
    return { error: "No se pudo anular el checklist. Intenta nuevamente." };
  }
  if (res.count !== 1) {
    return { error: "El checklist no existe o fue eliminado." };
  }

  revalidateTag(MANT_CHECKLISTS_TAG);
  revalidateTag(OPERACION_DASHBOARD_TAG);
  revalidatePath("/operacion/checklists");
  revalidatePath(`/operacion/checklists/${id}`);

  redirect(`/operacion/checklists/${id}`);
}

// Borrado lógico. Mismo permiso que anularChecklist (ADMIN/SUPERVISOR con
// acceso a Operación): eliminar es igual de destructivo que anular. Se llama
// desde el listado, sin redirect — revalidatePath refresca los datos in place.
export async function deleteChecklist(id: string): Promise<ActionResult | void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!puedeAnular(session)) {
    return { error: "No tienes permisos para eliminar checklists." };
  }

  // Lectura previa para dejar en auditoría un detalle legible (antes se
  // registraba el uuid pelado, ilegible en /auditoria). Mismo criterio que los
  // otros cinco borrados del módulo.
  const actual = await prisma.mantChecklist.findFirst({
    where: { id, deleted_at: null },
    select: {
      fecha: true,
      anulado_at: true,
      equipo: { select: { codigo: true } },
    },
  });
  if (!actual) return { error: "El checklist no existe." };

  // updateMany con precondición deleted_at: null: evita doble eliminación por
  // doble clic o dos usuarios a la vez.
  let res: { count: number };
  try {
    res = await prisma.mantChecklist.updateMany({
      where: { id, deleted_at: null },
      data: { deleted_at: new Date() },
    });
  } catch {
    return { error: "No se pudo eliminar el checklist. Intenta nuevamente." };
  }
  if (res.count !== 1) return { error: "El checklist ya fue eliminado." };

  await logAudit(
    session.id,
    "checklist_eliminado",
    "operacion",
    `${actual.equipo.codigo} · ${actual.fecha.toISOString().slice(0, 10)} | ${
      actual.anulado_at ? "anulado" : "vigente"
    }`,
  );

  revalidateTag(MANT_CHECKLISTS_TAG);
  revalidateTag(OPERACION_DASHBOARD_TAG);
  revalidatePath("/operacion/checklists");
  revalidatePath("/operacion");
}
