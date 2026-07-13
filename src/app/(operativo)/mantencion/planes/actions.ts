"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canAccessModule, requireModule } from "@/lib/modules";
import { revalidateTag, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  MANT_PLANES_TAG,
  MANT_MANTENCIONES_TAG,
  nextCorrelativoPlanMant,
} from "@/lib/terreno/queries";
import type { UserSession } from "@/types";

type ActionResult = { error: string };

// Etiquetas del negocio. El plan es referencial (A/B/C); al generar la orden de
// trabajo se mapea al tipo de la MantMantencion del Taller.
const PLAN_A_TIPO_OT = "Según Fabricante";
const PLAN_B_TIPO_OT = "Preventiva";
const PLAN_C_TIPO_OT = "Correctiva";

function tipoOTdesdePlan(plan: string): string {
  if (plan === "A") return PLAN_A_TIPO_OT;
  if (plan === "B") return PLAN_B_TIPO_OT;
  return PLAN_C_TIPO_OT; // "C"
}

const createSchema = z.object({
  plan: z.enum(["A", "B", "C"]),
  descripcion: z.string().trim().min(1, "La descripción es obligatoria.").max(2000),
  equipo_id: z.string().uuid("Debes seleccionar un equipo válido."),
  registro_id: z.string().uuid().nullish(),
  fecha_planificada: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Fecha planificada inválida.")
    .nullish(),
  horometro_referencia: z.number().min(0).nullish(),
  observaciones: z.string().trim().max(2000).nullish(),
});

export type CreatePlanInput = z.input<typeof createSchema>;

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

// "YYYY-MM-DD" → Date en medianoche UTC, para @db.Date (evita off-by-one).
function fechaDateUTC(ymd: string): Date {
  return new Date(`${ymd}T00:00:00.000Z`);
}

export async function createPlan(
  input: CreatePlanInput,
): Promise<ActionResult | void> {
  const session = await getSession();
  if (!session) redirect("/login");
  requireModule(session, "MANTENCION");
  if (!puedeGestionar(session)) {
    return { error: "No tienes permisos para crear planes de mantención." };
  }

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }
  const data = parsed.data;

  const fecha_planificada = data.fecha_planificada
    ? fechaDateUTC(data.fecha_planificada)
    : null;

  // El correlativo se numera por año calendario del registro (created_at).
  const anio = new Date().getUTCFullYear();
  let nuevo: { id: string } | null = null;
  // Reintenta si el correlativo fue tomado por una request concurrente
  // (índice único (correlativo, anio) en DB → P2002).
  for (let intento = 0; intento < 4 && !nuevo; intento++) {
    const correlativo = await nextCorrelativoPlanMant(anio);
    try {
      nuevo = await prisma.mantPlanMantencion.create({
        data: {
          correlativo,
          anio,
          equipo_id: data.equipo_id,
          registro_id: data.registro_id ?? null,
          responsable_id: session.id,
          plan: data.plan,
          descripcion: data.descripcion,
          fecha_planificada,
          horometro_referencia: data.horometro_referencia ?? null,
          observaciones: data.observaciones?.trim() || null,
          estado: "Planificado",
        },
        select: { id: true },
      });
    } catch (e: unknown) {
      if (esCodigo(e, "P2002")) continue; // correlativo duplicado por carrera
      if (esCodigo(e, "P2003")) {
        return { error: "El equipo o el registro seleccionado no existe." };
      }
      return { error: "No se pudo guardar el plan. Intenta nuevamente." };
    }
  }
  if (!nuevo) {
    return { error: "No se pudo asignar un número de plan. Intenta nuevamente." };
  }

  revalidateTag(MANT_PLANES_TAG);
  revalidatePath("/mantencion/planes");

  redirect(`/mantencion/planes/${nuevo.id}`);
}

export async function generarOrdenTrabajo(
  planId: string,
): Promise<ActionResult | void> {
  const session = await getSession();
  if (!session) redirect("/login");
  requireModule(session, "MANTENCION");
  if (!puedeGestionar(session)) {
    return { error: "No tienes permisos para generar órdenes de trabajo." };
  }

  let otId: string | null = null;
  try {
    // Transacción: crea la OT copiando el plan y marca el plan "Con OT".
    // La precondición estado="Planificado" en el update evita doble OT si dos
    // usuarios hacen clic a la vez.
    otId = await prisma.$transaction(async (tx) => {
      const plan = await tx.mantPlanMantencion.findFirst({
        where: { id: planId, deleted_at: null },
        select: {
          id: true,
          equipo_id: true,
          plan: true,
          descripcion: true,
          observaciones: true,
          horometro_referencia: true,
          estado: true,
        },
      });
      if (!plan) throw new Error("PLAN_NO_EXISTE");
      if (plan.estado !== "Planificado") throw new Error("PLAN_NO_PLANIFICADO");

      const descripcionOT = plan.observaciones
        ? `${plan.descripcion}\n\nObservaciones: ${plan.observaciones}`
        : plan.descripcion;

      const ot = await tx.mantMantencion.create({
        data: {
          equipo_id: plan.equipo_id,
          responsable_id: session.id,
          tipo: tipoOTdesdePlan(plan.plan),
          estado: "Programada",
          fecha_inicio: new Date(),
          descripcion: descripcionOT,
          horometro_realizada: plan.horometro_referencia ?? null,
        },
        select: { id: true },
      });

      // updateMany con precondición: solo pasa si sigue "Planificado".
      const upd = await tx.mantPlanMantencion.updateMany({
        where: { id: planId, estado: "Planificado", deleted_at: null },
        data: { estado: "Con OT", orden_trabajo_id: ot.id },
      });
      if (upd.count !== 1) throw new Error("PLAN_NO_PLANIFICADO");

      return ot.id;
    });
  } catch (e: unknown) {
    if (e instanceof Error && e.message === "PLAN_NO_EXISTE") {
      return { error: "El plan no existe." };
    }
    if (e instanceof Error && e.message === "PLAN_NO_PLANIFICADO") {
      return {
        error: "El plan ya tiene una orden de trabajo o fue anulado.",
      };
    }
    if (esCodigo(e, "P2003")) {
      return { error: "El equipo del plan ya no existe." };
    }
    return { error: "No se pudo generar la orden de trabajo. Intenta nuevamente." };
  }

  // El plan cambió (MANT_PLANES_TAG) y nació una mantención en el Taller, que
  // también refresca el dashboard de Mantención (MANT_MANTENCIONES_TAG).
  revalidateTag(MANT_PLANES_TAG);
  revalidateTag(MANT_MANTENCIONES_TAG);
  revalidatePath("/mantencion/planes");
  revalidatePath(`/mantencion/planes/${planId}`);
  revalidatePath("/mantencion/taller");
  if (otId) revalidatePath(`/mantencion/taller/${otId}`);

  if (otId) redirect(`/mantencion/taller/${otId}`);
  return { error: "No se pudo generar la orden de trabajo. Intenta nuevamente." };
}

export async function anularPlan(
  planId: string,
): Promise<ActionResult | void> {
  const session = await getSession();
  if (!session) redirect("/login");
  requireModule(session, "MANTENCION");
  if (!puedeGestionar(session)) {
    return { error: "No tienes permisos para anular planes." };
  }

  // Solo se puede anular un plan "Planificado" (sin OT generada).
  let res: { count: number };
  try {
    res = await prisma.mantPlanMantencion.updateMany({
      where: { id: planId, estado: "Planificado", deleted_at: null },
      data: { estado: "Anulado" },
    });
  } catch {
    return { error: "No se pudo anular el plan. Intenta nuevamente." };
  }
  if (res.count !== 1) {
    return {
      error: "Solo se pueden anular planes en estado Planificado.",
    };
  }

  revalidateTag(MANT_PLANES_TAG);
  revalidatePath("/mantencion/planes");
  revalidatePath(`/mantencion/planes/${planId}`);

  redirect(`/mantencion/planes/${planId}`);
}
