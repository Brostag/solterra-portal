"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";
import { revalidateTag, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { MANT_PARTES_TAG, OPERACION_DASHBOARD_TAG } from "@/lib/terreno/queries";
import {
  REGISTRO_COMPONENTE_KEYS,
  type ComponentesData,
  type ValorComponente,
} from "@/lib/terreno/registro-componentes";
import type { UserSession } from "@/types";

const ESTADOS = ["Pendiente", "Aprobado", "Rechazado"];
const VALORES: ValorComponente[] = ["SI", "NO", "NA"];

type ActionResult = { error: string };

export type RegistroInput = {
  equipo_id: string;
  operador_id: string;
  fecha: string; // YYYY-MM-DD
  fecha_salida: string; // YYYY-MM-DD o ""
  estado: string;
  area_uso: string;
  centro_costo: string;
  tipo_mantencion: string;
  combustible_fraccion: string;
  nombre_responsable: string;
  rut_responsable: string;
  nombre_receptor: string;
  rut_receptor: string;
  horometro: string;
  odometro: string;
  observaciones: string;
  componentes: ComponentesData;
};

function puedeRegistrar(session: Pick<UserSession, "rol" | "area">): boolean {
  return canAccessModule(session, "OPERACION");
}

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

function num(raw: string): number | null {
  const t = raw?.trim();
  if (!t) return null;
  const n = Number(t);
  return Number.isNaN(n) || n < 0 ? null : n;
}

function fecha(raw: string): Date | null {
  if (!raw) return null;
  const d = new Date(raw);
  return Number.isNaN(d.getTime()) ? null : d;
}

// Normaliza los componentes a valores válidos (SI/NO/NA o null).
function limpiarComponentes(input: ComponentesData): ComponentesData {
  const out: ComponentesData = {};
  for (const key of REGISTRO_COMPONENTE_KEYS) {
    const c = input?.[key];
    if (!c) continue;
    const norm = (v: ValorComponente | null | undefined) =>
      v && VALORES.includes(v) ? v : null;
    out[key] = {
      ingreso: norm(c.ingreso),
      salida: norm(c.salida),
      obs_i: c.obs_i?.trim() || null,
      obs_s: c.obs_s?.trim() || null,
    };
  }
  return out;
}

function parseRegistro(input: RegistroInput): { data: object } | ActionResult {
  if (!input.equipo_id) return { error: "Debes seleccionar un equipo." };
  if (!input.operador_id) return { error: "Debes seleccionar un responsable." };
  const estado = input.estado || "Pendiente";
  if (!ESTADOS.includes(estado)) return { error: "Estado inválido." };
  const fIngreso = fecha(input.fecha);
  if (!fIngreso) return { error: "La fecha de ingreso es obligatoria y válida." };

  return {
    data: {
      equipo_id: input.equipo_id,
      operador_id: input.operador_id,
      fecha: fIngreso,
      fecha_salida: fecha(input.fecha_salida),
      estado,
      area_uso: input.area_uso?.trim() || null,
      centro_costo: input.centro_costo?.trim() || null,
      tipo_mantencion: input.tipo_mantencion?.trim() || null,
      combustible_fraccion: input.combustible_fraccion?.trim() || null,
      nombre_responsable: input.nombre_responsable?.trim() || null,
      rut_responsable: input.rut_responsable?.trim() || null,
      nombre_receptor: input.nombre_receptor?.trim() || null,
      rut_receptor: input.rut_receptor?.trim() || null,
      horometro: num(input.horometro),
      odometro: num(input.odometro),
      observaciones: input.observaciones?.trim() || null,
      componentes: limpiarComponentes(input.componentes ?? {}),
    },
  };
}

export async function createParte(
  input: RegistroInput,
): Promise<ActionResult | void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!puedeRegistrar(session)) {
    return { error: "No tienes permisos para crear registros." };
  }

  const parsed = parseRegistro(input);
  if ("error" in parsed) return parsed;

  let nuevo: { id: string };
  try {
    nuevo = await prisma.mantParteDiario.create({
      data: parsed.data as never,
      select: { id: true },
    });
  } catch (e: unknown) {
    if (esCodigo(e, "P2003")) {
      return { error: "El equipo o el responsable seleccionado no existe." };
    }
    return { error: "No se pudo guardar el registro. Intenta nuevamente." };
  }

  revalidateTag(MANT_PARTES_TAG);
  revalidateTag(OPERACION_DASHBOARD_TAG);
  revalidatePath("/operacion/partes-diarios");
  revalidatePath("/operacion");

  redirect(`/operacion/partes-diarios/${nuevo.id}`);
}

export async function updateParte(
  id: string,
  input: RegistroInput,
): Promise<ActionResult | void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!puedeRegistrar(session)) {
    return { error: "No tienes permisos para editar registros." };
  }

  const parsed = parseRegistro(input);
  if ("error" in parsed) return parsed;

  try {
    await prisma.mantParteDiario.update({
      where: { id },
      data: parsed.data as never,
    });
  } catch (e: unknown) {
    if (esCodigo(e, "P2025")) return { error: "El registro no existe." };
    if (esCodigo(e, "P2003")) {
      return { error: "El equipo o el responsable seleccionado no existe." };
    }
    return { error: "No se pudo actualizar el registro. Intenta nuevamente." };
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
    return { error: "No tienes permisos para revisar registros." };
  }

  try {
    await prisma.mantParteDiario.update({ where: { id }, data: { estado } });
  } catch (e: unknown) {
    if (esCodigo(e, "P2025")) return { error: "El registro no existe." };
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
