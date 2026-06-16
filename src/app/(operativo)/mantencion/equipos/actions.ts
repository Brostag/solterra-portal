"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";
import { revalidateTag, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { MANT_EQUIPOS_TAG, OPERACION_DASHBOARD_TAG } from "@/lib/terreno/queries";
import type { UserSession } from "@/types";

const ESTADOS = ["Activo", "En Mantención", "Fuera de Servicio"];

type ActionResult = { error: string };

type EquipoData = {
  codigo: string;
  nombre: string;
  tipo: string;
  marca: string | null;
  modelo: string | null;
  numero_serie: string | null;
  patente: string | null;
  anio: number | null;
  horometro_actual: number;
  km_actual: number;
  estado: string;
};

function str(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}

// Permiso: el catálogo de equipos lo gestiona Mantención (ADMIN o SUPERVISOR
// con acceso a Mantención). Operación los usa pero no los crea.
function puedeGestionarEquipos(
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

function parseEquipoData(formData: FormData): { data: EquipoData } | ActionResult {
  const codigo = str(formData.get("codigo"));
  const nombre = str(formData.get("nombre"));
  const tipo = str(formData.get("tipo"));
  const estado = str(formData.get("estado")) || "Activo";
  const anioRaw = str(formData.get("anio"));
  const horoRaw = str(formData.get("horometro_actual"));
  const kmRaw = str(formData.get("km_actual"));

  if (!codigo) return { error: "El código es obligatorio." };
  if (!nombre) return { error: "El nombre es obligatorio." };
  if (!tipo) return { error: "El tipo es obligatorio." };
  if (!ESTADOS.includes(estado)) return { error: "Estado inválido." };

  let anio: number | null = null;
  if (anioRaw) {
    const n = Number(anioRaw);
    if (!Number.isInteger(n) || n < 1900 || n > new Date().getFullYear() + 1) {
      return { error: "El año no es válido." };
    }
    anio = n;
  }

  const horometro_actual = horoRaw ? Number(horoRaw) : 0;
  if (Number.isNaN(horometro_actual) || horometro_actual < 0) {
    return { error: "El horómetro no puede ser negativo." };
  }

  const km_actual = kmRaw ? Number(kmRaw) : 0;
  if (Number.isNaN(km_actual) || km_actual < 0) {
    return { error: "El kilometraje no puede ser negativo." };
  }

  return {
    data: {
      codigo,
      nombre,
      tipo,
      marca: str(formData.get("marca")) || null,
      modelo: str(formData.get("modelo")) || null,
      numero_serie: str(formData.get("numero_serie")) || null,
      patente: str(formData.get("patente")) || null,
      anio,
      horometro_actual,
      km_actual,
      estado,
    },
  };
}

export async function createEquipo(
  formData: FormData,
): Promise<ActionResult | void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!puedeGestionarEquipos(session)) {
    return { error: "No tienes permisos para crear equipos." };
  }

  const parsed = parseEquipoData(formData);
  if ("error" in parsed) return parsed;

  let nuevo: { id: string };
  try {
    nuevo = await prisma.mantEquipo.create({
      data: parsed.data,
      select: { id: true },
    });
  } catch (e: unknown) {
    if (esCodigo(e, "P2002")) {
      return { error: `Ya existe un equipo con el código "${parsed.data.codigo}".` };
    }
    return { error: "No se pudo crear el equipo. Intenta nuevamente." };
  }

  revalidateTag(MANT_EQUIPOS_TAG);
  revalidateTag(OPERACION_DASHBOARD_TAG);
  revalidatePath("/mantencion");
  revalidatePath("/mantencion/equipos");
  revalidatePath("/operacion");

  redirect(`/mantencion/equipos/${nuevo.id}`);
}

export async function updateEquipo(
  id: string,
  formData: FormData,
): Promise<ActionResult | void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!puedeGestionarEquipos(session)) {
    return { error: "No tienes permisos para editar equipos." };
  }

  const parsed = parseEquipoData(formData);
  if ("error" in parsed) return parsed;

  try {
    await prisma.mantEquipo.update({ where: { id }, data: parsed.data });
  } catch (e: unknown) {
    if (esCodigo(e, "P2002")) {
      return { error: `Ya existe un equipo con el código "${parsed.data.codigo}".` };
    }
    if (esCodigo(e, "P2025")) {
      return { error: "El equipo no existe." };
    }
    return { error: "No se pudo actualizar el equipo. Intenta nuevamente." };
  }

  revalidateTag(MANT_EQUIPOS_TAG);
  revalidateTag(OPERACION_DASHBOARD_TAG);
  revalidatePath("/mantencion");
  revalidatePath("/mantencion/equipos");
  revalidatePath(`/mantencion/equipos/${id}`);
  revalidatePath("/operacion");

  redirect(`/mantencion/equipos/${id}`);
}
