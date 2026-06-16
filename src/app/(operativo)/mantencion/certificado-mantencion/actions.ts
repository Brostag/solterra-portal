"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";
import { revalidateTag, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  MANT_CERT_MANT_TAG,
  nextCorrelativoCertMant,
} from "@/lib/terreno/queries";
import type { UserSession } from "@/types";

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

  const equipo = await prisma.mantEquipo.findUnique({
    where: { id: input.equipo_id },
    select: { tipo: true, marca: true, patente: true },
  });
  if (!equipo) return { error: "El equipo seleccionado no existe." };

  let nuevo: { id: string };
  try {
    const correlativo = await nextCorrelativoCertMant();
    nuevo = await prisma.mantCertificadoMantencion.create({
      data: {
        correlativo,
        equipo_id: input.equipo_id,
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
    if (esCodigo(e, "P2003")) {
      return { error: "El equipo o las personas seleccionadas no existen." };
    }
    return { error: "No se pudo crear el certificado. Intenta nuevamente." };
  }

  revalidateTag(MANT_CERT_MANT_TAG);
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

  try {
    await prisma.mantCertificadoMantencion.update({
      where: { id },
      data: {
        anulado_at: new Date(),
        motivo_anulacion: motivoLimpio,
        anulado_por_id: session.id,
      },
    });
  } catch (e: unknown) {
    if (esCodigo(e, "P2025")) return { error: "El certificado no existe." };
    return { error: "No se pudo anular el certificado. Intenta nuevamente." };
  }

  revalidateTag(MANT_CERT_MANT_TAG);
  revalidatePath("/mantencion/certificado-mantencion");
  revalidatePath(`/mantencion/certificado-mantencion/${id}`);

  redirect(`/mantencion/certificado-mantencion/${id}`);
}
