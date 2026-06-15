"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";
import { revalidateTag, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { MANT_CERTIFICADOS_TAG } from "@/lib/terreno/queries";
import type { UserSession } from "@/types";

const TIPOS = [
  "Revisión Técnica",
  "Seguro Obligatorio (SOAP)",
  "Permiso de Circulación",
  "Inspección de Grúa",
  "Certificado de Operador",
  "Certificación de Equipo",
  "Licencia Municipal",
  "Otro",
];

type ActionResult = { error: string };

type CertificadoData = {
  equipo_id: string;
  tipo: string;
  numero: string | null;
  fecha_emision: Date | null;
  fecha_vencimiento: Date;
  empresa_emisora: string | null;
  observaciones: string | null;
};

function str(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}

// Permiso: ADMINISTRADOR o SUPERVISOR con acceso a Mantención.
function puedeGestionarCertificados(
  session: Pick<UserSession, "rol" | "area">,
): boolean {
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

function parseCertificadoData(
  formData: FormData,
): { data: CertificadoData } | ActionResult {
  const equipo_id = str(formData.get("equipo_id"));
  const tipo = str(formData.get("tipo"));
  const fechaVencRaw = str(formData.get("fecha_vencimiento"));
  const fechaEmisRaw = str(formData.get("fecha_emision"));

  if (!equipo_id) return { error: "Debes seleccionar un equipo." };
  if (!TIPOS.includes(tipo)) return { error: "Tipo de certificado inválido." };
  if (!fechaVencRaw) return { error: "La fecha de vencimiento es obligatoria." };

  const fecha_vencimiento = new Date(fechaVencRaw);
  if (Number.isNaN(fecha_vencimiento.getTime())) {
    return { error: "La fecha de vencimiento no es válida." };
  }

  let fecha_emision: Date | null = null;
  if (fechaEmisRaw) {
    fecha_emision = new Date(fechaEmisRaw);
    if (Number.isNaN(fecha_emision.getTime())) {
      return { error: "La fecha de emisión no es válida." };
    }
    if (fecha_emision > fecha_vencimiento) {
      return { error: "La emisión no puede ser posterior al vencimiento." };
    }
  }

  return {
    data: {
      equipo_id,
      tipo,
      numero: str(formData.get("numero")) || null,
      fecha_emision,
      fecha_vencimiento,
      empresa_emisora: str(formData.get("empresa_emisora")) || null,
      observaciones: str(formData.get("observaciones")) || null,
    },
  };
}

export async function createCertificado(
  formData: FormData,
): Promise<ActionResult | void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!puedeGestionarCertificados(session)) {
    return { error: "No tienes permisos para crear certificados." };
  }

  const parsed = parseCertificadoData(formData);
  if ("error" in parsed) return parsed;

  let nuevo: { id: string };
  try {
    nuevo = await prisma.mantCertificado.create({
      data: parsed.data,
      select: { id: true },
    });
  } catch (e: unknown) {
    if (esCodigo(e, "P2003")) {
      return { error: "El equipo seleccionado no existe." };
    }
    return { error: "No se pudo crear el certificado. Intenta nuevamente." };
  }

  revalidateTag(MANT_CERTIFICADOS_TAG);
  revalidatePath("/mantencion/certificados");

  redirect(`/mantencion/certificados/${nuevo.id}`);
}

export async function updateCertificado(
  id: string,
  formData: FormData,
): Promise<ActionResult | void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!puedeGestionarCertificados(session)) {
    return { error: "No tienes permisos para editar certificados." };
  }

  const parsed = parseCertificadoData(formData);
  if ("error" in parsed) return parsed;

  try {
    await prisma.mantCertificado.update({ where: { id }, data: parsed.data });
  } catch (e: unknown) {
    if (esCodigo(e, "P2025")) return { error: "El certificado no existe." };
    if (esCodigo(e, "P2003")) {
      return { error: "El equipo seleccionado no existe." };
    }
    return { error: "No se pudo actualizar el certificado. Intenta nuevamente." };
  }

  revalidateTag(MANT_CERTIFICADOS_TAG);
  revalidatePath("/mantencion/certificados");
  revalidatePath(`/mantencion/certificados/${id}`);

  redirect(`/mantencion/certificados/${id}`);
}

export async function deleteCertificado(
  id: string,
): Promise<ActionResult | void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!puedeGestionarCertificados(session)) {
    return { error: "No tienes permisos para eliminar certificados." };
  }

  try {
    await prisma.mantCertificado.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  } catch (e: unknown) {
    if (esCodigo(e, "P2025")) return { error: "El certificado no existe." };
    return { error: "No se pudo eliminar el certificado. Intenta nuevamente." };
  }

  revalidateTag(MANT_CERTIFICADOS_TAG);
  revalidatePath("/mantencion/certificados");

  redirect("/mantencion/certificados");
}
