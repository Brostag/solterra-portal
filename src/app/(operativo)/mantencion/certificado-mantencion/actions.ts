"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canAccessModule, requireModule } from "@/lib/modules";
import { revalidateTag, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAudit } from "@/lib/audit";
import {
  MANT_CERT_MANT_TAG,
  MANT_MANTENCIONES_TAG,
  nextCorrelativoCertMant,
} from "@/lib/terreno/queries";
import type { UserSession } from "@/types";

// El certificado acredita una mantención TERMINADA: una orden "Programada" o
// "En Proceso" no puede ser su origen. Mismo criterio que
// prefillCertificadoDesdeOT (src/lib/terreno/cadena.ts), donde la constante es
// privada del módulo.
const OT_COMPLETADA = "Completada";

type ActionResult = { error: string };

export type CertMantInput = {
  equipo_id: string;
  responsable_id: string;
  gerente_id: string;
  fecha: string; // YYYY-MM-DD
  ciudad: string;
  horometro: string;
  odometro: string;
  proxima_mantencion: string;
  /**
   * Orden de trabajo de la que salió este certificado (?desde=<id>). Solo el
   * id: el servidor vuelve a leer la orden antes de persistir el vínculo.
   */
  mantencion_id?: string | null;
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

export async function createCertificadoMantencion(
  input: CertMantInput,
): Promise<ActionResult | void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!puedeGestionar(session)) {
    return { error: "No tienes permisos para crear certificados de mantención." };
  }

  if (!input.equipo_id) return { error: "Debes seleccionar un equipo." };
  if (!input.responsable_id) return { error: "Debes seleccionar el encargado." };
  const fecha = input.fecha ? new Date(input.fecha) : null;
  if (!fecha || Number.isNaN(fecha.getTime())) {
    return { error: "La fecha es obligatoria y válida." };
  }

  // findFirst con deleted_at: null: un equipo eliminado ya no se ofrece en el
  // selector, así que tampoco puede ser el equipo de un documento nuevo.
  const equipo = await prisma.mantEquipo.findFirst({
    where: { id: input.equipo_id, deleted_at: null },
    select: { tipo: true, marca: true, patente: true },
  });
  if (!equipo) return { error: "El equipo seleccionado no existe." };

  // Traza del origen: el vínculo se guarda únicamente si la orden existe, no
  // fue eliminada, está "Completada" y es del MISMO equipo que el certificado
  // (si el usuario cambió el equipo en el formulario, esa orden dejó de ser su
  // origen). Si algo no calza, el certificado se emite igual pero sin vínculo:
  // la trazabilidad nunca bloquea el guardado.
  const otId = input.mantencion_id?.trim() || null;
  let mantencion_id: string | null = null;
  if (otId) {
    const origen = await prisma.mantMantencion.findFirst({
      where: {
        id: otId,
        deleted_at: null,
        estado: OT_COMPLETADA,
        equipo_id: input.equipo_id,
      },
      select: { id: true },
    });
    mantencion_id = origen?.id ?? null;
  }

  const anio = fecha.getUTCFullYear();
  let nuevo: { id: string } | null = null;
  // Reintenta si el correlativo fue tomado por una request concurrente
  // (índice único (correlativo, anio) en DB → P2002).
  for (let intento = 0; intento < 4 && !nuevo; intento++) {
    const correlativo = await nextCorrelativoCertMant(anio);
    try {
      nuevo = await prisma.mantCertificadoMantencion.create({
        data: {
          correlativo,
          anio,
          equipo_id: input.equipo_id,
          mantencion_id,
          responsable_id: input.responsable_id,
          gerente_id: input.gerente_id || null,
          fecha,
          ciudad: input.ciudad?.trim() || "Calama",
          tipo_equipo_snapshot: equipo.tipo,
          marca_snapshot: equipo.marca,
          patente_snapshot: equipo.patente,
          horometro_snapshot: num(input.horometro),
          odometro_snapshot: num(input.odometro),
          proxima_mantencion: num(input.proxima_mantencion),
        },
        select: { id: true },
      });
    } catch (e: unknown) {
      if (esCodigo(e, "P2002")) continue; // correlativo duplicado por carrera → reintentar
      if (esCodigo(e, "P2003")) {
        return { error: "El equipo o las personas seleccionadas no existen." };
      }
      return { error: "No se pudo crear el certificado. Intenta nuevamente." };
    }
  }
  if (!nuevo) {
    return { error: "No se pudo asignar un número de documento. Intenta nuevamente." };
  }

  revalidateTag(MANT_CERT_MANT_TAG);
  // Los dos lados de la relación: si quedó vinculado, la orden de trabajo de
  // origen pasó a tener un certificado colgando.
  if (mantencion_id) revalidateTag(MANT_MANTENCIONES_TAG);
  revalidatePath("/mantencion/certificado-mantencion");

  redirect(`/mantencion/certificado-mantencion/${nuevo.id}`);
}

export async function anularCertificadoMantencion(
  id: string,
  motivo: string,
): Promise<ActionResult | void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!puedeGestionar(session)) {
    return { error: "No tienes permisos para anular certificados." };
  }
  const motivoLimpio = motivo.trim();
  if (!motivoLimpio) return { error: "Debes indicar el motivo de anulación." };

  // updateMany con precondición deleted_at: null, mismo patrón que los
  // borrados: una server action es alcanzable por id, y un update sin ese
  // filtro anularía un certificado ya eliminado.
  let res: { count: number };
  try {
    res = await prisma.mantCertificadoMantencion.updateMany({
      where: { id, deleted_at: null },
      data: {
        anulado_at: new Date(),
        motivo_anulacion: motivoLimpio,
        anulado_por_id: session.id,
      },
    });
  } catch {
    return { error: "No se pudo anular el certificado. Intenta nuevamente." };
  }
  if (res.count !== 1) {
    return { error: "El certificado no existe o fue eliminado." };
  }

  revalidateTag(MANT_CERT_MANT_TAG);
  revalidatePath("/mantencion/certificado-mantencion");
  revalidatePath(`/mantencion/certificado-mantencion/${id}`);

  redirect(`/mantencion/certificado-mantencion/${id}`);
}

// Borrado lógico, restringido a ADMINISTRADOR: el certificado es el cierre de
// la cadena (lleva firmas y se entrega al cliente), más restrictivo que crear
// o anular. Se llama desde el listado, sin redirect: revalidatePath refresca
// los datos in place.
export async function deleteCertificadoMantencion(
  id: string,
): Promise<ActionResult | void> {
  const session = await getSession();
  if (!session) redirect("/login");
  requireModule(session, "MANTENCION");
  if (session.rol !== "ADMINISTRADOR") {
    return { error: "Solo un administrador puede eliminar certificados de mantención." };
  }

  const actual = await prisma.mantCertificadoMantencion.findFirst({
    where: { id, deleted_at: null },
    select: {
      correlativo: true,
      anio: true,
      anulado_at: true,
      equipo: { select: { codigo: true } },
    },
  });
  if (!actual) return { error: "El certificado no existe." };

  // updateMany con precondición deleted_at: null: evita doble eliminación por
  // doble clic o dos usuarios a la vez.
  let res: { count: number };
  try {
    res = await prisma.mantCertificadoMantencion.updateMany({
      where: { id, deleted_at: null },
      data: { deleted_at: new Date() },
    });
  } catch {
    return { error: "No se pudo eliminar el certificado. Intenta nuevamente." };
  }
  if (res.count !== 1) return { error: "El certificado ya fue eliminado." };

  await logAudit(
    session.id,
    "certificado_mantencion_eliminado",
    "mantencion",
    `N° ${actual.correlativo}/${actual.anio} | equipo ${actual.equipo?.codigo ?? "—"} | ${
      actual.anulado_at ? "anulado" : "vigente"
    }`,
  );

  revalidateTag(MANT_CERT_MANT_TAG);
  revalidatePath("/mantencion/certificado-mantencion");
}
