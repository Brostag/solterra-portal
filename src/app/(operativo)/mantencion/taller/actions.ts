"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";
import { revalidateTag, revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { logAudit } from "@/lib/audit";
import {
  MANT_CHECKLIST_MANT_TAG,
  MANT_MANTENCIONES_TAG,
  MANT_PLANES_TAG,
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
        deleted_at: null,
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

  // No se puede eliminar una OT que ya tiene un certificado de mantención
  // vigente colgando: perdería la trazabilidad del documento que la acredita
  // (ver prefillCertificadoDesdeOT). Un certificado ya anulado no bloquea.
  const certificadoVigente = await prisma.mantCertificadoMantencion.findFirst({
    where: { mantencion_id: id, deleted_at: null, anulado_at: null },
    select: { id: true },
  });
  if (certificadoVigente) {
    return {
      error:
        "Esta orden de trabajo tiene un certificado de mantención vigente. Anúlalo antes de eliminar la orden.",
    };
  }

  // Tampoco se puede eliminar una OT que nació de un plan de mantención: el
  // plan quedaría en estado "Con OT" apuntando a una orden inexistente, con su
  // CTA "Ver OT de taller" en 404 y sin poder anularse ni regenerar la orden
  // (ambos botones exigen estado "Planificado"). Misma guarda que el eslabón
  // check list → OT y que OT → certificado: la cadena se desarma desde el
  // extremo, no por el medio.
  const planOrigen = await prisma.mantPlanMantencion.findFirst({
    where: { orden_trabajo_id: id, deleted_at: null },
    select: { id: true },
  });
  if (planOrigen) {
    return {
      error:
        "Esta orden nació de un plan de mantención. Elimina o cierra el plan antes de eliminar la orden.",
    };
  }

  const actual = await prisma.mantMantencion.findFirst({
    where: { id, deleted_at: null },
    select: { tipo: true, fecha_inicio: true, equipo: { select: { codigo: true } } },
  });
  if (!actual) return { error: "La mantención no existe." };

  // updateMany con precondición deleted_at: null, igual que el resto de los
  // borrados del módulo: evita la doble eliminación por doble clic.
  let res: { count: number };
  try {
    res = await prisma.mantMantencion.updateMany({
      where: { id, deleted_at: null },
      data: { deleted_at: new Date() },
    });
  } catch {
    return { error: "No se pudo eliminar la mantención. Intenta nuevamente." };
  }
  if (res.count !== 1) return { error: "La mantención ya fue eliminada." };

  await logAudit(
    session.id,
    "mantencion_eliminada",
    "mantencion",
    `${actual.equipo.codigo} · ${actual.tipo} · ${actual.fecha_inicio.toISOString().slice(0, 10)}`,
  );

  revalidateTag(MANT_MANTENCIONES_TAG);
  // El otro lado de la cadena: las vistas de planes (listado y detalle) están
  // cacheadas 60 s y muestran el vínculo con la orden. La guarda de arriba deja
  // pasar el borrado solo si ningún plan vigente apunta a esta OT, pero
  // invalidar el tag es barato y evita que un plan quede mostrando datos de una
  // orden que ya no existe.
  revalidateTag(MANT_PLANES_TAG);
  revalidatePath("/mantencion/taller");

  redirect("/mantencion/taller");
}
