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
  return canAccessModule(session, "MANTENCION");
}

function puedeRevisar(session: Pick<UserSession, "rol" | "area">): boolean {
  return (
    canAccessModule(session, "MANTENCION") &&
    (session.rol === "ADMINISTRADOR" || session.rol === "SUPERVISOR")
  );
}

// Permiso de borrado: más restrictivo que puedeRegistrar (que también deja al
// operador dueño editar/crear) a propósito — eliminar es destructivo e
// irreversible desde la UI, así que solo ADMINISTRADOR o SUPERVISOR pueden.
function puedeEliminarParte(session: Pick<UserSession, "rol" | "area">): boolean {
  return (
    canAccessModule(session, "MANTENCION") &&
    (session.rol === "ADMINISTRADOR" || session.rol === "SUPERVISOR")
  );
}

// Regla de propiedad compartida por updateParte y registrarSalida: solo el
// operador dueño del registro o un supervisor/admin puede modificarlo.
function esPropietarioOSupervisor(
  session: Pick<UserSession, "id" | "rol">,
  operador_id: string,
): boolean {
  return (
    operador_id === session.id ||
    session.rol === "ADMINISTRADOR" ||
    session.rol === "SUPERVISOR"
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

// Devuelve el id del registro creado en vez de redirigir desde el servidor:
// el formulario necesita ese id para subir las fotos pendientes del ingreso
// (POST /api/operacion/registro/{id}/fotos) antes de navegar al detalle. Con
// redirect() acá la promesa del action nunca resuelve en el cliente (Next 15),
// así que no había forma de saber a qué registro colgarlas. La navegación al
// detalle la hace ahora el cliente.
export async function createParte(
  input: RegistroInput,
): Promise<ActionResult | { id: string }> {
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
  revalidatePath("/mantencion/ordenes-trabajo");
  revalidatePath("/operacion");

  return { id: nuevo.id };
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

  // Propiedad: solo el operador del registro o un supervisor/admin puede editarlo.
  const existente = await prisma.mantParteDiario.findFirst({
    where: { id, deleted_at: null },
    select: { operador_id: true },
  });
  if (!existente) return { error: "El registro no existe." };
  if (!esPropietarioOSupervisor(session, existente.operador_id)) {
    return { error: "Solo puedes editar tus propios registros." };
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
  revalidatePath("/mantencion/ordenes-trabajo");
  revalidatePath(`/mantencion/ordenes-trabajo/${id}`);
  revalidatePath("/operacion");

  redirect(`/mantencion/ordenes-trabajo/${id}`);
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
  revalidatePath("/mantencion/ordenes-trabajo");
  revalidatePath(`/mantencion/ordenes-trabajo/${id}`);
}

export async function aprobarParte(id: string): Promise<ActionResult | void> {
  return cambiarEstado(id, "Aprobado");
}

export async function rechazarParte(id: string): Promise<ActionResult | void> {
  return cambiarEstado(id, "Rechazado");
}

// ── Salida del equipo (paso aparte del ingreso) ────────────────────────────
// Decisión de producto: el ingreso y la salida del equipo se registran en dos
// pasos separados en el tiempo (el equipo puede quedar días en terreno entre
// uno y otro). Por eso `registrarSalida` no reemplaza `updateParte`: solo
// completa los campos de salida sin tocar los de ingreso.

export type SalidaInput = {
  fecha_salida: string; // YYYY-MM-DD
  nombre_receptor: string;
  rut_receptor: string;
  horometro_fin: string;
  km_fin: string;
  observaciones_salida: string;
  componentes: ComponentesData;
};

export async function registrarSalida(
  id: string,
  input: SalidaInput,
): Promise<ActionResult | void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!puedeRegistrar(session)) {
    return { error: "No tienes permisos para registrar la salida." };
  }

  // Se necesita `fecha` (ingreso) para validar la fecha de salida y
  // `componentes` para hacer el merge de abajo, así que no basta con la
  // propiedad: se carga el registro completo de una sola vez.
  const existente = await prisma.mantParteDiario.findFirst({
    where: { id, deleted_at: null },
    select: { operador_id: true, fecha: true, componentes: true },
  });
  if (!existente) return { error: "El registro no existe." };
  if (!esPropietarioOSupervisor(session, existente.operador_id)) {
    return { error: "Solo puedes registrar la salida de tus propios registros." };
  }

  const fSalida = fecha(input.fecha_salida);
  if (!fSalida) return { error: "La fecha de salida es obligatoria y válida." };
  if (fSalida.getTime() < existente.fecha.getTime()) {
    return { error: "La fecha de salida no puede ser anterior a la de ingreso." };
  }

  // Merge de componentes, no reemplazo: la salida solo completa `salida` y
  // `obs_s` de cada ítem, preservando `ingreso`/`obs_i` que ya se llenaron al
  // registrar el ingreso del equipo. Guardar `limpiarComponentes(input...)` a
  // secas borraría lo capturado al ingreso.
  const previos = (existente.componentes as ComponentesData | null) ?? {};
  const entrantes = limpiarComponentes(input.componentes ?? {});
  const componentes: ComponentesData = {};
  for (const key of REGISTRO_COMPONENTE_KEYS) {
    const previo = previos[key];
    const nuevo = entrantes[key];
    if (!previo && !nuevo) continue;
    componentes[key] = {
      ingreso: previo?.ingreso ?? null,
      obs_i: previo?.obs_i ?? null,
      salida: nuevo?.salida ?? null,
      obs_s: nuevo?.obs_s ?? null,
    };
  }

  try {
    await prisma.mantParteDiario.update({
      where: { id },
      data: {
        fecha_salida: fSalida,
        nombre_receptor: input.nombre_receptor?.trim() || null,
        rut_receptor: input.rut_receptor?.trim() || null,
        // horometro_fin / km_fin: lecturas del equipo al momento de la
        // salida (distintas de `horometro`/`odometro`, que son las de ingreso).
        horometro_fin: num(input.horometro_fin),
        km_fin: num(input.km_fin),
        // descripcion_trabajo es una columna heredada del modelo antiguo de
        // "parte diario", hoy sin uso en la UI de Registro de Ingreso/Salida.
        // Se reutiliza aquí como "Observaciones de salida" para no exigir una
        // migración nueva solo por un campo de texto libre.
        descripcion_trabajo: input.observaciones_salida?.trim() || null,
        componentes,
      },
    });
  } catch (e: unknown) {
    if (esCodigo(e, "P2025")) return { error: "El registro no existe." };
    return { error: "No se pudo guardar la salida. Intenta nuevamente." };
  }

  revalidateTag(MANT_PARTES_TAG);
  revalidateTag(OPERACION_DASHBOARD_TAG);
  revalidatePath("/mantencion/ordenes-trabajo");
  revalidatePath(`/mantencion/ordenes-trabajo/${id}`);
  revalidatePath("/operacion");

  redirect(`/mantencion/ordenes-trabajo/${id}`);
}

// Borrado lógico, consistente con el resto del módulo: nunca un delete
// físico, todas las queries de mant_partes_diarios ya filtran por
// deleted_at: null. Se llama desde el listado, así que en éxito no redirige
// (a diferencia de las otras actions de este archivo): la página ya está
// donde debe estar, revalidatePath refresca los datos in place.
export async function deleteParte(id: string): Promise<ActionResult | void> {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!puedeEliminarParte(session)) {
    return { error: "No tienes permisos para eliminar órdenes de trabajo." };
  }

  try {
    await prisma.mantParteDiario.update({
      where: { id },
      data: { deleted_at: new Date() },
    });
  } catch (e: unknown) {
    if (esCodigo(e, "P2025")) return { error: "La orden de trabajo no existe." };
    return { error: "No se pudo eliminar la orden de trabajo. Intenta nuevamente." };
  }

  revalidateTag(MANT_PARTES_TAG);
  revalidateTag(OPERACION_DASHBOARD_TAG);
  revalidatePath("/mantencion/ordenes-trabajo");
  revalidatePath("/operacion");
}
