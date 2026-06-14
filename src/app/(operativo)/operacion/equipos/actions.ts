"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";
import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { MANT_EQUIPOS_TAG, OPERACION_DASHBOARD_TAG } from "@/lib/terreno/queries";

const ESTADOS = ["Activo", "En Mantención", "Fuera de Servicio"];

function str(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}

type ActionResult = { error: string };

export async function createEquipo(
  formData: FormData,
): Promise<ActionResult | void> {
  // Sesión segura (getUser) — nunca el fast en una action sensible.
  const session = await getSession();
  if (!session) redirect("/login");

  // Permiso server-side: ADMINISTRADOR o SUPERVISOR con acceso a Operación.
  const puedeCrear =
    canAccessModule(session, "OPERACION") &&
    (session.rol === "ADMINISTRADOR" || session.rol === "SUPERVISOR");
  if (!puedeCrear) return { error: "No tienes permisos para crear equipos." };

  const codigo = str(formData.get("codigo"));
  const nombre = str(formData.get("nombre"));
  const tipo = str(formData.get("tipo"));
  const marca = str(formData.get("marca"));
  const modelo = str(formData.get("modelo"));
  const numero_serie = str(formData.get("numero_serie"));
  const patente = str(formData.get("patente"));
  const anioRaw = str(formData.get("anio"));
  const horoRaw = str(formData.get("horometro_actual"));
  const kmRaw = str(formData.get("km_actual"));
  const estado = str(formData.get("estado")) || "Activo";

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

  let nuevo: { id: string };
  try {
    nuevo = await prisma.mantEquipo.create({
      data: {
        codigo,
        nombre,
        tipo,
        marca: marca || null,
        modelo: modelo || null,
        numero_serie: numero_serie || null,
        patente: patente || null,
        anio,
        horometro_actual,
        km_actual,
        estado,
      },
      select: { id: true },
    });
  } catch (e: unknown) {
    // P2002 = violación de unicidad (codigo @unique)
    if (
      e &&
      typeof e === "object" &&
      "code" in e &&
      (e as { code?: string }).code === "P2002"
    ) {
      return { error: `Ya existe un equipo con el código "${codigo}".` };
    }
    return { error: "No se pudo crear el equipo. Intenta nuevamente." };
  }

  revalidateTag(MANT_EQUIPOS_TAG);
  revalidateTag(OPERACION_DASHBOARD_TAG);
  revalidatePath("/operacion");
  revalidatePath("/operacion/equipos");

  redirect(`/operacion/equipos/${nuevo.id}`);
}
