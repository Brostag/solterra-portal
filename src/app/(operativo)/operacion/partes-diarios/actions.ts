"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";
import { revalidateTag, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  MANT_PARTES_TAG,
  OPERACION_DASHBOARD_TAG,
} from "@/lib/terreno/queries";
import type { UserSession } from "@/types";

const ESTADOS = ["Pendiente", "Aprobado", "Rechazado"];

type ActionResult = { error: string };

type ParteData = {
  equipo_id: string;
  operador_id: string;
  fecha: Date;
  horometro_inicio: number | null;
  horometro_fin: number | null;
  km_inicio: number | null;
  km_fin: number | null;
  combustible_litros: number | null;
  aceite_litros: number | null;
  descripcion_trabajo: string | null;
  observaciones: string | null;
  estado: string;
};

function str(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}

// Crear/editar: cualquier usuario con acceso a Operación (el operador llena su parte).
function puedeRegistrar(session: Pick<UserSession, "rol" | "area">): boolean {
  return canAccessModule(session, "OPERACION");
}

// Aprobar/rechazar: supervisión (ADMIN/SUPERVISOR con Operación).
function puedeRevisar(session: Pick<UserSession, "rol" | "area">): boolean {
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

function numOpcional(
  raw: string,
  label: string,
): { value: number | null } | ActionResult {
  if (!raw) return { value: null };
  const n = Number(raw);
  if (Number.isNaN(n) || n < 0) return { error: `${label} no es válido.` };
  return { value: n };
}

function parseParteData(formData: FormData): { data: ParteData } | ActionResult {
  const equipo_id = str(formData.get("equipo_id"));
  const operador_id = str(formData.get("operador_id"));
  const fechaRaw = str(formData.get("fecha"));
  const estado = str(formData.get("estado")) || "Pendiente";

  if (!equipo_id) return { error: "Debes seleccionar un equipo." };
  if (!operador_id) return { error: "Debes seleccionar un operador." };
  if (!ESTADOS.includes(estado)) return { error: "Estado inválido." };
  if (!fechaRaw) return { error: "La fecha es obligatoria." };

  const fecha = new Date(fechaRaw);
  if (Number.isNaN(fecha.getTime())) return { error: "La fecha no es válida." };

  const campos: [string, string][] = [
    ["horometro_inicio", "El horómetro inicial"],
    ["horometro_fin", "El horómetro final"],
    ["km_inicio", "El KM inicial"],
    ["km_fin", "El KM final"],
    ["combustible_litros", "El combustible"],
    ["aceite_litros", "El aceite"],
  ];
  const nums: Record<string, number | null> = {};
  for (const [key, label] of campos) {
    const r = numOpcional(str(formData.get(key)), label);
    if ("error" in r) return r;
    nums[key] = r.value;
  }

  if (
    nums.horometro_inicio != null &&
    nums.horometro_fin != null &&
    nums.horometro_fin < nums.horometro_inicio
  ) {
    return { error: "El horómetro final no puede ser menor al inicial." };
  }

  return {
    data: {
      equipo_id,
      operador_id,
      fecha,
      horometro_inicio: nums.horometro_inicio,
      horometro_fin: nums.horometro_fin,
      km_inicio: nums.km_inicio,
      km_fin: nums.km_fin,
      combustible_litros: nums.combustible_litros,
      aceite_litros: nums.aceite_litros,
      descripcion_trabajo: str(formData.get("descripcion_trabajo")) || null,
      observaciones: str(formData.get("observaciones")) || null,
      estado,
    },
  };
}

export async function createParte(
  formData: FormData,
): Promise<ActionResult | void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!puedeRegistrar(session)) {
    return { error: "No tienes permisos para crear partes diarios." };
  }

  const parsed = parseParteData(formData);
  if ("error" in parsed) return parsed;

  let nuevo: { id: string };
  try {
    nuevo = await prisma.mantParteDiario.create({
      data: parsed.data,
      select: { id: true },
    });
  } catch (e: unknown) {
    if (esCodigo(e, "P2003")) {
      return { error: "El equipo o el operador seleccionado no existe." };
    }
    return { error: "No se pudo guardar el parte. Intenta nuevamente." };
  }

  revalidateTag(MANT_PARTES_TAG);
  revalidateTag(OPERACION_DASHBOARD_TAG);
  revalidatePath("/operacion/partes-diarios");
  revalidatePath("/operacion");

  redirect(`/operacion/partes-diarios/${nuevo.id}`);
}

export async function updateParte(
  id: string,
  formData: FormData,
): Promise<ActionResult | void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!puedeRegistrar(session)) {
    return { error: "No tienes permisos para editar partes diarios." };
  }

  const parsed = parseParteData(formData);
  if ("error" in parsed) return parsed;

  try {
    await prisma.mantParteDiario.update({ where: { id }, data: parsed.data });
  } catch (e: unknown) {
    if (esCodigo(e, "P2025")) return { error: "El parte no existe." };
    if (esCodigo(e, "P2003")) {
      return { error: "El equipo o el operador seleccionado no existe." };
    }
    return { error: "No se pudo actualizar el parte. Intenta nuevamente." };
  }

  revalidateTag(MANT_PARTES_TAG);
  revalidateTag(OPERACION_DASHBOARD_TAG);
  revalidatePath("/operacion/partes-diarios");
  revalidatePath(`/operacion/partes-diarios/${id}`);
  revalidatePath("/operacion");

  redirect(`/operacion/partes-diarios/${id}`);
}

async function cambiarEstado(
  id: string,
  estado: "Aprobado" | "Rechazado",
): Promise<ActionResult | void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!puedeRevisar(session)) {
    return { error: "No tienes permisos para revisar partes diarios." };
  }

  try {
    await prisma.mantParteDiario.update({ where: { id }, data: { estado } });
  } catch (e: unknown) {
    if (esCodigo(e, "P2025")) return { error: "El parte no existe." };
    return { error: "No se pudo actualizar el estado. Intenta nuevamente." };
  }

  revalidateTag(MANT_PARTES_TAG);
  revalidatePath("/operacion/partes-diarios");
  revalidatePath(`/operacion/partes-diarios/${id}`);
}

export async function aprobarParte(id: string): Promise<ActionResult | void> {
  return cambiarEstado(id, "Aprobado");
}

export async function rechazarParte(id: string): Promise<ActionResult | void> {
  return cambiarEstado(id, "Rechazado");
}
