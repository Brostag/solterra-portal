"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";
import { revalidateTag, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  MANT_CHECKLIST_MANT_TAG,
  MANT_MANTENCIONES_TAG,
} from "@/lib/terreno/queries";
import type { UserSession } from "@/types";

// "Según Fabricante" proviene de generar una OT desde un Plan A. Debe estar en
// la whitelist para que editar esa OT no rebote con "Tipo inválido".
const TIPOS = ["Según Fabricante", "Preventiva", "Correctiva", "Emergencia"];
const ESTADOS = ["Programada", "En Proceso", "Completada"];

type ActionResult = { error: string };

type MantencionData = {
  equipo_id: string;
  responsable_id: string;
  tipo: string;
  estado: string;
  fecha_inicio: Date;
  fecha_fin: Date | null;
  horometro_realizada: number | null;
  descripcion: string;
  trabajos_realizados: string | null;
  repuestos_usados: string | null;
  costo: number | null;
  proxima_mantencion_horometro: number | null;
  proxima_mantencion_fecha: Date | null;
  observaciones: string | null;
};

function str(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}

// Permiso: ADMINISTRADOR o SUPERVISOR con acceso a Mantención. USUARIO no gestiona.
function puedeGestionarMantencion(
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

// num opcional >= 0; devuelve null si vacío, o el mensaje de error.
function numOpcional(
  raw: string,
  label: string,
): { value: number | null } | ActionResult {
  if (!raw) return { value: null };
  const n = Number(raw);
  if (Number.isNaN(n) || n < 0) return { error: `${label} no es válido.` };
  return { value: n };
}

// Valida y normaliza el formulario. Compartido por crear y editar.
function parseMantencionData(
  formData: FormData,
): { data: MantencionData } | ActionResult {
  const equipo_id = str(formData.get("equipo_id"));
  const responsable_id = str(formData.get("responsable_id"));
  const tipo = str(formData.get("tipo"));
  // La OT se emite ya terminada: se documenta el trabajo hecho, no una tarea
  // en curso. El estado sigue siendo editable si de verdad queda pendiente.
  const estado = str(formData.get("estado")) || "Completada";
  const descripcion = str(formData.get("descripcion"));
  const fechaInicioRaw = str(formData.get("fecha_inicio"));
  const fechaFinRaw = str(formData.get("fecha_fin"));
  const proxFechaRaw = str(formData.get("proxima_mantencion_fecha"));

  if (!equipo_id) return { error: "Debes seleccionar un equipo." };
  if (!responsable_id) return { error: "Debes seleccionar un responsable." };
  if (!TIPOS.includes(tipo)) return { error: "Tipo de mantención inválido." };
  if (!ESTADOS.includes(estado)) return { error: "Estado inválido." };
  if (!descripcion) return { error: "La descripción es obligatoria." };
  if (!fechaInicioRaw) return { error: "La fecha de inicio es obligatoria." };

  const fecha_inicio = new Date(fechaInicioRaw);
  if (Number.isNaN(fecha_inicio.getTime())) {
    return { error: "La fecha de inicio no es válida." };
  }

  let fecha_fin: Date | null = null;
  if (fechaFinRaw) {
    fecha_fin = new Date(fechaFinRaw);
    if (Number.isNaN(fecha_fin.getTime())) {
      return { error: "La fecha de término no es válida." };
    }
    if (fecha_fin < fecha_inicio) {
      return { error: "La fecha de término no puede ser anterior al inicio." };
    }
  }

  let proxima_mantencion_fecha: Date | null = null;
  if (proxFechaRaw) {
    proxima_mantencion_fecha = new Date(proxFechaRaw);
    if (Number.isNaN(proxima_mantencion_fecha.getTime())) {
      return { error: "La fecha de próxima mantención no es válida." };
    }
  }

  const horo = numOpcional(str(formData.get("horometro_realizada")), "El horómetro");
  if ("error" in horo) return horo;
  const costo = numOpcional(str(formData.get("costo")), "El costo");
  if ("error" in costo) return costo;
  const proxHoro = numOpcional(
    str(formData.get("proxima_mantencion_horometro")),
    "El horómetro de próxima mantención",
  );
  if ("error" in proxHoro) return proxHoro;

  return {
    data: {
      equipo_id,
      responsable_id,
      tipo,
      estado,
      fecha_inicio,
      fecha_fin,
      horometro_realizada: horo.value,
      descripcion,
      trabajos_realizados: str(formData.get("trabajos_realizados")) || null,
      repuestos_usados: str(formData.get("repuestos_usados")) || null,
      costo: costo.value,
      proxima_mantencion_horometro: proxHoro.value,
      proxima_mantencion_fecha,
      observaciones: str(formData.get("observaciones")) || null,
    },
  };
}

export async function createMantencion(
  formData: FormData,
): Promise<ActionResult | void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!puedeGestionarMantencion(session)) {
    return { error: "No tienes permisos para crear mantenciones." };
  }

  const parsed = parseMantencionData(formData);
  if ("error" in parsed) return parsed;

  // Traza del Check List de origen: por el formulario viaja solo el id y acá se
  // vuelve a leer. El vínculo se guarda únicamente si el check list existe, no
  // está anulado (mismo criterio que prefillOTDesdeChecklist) y es del MISMO
  // equipo que la orden: si el usuario cambió el equipo en el formulario, ese
  // check list dejó de ser su origen. Si algo no calza, la OT se crea sin
  // vínculo — la trazabilidad nunca bloquea el guardado. Solo aplica al crear:
  // editar una OT no puede reasignar de qué documento nació.
  const checklistIdRaw = str(formData.get("checklist_id"));
  let checklist_id: string | null = null;
  if (checklistIdRaw) {
    const origen = await prisma.mantChecklistMantencion.findFirst({
      where: {
        id: checklistIdRaw,
        anulado_at: null,
        equipo_id: parsed.data.equipo_id,
      },
      select: { id: true },
    });
    checklist_id = origen?.id ?? null;
  }

  let nueva: { id: string };
  try {
    nueva = await prisma.mantMantencion.create({
      data: { ...parsed.data, checklist_id },
      select: { id: true },
    });
  } catch (e: unknown) {
    // P2003 = FK inválida (equipo o responsable inexistente).
    if (esCodigo(e, "P2003")) {
      return { error: "El equipo o responsable seleccionado no existe." };
    }
    return { error: "No se pudo crear la mantención. Intenta nuevamente." };
  }

  revalidateTag(MANT_MANTENCIONES_TAG);
  // Los dos lados de la relación: si quedó vinculada, el check list de origen
  // pasó a tener una orden de trabajo colgando.
  if (checklist_id) revalidateTag(MANT_CHECKLIST_MANT_TAG);
  revalidatePath("/mantencion/taller");

  redirect(`/mantencion/taller/${nueva.id}`);
}

export async function updateMantencion(
  id: string,
  formData: FormData,
): Promise<ActionResult | void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!puedeGestionarMantencion(session)) {
    return { error: "No tienes permisos para editar mantenciones." };
  }

  const parsed = parseMantencionData(formData);
  if ("error" in parsed) return parsed;

  try {
    await prisma.mantMantencion.update({ where: { id }, data: parsed.data });
  } catch (e: unknown) {
    if (esCodigo(e, "P2025")) return { error: "La mantención no existe." };
    if (esCodigo(e, "P2003")) {
      return { error: "El equipo o responsable seleccionado no existe." };
    }
    return { error: "No se pudo actualizar la mantención. Intenta nuevamente." };
  }

  revalidateTag(MANT_MANTENCIONES_TAG);
  revalidatePath("/mantencion/taller");
  revalidatePath(`/mantencion/taller/${id}`);

  redirect(`/mantencion/taller/${id}`);
}

export async function deleteMantencion(
  id: string,
): Promise<ActionResult | void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!puedeGestionarMantencion(session)) {
    return { error: "No tienes permisos para eliminar mantenciones." };
  }

  try {
    // Soft delete, consistente con el resto del módulo.
    await prisma.mantMantencion.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  } catch (e: unknown) {
    if (esCodigo(e, "P2025")) return { error: "La mantención no existe." };
    return { error: "No se pudo eliminar la mantención. Intenta nuevamente." };
  }

  revalidateTag(MANT_MANTENCIONES_TAG);
  revalidatePath("/mantencion/taller");

  redirect("/mantencion/taller");
}
