"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";
import { revalidateTag, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
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

  try {
    await prisma.mantChecklist.update({
      where: { id },
      data: {
        anulado_at: new Date(),
        motivo_anulacion: motivoLimpio,
        anulado_por_id: session.id,
      },
    });
  } catch (e: unknown) {
    if (esCodigo(e, "P2025")) return { error: "El checklist no existe." };
    return { error: "No se pudo anular el checklist. Intenta nuevamente." };
  }

  revalidateTag(MANT_CHECKLISTS_TAG);
  revalidateTag(OPERACION_DASHBOARD_TAG);
  revalidatePath("/operacion/checklists");
  revalidatePath(`/operacion/checklists/${id}`);

  redirect(`/operacion/checklists/${id}`);
}
