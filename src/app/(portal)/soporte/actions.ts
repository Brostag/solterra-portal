"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { esSoporte } from "@/lib/soporte";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { esEstadoValido } from "./vocabulario";

// Gestión interna de la bandeja de soporte. Solo toca estado, nota interna y
// los campos de resolución: el mensaje y los adjuntos que envió el cliente son
// su reporte y nunca se editan desde acá.

type ActionResult = { error: string };

const NOTA_MAX = 5000;

function esCodigo(e: unknown, code: string): boolean {
  return (
    !!e &&
    typeof e === "object" &&
    "code" in e &&
    (e as { code?: string }).code === code
  );
}

// getSession() (no getPortalSessionFast): estas acciones leen y escriben sobre
// reportes que pueden contener datos de clientes.
async function guardSoporte(): Promise<{ id: string } | ActionResult> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!esSoporte(session)) {
    return { error: "No tienes permisos para gestionar reportes de soporte." };
  }
  return { id: session.id };
}

function revalidarReporte(id: string): void {
  revalidatePath("/soporte");
  revalidatePath(`/soporte/${id}`);
}

export async function cambiarEstadoReporte(
  id: string,
  estado: string,
): Promise<ActionResult | void> {
  const guard = await guardSoporte();
  if ("error" in guard) return guard;

  if (!id) return { error: "Falta el identificador del reporte." };
  if (!esEstadoValido(estado)) return { error: "Estado inválido." };

  const resuelto = estado === "Resuelto";

  try {
    await prisma.feedbackReport.update({
      where: { id },
      data: {
        estado,
        // Solo "Resuelto" deja constancia de quién y cuándo. Volver a cualquier
        // otro estado limpia la marca para no dejar un cierre falso.
        resuelto_at: resuelto ? new Date() : null,
        resuelto_por_id: resuelto ? guard.id : null,
      },
    });
  } catch (e: unknown) {
    if (esCodigo(e, "P2025")) return { error: "El reporte no existe." };
    return { error: "No se pudo actualizar el estado. Intenta nuevamente." };
  }

  revalidarReporte(id);
}

export async function guardarNotaInterna(
  id: string,
  nota: string,
): Promise<ActionResult | void> {
  const guard = await guardSoporte();
  if ("error" in guard) return guard;

  if (!id) return { error: "Falta el identificador del reporte." };

  const limpia = typeof nota === "string" ? nota.trim() : "";
  if (limpia.length > NOTA_MAX) {
    return { error: `La nota no puede superar los ${NOTA_MAX} caracteres.` };
  }

  try {
    await prisma.feedbackReport.update({
      where: { id },
      data: { nota_interna: limpia || null },
    });
  } catch (e: unknown) {
    if (esCodigo(e, "P2025")) return { error: "El reporte no existe." };
    return { error: "No se pudo guardar la nota. Intenta nuevamente." };
  }

  revalidarReporte(id);
}
