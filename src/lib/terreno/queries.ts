import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";
import {
  CHECKLIST_ITEM_KEYS,
  type ChecklistItemKey,
} from "@/lib/terreno/checklist-items";
import type { ComponentesData } from "@/lib/terreno/registro-componentes";
import { getSignedUrls } from "@/lib/supabase/storage";

// Tag para invalidar el dashboard de Operación cuando existan acciones de
// escritura (partes diarios / checklists / equipos). Por ahora solo lectura.
export const OPERACION_DASHBOARD_TAG = "operacion-dashboard";

// Tope de filas en los listados de terreno. Provisional hasta tener paginación
// por cursor (deuda técnica conocida: listas grandes ocultarían registros).
const MAX_LISTA_TERRENO = 200;

export type EquipoResumen = {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string;
  estado: string;
  horometro_actual: number;
  km_actual: number;
};

export type ParteResumen = {
  id: string;
  fecha: string; // ISO
  equipo: string | null;
  operador: string | null;
  estado: string;
};

export type ChecklistResumen = {
  id: string;
  fecha: string; // ISO
  equipo: string | null;
  operador: string | null;
  estado_general: string;
};

export type OperacionDashboard = {
  kpis: {
    totalEquipos: number;
    equiposActivos: number;
    equiposMantencion: number;
    partesHoy: number;
    checklistsHoy: number;
  };
  equipos: EquipoResumen[];
  partesRecientes: ParteResumen[];
  checklistsRecientes: ChecklistResumen[];
};

export const getOperacionDashboard = unstable_cache(
  async (): Promise<OperacionDashboard> => {
    const ahora = new Date();
    const inicioHoy = new Date(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
    const manana = new Date(inicioHoy);
    manana.setDate(manana.getDate() + 1);

    const [
      totalEquipos,
      equiposActivos,
      equiposMantencion,
      partesHoy,
      checklistsHoy,
      equipos,
      partesRecientes,
      checklistsRecientes,
    ] = await Promise.all([
      prisma.mantEquipo.count({ where: { deleted_at: null } }),
      prisma.mantEquipo.count({ where: { deleted_at: null, estado: "Activo" } }),
      prisma.mantEquipo.count({ where: { deleted_at: null, estado: "En Mantención" } }),
      prisma.mantParteDiario.count({
        where: { deleted_at: null, fecha: { gte: inicioHoy, lt: manana } },
      }),
      prisma.mantChecklist.count({
        where: { anulado_at: null, fecha: { gte: inicioHoy, lt: manana } },
      }),
      prisma.mantEquipo.findMany({
        where: { deleted_at: null },
        orderBy: { updated_at: "desc" },
        take: 8,
        select: {
          id: true,
          codigo: true,
          nombre: true,
          tipo: true,
          estado: true,
          horometro_actual: true,
          km_actual: true,
        },
      }),
      prisma.mantParteDiario.findMany({
        where: { deleted_at: null },
        orderBy: { fecha: "desc" },
        take: 5,
        select: {
          id: true,
          fecha: true,
          estado: true,
          equipo: { select: { codigo: true, nombre: true } },
          operador: { select: { nombre: true } },
        },
      }),
      prisma.mantChecklist.findMany({
        where: { anulado_at: null },
        orderBy: { fecha: "desc" },
        take: 5,
        select: {
          id: true,
          fecha: true,
          estado_general: true,
          equipo: { select: { codigo: true, nombre: true } },
          operador: { select: { nombre: true } },
        },
      }),
    ]);

    return {
      kpis: { totalEquipos, equiposActivos, equiposMantencion, partesHoy, checklistsHoy },
      // Decimal de Prisma -> number dentro del callback del cache (serializable).
      equipos: equipos.map((e) => ({
        id: e.id,
        codigo: e.codigo,
        nombre: e.nombre,
        tipo: e.tipo,
        estado: e.estado,
        horometro_actual: Number(e.horometro_actual),
        km_actual: Number(e.km_actual),
      })),
      partesRecientes: partesRecientes.map((p) => ({
        id: p.id,
        fecha: p.fecha.toISOString(),
        equipo: p.equipo ? `${p.equipo.codigo} · ${p.equipo.nombre}` : null,
        operador: p.operador?.nombre ?? null,
        estado: p.estado,
      })),
      checklistsRecientes: checklistsRecientes.map((c) => ({
        id: c.id,
        fecha: c.fecha.toISOString(),
        equipo: c.equipo ? `${c.equipo.codigo} · ${c.equipo.nombre}` : null,
        operador: c.operador?.nombre ?? null,
        estado_general: c.estado_general,
      })),
    };
  },
  ["operacion-dashboard"],
  { revalidate: 60, tags: [OPERACION_DASHBOARD_TAG] },
);

// ── Equipos (listado de Operación) ─────────────────────────

export const MANT_EQUIPOS_TAG = "mant-equipos";

export type EquipoLista = {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string;
  marca: string | null;
  modelo: string | null;
  patente: string | null;
  horometro_actual: number;
  km_actual: number;
  estado: string;
};

export const getEquipos = unstable_cache(
  async (): Promise<EquipoLista[]> => {
    const rows = await prisma.mantEquipo.findMany({
      where: { deleted_at: null },
      orderBy: { updated_at: "desc" },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        tipo: true,
        marca: true,
        modelo: true,
        patente: true,
        horometro_actual: true,
        km_actual: true,
        estado: true,
      },
    });
    return rows.map((e) => ({
      id: e.id,
      codigo: e.codigo,
      nombre: e.nombre,
      tipo: e.tipo,
      marca: e.marca,
      modelo: e.modelo,
      patente: e.patente,
      horometro_actual: Number(e.horometro_actual),
      km_actual: Number(e.km_actual),
      estado: e.estado,
    }));
  },
  ["mant-equipos"],
  { revalidate: 60, tags: [MANT_EQUIPOS_TAG] },
);

// ── Detalle de un equipo ───────────────────────────────────

export type EquipoDetalle = {
  id: string;
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
  soap_vencimiento: string | null;
  permiso_circ_vencimiento: string | null;
  rev_tecnica_vencimiento: string | null;
  extintor_vencimiento: string | null;
  created_at: string;
  updated_at: string;
};

export async function getEquipoDetalle(id: string): Promise<EquipoDetalle | null> {
  const e = await prisma.mantEquipo.findFirst({
    where: { id, deleted_at: null },
    select: {
      id: true,
      codigo: true,
      nombre: true,
      tipo: true,
      marca: true,
      modelo: true,
      numero_serie: true,
      patente: true,
      anio: true,
      horometro_actual: true,
      km_actual: true,
      estado: true,
      soap_vencimiento: true,
      permiso_circ_vencimiento: true,
      rev_tecnica_vencimiento: true,
      extintor_vencimiento: true,
      created_at: true,
      updated_at: true,
    },
  });
  if (!e) return null;
  return {
    id: e.id,
    codigo: e.codigo,
    nombre: e.nombre,
    tipo: e.tipo,
    marca: e.marca,
    modelo: e.modelo,
    numero_serie: e.numero_serie,
    patente: e.patente,
    anio: e.anio,
    horometro_actual: Number(e.horometro_actual),
    km_actual: Number(e.km_actual),
    estado: e.estado,
    soap_vencimiento: e.soap_vencimiento ? e.soap_vencimiento.toISOString() : null,
    permiso_circ_vencimiento: e.permiso_circ_vencimiento
      ? e.permiso_circ_vencimiento.toISOString()
      : null,
    rev_tecnica_vencimiento: e.rev_tecnica_vencimiento
      ? e.rev_tecnica_vencimiento.toISOString()
      : null,
    extintor_vencimiento: e.extintor_vencimiento
      ? e.extintor_vencimiento.toISOString()
      : null,
    created_at: e.created_at.toISOString(),
    updated_at: e.updated_at.toISOString(),
  };
}

// ── Vencimientos de documentos legales (Reporte de Fechas) ──
// Los vencimientos viven como columnas del equipo (mant_equipos), por lo que
// el cache se invalida con MANT_EQUIPOS_TAG (no tiene tag propio).

export type VencimientoDoc = {
  fecha: string | null; // ISO date
  estado: string; // Vigente | Por Vencer | Vencido | Sin dato
  dias: number | null;
};

export type EquipoVencimientos = {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string;
  patente: string | null;
  soap: VencimientoDoc;
  permiso_circ: VencimientoDoc;
  rev_tecnica: VencimientoDoc;
  extintor: VencimientoDoc;
};

// Estado de un vencimiento date-only respecto a hoy (UTC, alineado con @db.Date).
function calcVencimiento(fecha: Date | null): VencimientoDoc {
  if (!fecha) return { fecha: null, estado: "Sin dato", dias: null };
  const ahora = new Date();
  const hoyUTC = Date.UTC(
    ahora.getUTCFullYear(),
    ahora.getUTCMonth(),
    ahora.getUTCDate(),
  );
  const dias = Math.floor((fecha.getTime() - hoyUTC) / 86_400_000);
  const estado = dias < 0 ? "Vencido" : dias <= 30 ? "Por Vencer" : "Vigente";
  return { fecha: fecha.toISOString(), estado, dias };
}

export const getReporteVencimientos = unstable_cache(
  async (): Promise<EquipoVencimientos[]> => {
    const rows = await prisma.mantEquipo.findMany({
      where: { deleted_at: null },
      orderBy: { codigo: "asc" },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        tipo: true,
        patente: true,
        soap_vencimiento: true,
        permiso_circ_vencimiento: true,
        rev_tecnica_vencimiento: true,
        extintor_vencimiento: true,
      },
    });
    return rows.map((e) => ({
      id: e.id,
      codigo: e.codigo,
      nombre: e.nombre,
      tipo: e.tipo,
      patente: e.patente,
      soap: calcVencimiento(e.soap_vencimiento),
      permiso_circ: calcVencimiento(e.permiso_circ_vencimiento),
      rev_tecnica: calcVencimiento(e.rev_tecnica_vencimiento),
      extintor: calcVencimiento(e.extintor_vencimiento),
    }));
  },
  ["mant-vencimientos"],
  { revalidate: 60, tags: [MANT_EQUIPOS_TAG] },
);

// ── Responsables / operadores (Profiles para selects) ──────

export const MANT_RESPONSABLES_TAG = "mant-responsables";

export type ResponsableOption = {
  id: string;
  nombre: string;
};

export const getResponsables = unstable_cache(
  async (): Promise<ResponsableOption[]> => {
    const rows = await prisma.profile.findMany({
      where: { activo: true },
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true },
    });
    return rows.map((r) => ({ id: r.id, nombre: r.nombre }));
  },
  ["mant-responsables"],
  { revalidate: 120, tags: [MANT_RESPONSABLES_TAG] },
);

// ── Equipos para selects (código + nombre) ─────────────────

export type EquipoOption = {
  id: string;
  codigo: string;
  nombre: string;
};

export const getEquiposOptions = unstable_cache(
  async (): Promise<EquipoOption[]> => {
    const rows = await prisma.mantEquipo.findMany({
      where: { deleted_at: null },
      orderBy: { codigo: "asc" },
      select: { id: true, codigo: true, nombre: true },
    });
    return rows.map((e) => ({ id: e.id, codigo: e.codigo, nombre: e.nombre }));
  },
  ["mant-equipos-options"],
  { revalidate: 60, tags: [MANT_EQUIPOS_TAG] },
);

// ── Flota operativa para el módulo Comercial (selector cotizador/contrato) ──
// Solo equipos operativos (estado "Activo", no borrados). Al cotizar o crear un
// contrato, el usuario puede elegir un equipo real de la flota y los campos se
// llenan solos. La "conversación entre módulos" es lectura compartida +
// revalidateTag: las actions de equipos en Mantención ya invalidan
// MANT_EQUIPOS_TAG, así que este selector se refresca al tiro tras cualquier
// alta/edición/cambio de estado/borrado de equipo, sin polling ni websockets.

export type EquipoFlotaSelector = {
  id: string;
  codigo: string;
  nombre: string;
  tipo: string;
  marca: string | null;
  modelo: string | null;
  patente: string | null;
  anio: number | null;
  horometro_actual: number;
};

export const getEquiposFlotaSelector = unstable_cache(
  async (): Promise<EquipoFlotaSelector[]> => {
    const rows = await prisma.mantEquipo.findMany({
      where: { deleted_at: null, estado: "Activo" },
      orderBy: { codigo: "asc" },
      select: {
        id: true,
        codigo: true,
        nombre: true,
        tipo: true,
        marca: true,
        modelo: true,
        patente: true,
        anio: true,
        horometro_actual: true,
      },
    });
    // Decimal de Prisma -> number dentro del callback del cache (serializable).
    return rows.map((e) => ({
      id: e.id,
      codigo: e.codigo,
      nombre: e.nombre,
      tipo: e.tipo,
      marca: e.marca,
      modelo: e.modelo,
      patente: e.patente,
      anio: e.anio,
      horometro_actual: Number(e.horometro_actual),
    }));
  },
  ["mant-equipos-flota-selector"],
  { revalidate: 120, tags: [MANT_EQUIPOS_TAG] },
);

// ── Mantenciones (listado del Taller) ──────────────────────

export const MANT_MANTENCIONES_TAG = "mant-mantenciones";

export type MantencionLista = {
  id: string;
  equipo: string | null;
  equipoCodigo: string | null;
  tipo: string;
  descripcion: string;
  fecha_inicio: string; // ISO
  responsable: string | null;
  costo: number | null;
  estado: string;
};

export const getMantenciones = unstable_cache(
  async (): Promise<MantencionLista[]> => {
    const rows = await prisma.mantMantencion.findMany({
      where: { deleted_at: null },
      orderBy: { fecha_inicio: "desc" },
      select: {
        id: true,
        tipo: true,
        descripcion: true,
        fecha_inicio: true,
        costo: true,
        estado: true,
        equipo: { select: { codigo: true, nombre: true } },
        responsable: { select: { nombre: true } },
      },
    });
    return rows.map((m) => ({
      id: m.id,
      equipo: m.equipo?.nombre ?? null,
      equipoCodigo: m.equipo?.codigo ?? null,
      tipo: m.tipo,
      descripcion: m.descripcion,
      fecha_inicio: m.fecha_inicio.toISOString(),
      responsable: m.responsable?.nombre ?? null,
      costo: m.costo != null ? Number(m.costo) : null,
      estado: m.estado,
    }));
  },
  ["mant-mantenciones"],
  { revalidate: 60, tags: [MANT_MANTENCIONES_TAG] },
);

// ── Detalle de una mantención ──────────────────────────────

export type MantencionDetalle = {
  id: string;
  equipo_id: string;
  responsable_id: string;
  equipo: string | null;
  equipoCodigo: string | null;
  responsable: string | null;
  tipo: string;
  fecha_inicio: string; // ISO
  fecha_fin: string | null; // ISO
  horometro_realizada: number | null;
  descripcion: string;
  trabajos_realizados: string | null;
  repuestos_usados: string | null;
  costo: number | null;
  proxima_mantencion_horometro: number | null;
  proxima_mantencion_fecha: string | null; // ISO date
  estado: string;
  observaciones: string | null;
  created_at: string;
};

export async function getMantencionDetalle(
  id: string,
): Promise<MantencionDetalle | null> {
  const m = await prisma.mantMantencion.findFirst({
    where: { id, deleted_at: null },
    select: {
      id: true,
      equipo_id: true,
      responsable_id: true,
      tipo: true,
      fecha_inicio: true,
      fecha_fin: true,
      horometro_realizada: true,
      descripcion: true,
      trabajos_realizados: true,
      repuestos_usados: true,
      costo: true,
      proxima_mantencion_horometro: true,
      proxima_mantencion_fecha: true,
      estado: true,
      observaciones: true,
      created_at: true,
      equipo: { select: { codigo: true, nombre: true } },
      responsable: { select: { nombre: true } },
    },
  });
  if (!m) return null;
  return {
    id: m.id,
    equipo_id: m.equipo_id,
    responsable_id: m.responsable_id,
    equipo: m.equipo?.nombre ?? null,
    equipoCodigo: m.equipo?.codigo ?? null,
    responsable: m.responsable?.nombre ?? null,
    tipo: m.tipo,
    fecha_inicio: m.fecha_inicio.toISOString(),
    fecha_fin: m.fecha_fin ? m.fecha_fin.toISOString() : null,
    horometro_realizada:
      m.horometro_realizada != null ? Number(m.horometro_realizada) : null,
    descripcion: m.descripcion,
    trabajos_realizados: m.trabajos_realizados,
    repuestos_usados: m.repuestos_usados,
    costo: m.costo != null ? Number(m.costo) : null,
    proxima_mantencion_horometro:
      m.proxima_mantencion_horometro != null
        ? Number(m.proxima_mantencion_horometro)
        : null,
    proxima_mantencion_fecha: m.proxima_mantencion_fecha
      ? m.proxima_mantencion_fecha.toISOString()
      : null,
    estado: m.estado,
    observaciones: m.observaciones,
    created_at: m.created_at.toISOString(),
  };
}

// Datos para el PDF de la Orden de Trabajo. Separada de getMantencionDetalle
// (que ya consume la página de detalle) porque el PDF necesita además tipo,
// marca y patente del equipo — dedicada en vez de ampliar la existente.
export type MantencionParaPDF = {
  id: string;
  equipoCodigo: string | null;
  equipoNombre: string | null;
  tipoEquipo: string | null;
  marca: string | null;
  patente: string | null;
  responsable: string | null;
  tipo: string;
  fecha_inicio: string; // ISO
  fecha_fin: string | null; // ISO
  horometro_realizada: number | null;
  descripcion: string;
  trabajos_realizados: string | null;
  repuestos_usados: string | null;
  costo: number | null;
  proxima_mantencion_horometro: number | null;
  proxima_mantencion_fecha: string | null; // ISO date
  estado: string;
  observaciones: string | null;
};

export async function getMantencionParaPDF(
  id: string,
): Promise<MantencionParaPDF | null> {
  const m = await prisma.mantMantencion.findFirst({
    where: { id, deleted_at: null },
    select: {
      id: true,
      tipo: true,
      fecha_inicio: true,
      fecha_fin: true,
      horometro_realizada: true,
      descripcion: true,
      trabajos_realizados: true,
      repuestos_usados: true,
      costo: true,
      proxima_mantencion_horometro: true,
      proxima_mantencion_fecha: true,
      estado: true,
      observaciones: true,
      equipo: {
        select: { codigo: true, nombre: true, tipo: true, marca: true, patente: true },
      },
      responsable: { select: { nombre: true } },
    },
  });
  if (!m) return null;
  return {
    id: m.id,
    equipoCodigo: m.equipo?.codigo ?? null,
    equipoNombre: m.equipo?.nombre ?? null,
    tipoEquipo: m.equipo?.tipo ?? null,
    marca: m.equipo?.marca ?? null,
    patente: m.equipo?.patente ?? null,
    responsable: m.responsable?.nombre ?? null,
    tipo: m.tipo,
    fecha_inicio: m.fecha_inicio.toISOString(),
    fecha_fin: m.fecha_fin ? m.fecha_fin.toISOString() : null,
    horometro_realizada:
      m.horometro_realizada != null ? Number(m.horometro_realizada) : null,
    descripcion: m.descripcion,
    trabajos_realizados: m.trabajos_realizados,
    repuestos_usados: m.repuestos_usados,
    costo: m.costo != null ? Number(m.costo) : null,
    proxima_mantencion_horometro:
      m.proxima_mantencion_horometro != null
        ? Number(m.proxima_mantencion_horometro)
        : null,
    proxima_mantencion_fecha: m.proxima_mantencion_fecha
      ? m.proxima_mantencion_fecha.toISOString()
      : null,
    estado: m.estado,
    observaciones: m.observaciones,
  };
}

// ── Certificados (vigencias y vencimientos) ────────────────

export const MANT_CERTIFICADOS_TAG = "mant-certificados";

// El estado NO se persiste: se deriva de la fecha de vencimiento.
export function estadoCertificado(fechaVencimientoISO: string): string {
  const vence = new Date(fechaVencimientoISO);
  const dias = Math.floor((vence.getTime() - Date.now()) / 86_400_000);
  if (dias < 0) return "Vencido";
  if (dias <= 30) return "Por Vencer";
  return "Vigente";
}

export type CertificadoLista = {
  id: string;
  equipo: string | null;
  equipoCodigo: string | null;
  tipo: string;
  numero: string | null;
  fecha_vencimiento: string; // ISO date
  empresa_emisora: string | null;
  estado: string; // derivado
};

export const getCertificados = unstable_cache(
  async (): Promise<CertificadoLista[]> => {
    const rows = await prisma.mantCertificado.findMany({
      where: { deleted_at: null },
      orderBy: { fecha_vencimiento: "asc" },
      select: {
        id: true,
        tipo: true,
        numero: true,
        fecha_vencimiento: true,
        empresa_emisora: true,
        equipo: { select: { codigo: true, nombre: true } },
      },
    });
    return rows.map((c) => {
      const fecha = c.fecha_vencimiento.toISOString();
      return {
        id: c.id,
        equipo: c.equipo?.nombre ?? null,
        equipoCodigo: c.equipo?.codigo ?? null,
        tipo: c.tipo,
        numero: c.numero,
        fecha_vencimiento: fecha,
        empresa_emisora: c.empresa_emisora,
        estado: estadoCertificado(fecha),
      };
    });
  },
  ["mant-certificados"],
  { revalidate: 60, tags: [MANT_CERTIFICADOS_TAG] },
);

// ── Partes diarios (Operación) ─────────────────────────────

export const MANT_PARTES_TAG = "mant-partes";

export type ParteLista = {
  id: string;
  fecha: string; // ISO date
  equipo: string | null;
  equipoCodigo: string | null;
  operador: string | null;
  horometro: number | null;
  combustible_fraccion: string | null;
  estado: string;
  /** Null mientras el equipo siga en el taller. El listado lo usa para
   *  distinguir "Registrar salida" de "Editar salida registrada". */
  fecha_salida: string | null;
};

// Sin unstable_cache: lista "viva" con AutoRefresh (polling). El cache
// neutralizaría el refresco mostrando datos viejos hasta el TTL.
export async function getPartes(): Promise<ParteLista[]> {
  const rows = await prisma.mantParteDiario.findMany({
    where: { deleted_at: null },
    orderBy: [{ fecha: "desc" }, { created_at: "desc" }],
    take: MAX_LISTA_TERRENO,
    select: {
      id: true,
      fecha: true,
      fecha_salida: true,
      horometro: true,
      combustible_fraccion: true,
      estado: true,
      equipo: { select: { codigo: true, nombre: true } },
      operador: { select: { nombre: true } },
    },
  });
  return rows.map((p) => ({
    id: p.id,
    fecha: p.fecha.toISOString(),
    equipo: p.equipo?.nombre ?? null,
    equipoCodigo: p.equipo?.codigo ?? null,
    operador: p.operador?.nombre ?? null,
    horometro: p.horometro != null ? Number(p.horometro) : null,
    combustible_fraccion: p.combustible_fraccion,
    estado: p.estado,
    fecha_salida: p.fecha_salida ? p.fecha_salida.toISOString() : null,
  }));
}

// Equipos que siguen físicamente en el taller (sin fecha de salida). Alimenta
// la pantalla "Registrar salida" del listado: el usuario elige ahí cuál orden
// cierra, en vez de tener que recordar el id.
export type EquipoEnTaller = {
  parteId: string;
  equipo: string | null;
  equipoCodigo: string | null;
  fechaIngreso: string; // ISO date
  responsable: string | null;
  horometro: number | null;
};

// Sin unstable_cache, mismo criterio que getPartes: la pantalla de selección
// tiene que reflejar de inmediato una salida recién registrada (si no, el
// equipo seguiría apareciendo como "en el taller" hasta que venza el TTL).
export async function getEquiposEnTaller(): Promise<EquipoEnTaller[]> {
  const rows = await prisma.mantParteDiario.findMany({
    where: { deleted_at: null, fecha_salida: null },
    orderBy: { fecha: "desc" },
    take: MAX_LISTA_TERRENO,
    select: {
      id: true,
      fecha: true,
      horometro: true,
      nombre_responsable: true,
      equipo: { select: { codigo: true, nombre: true } },
    },
  });
  return rows.map((p) => ({
    parteId: p.id,
    equipo: p.equipo?.nombre ?? null,
    equipoCodigo: p.equipo?.codigo ?? null,
    fechaIngreso: p.fecha.toISOString(),
    responsable: p.nombre_responsable,
    horometro: p.horometro != null ? Number(p.horometro) : null,
  }));
}

// ── Detalle de un parte diario ─────────────────────────────

export type ParteDetalle = {
  id: string;
  equipo_id: string;
  operador_id: string;
  equipo: string | null;
  equipoCodigo: string | null;
  operador: string | null;
  fecha: string; // ISO date
  horometro_inicio: number | null;
  horometro_fin: number | null;
  km_inicio: number | null;
  km_fin: number | null;
  combustible_litros: number | null;
  aceite_litros: number | null;
  descripcion_trabajo: string | null;
  observaciones: string | null;
  estado: string;
  // Registro Ingreso/Salida
  horometro: number | null;
  odometro: number | null;
  area_uso: string | null;
  centro_costo: string | null;
  tipo_mantencion: string | null;
  combustible_fraccion: string | null;
  nombre_responsable: string | null;
  rut_responsable: string | null;
  nombre_receptor: string | null;
  rut_receptor: string | null;
  fecha_salida: string | null; // ISO date
  componentes: ComponentesData | null;
  fotos_tablero: string[];
  fotos_entrada: string[];
  fotos_salida: string[];
};

export async function getParteDetalle(id: string): Promise<ParteDetalle | null> {
  const p = await prisma.mantParteDiario.findFirst({
    where: { id, deleted_at: null },
    select: {
      id: true,
      equipo_id: true,
      operador_id: true,
      fecha: true,
      horometro_inicio: true,
      horometro_fin: true,
      km_inicio: true,
      km_fin: true,
      combustible_litros: true,
      aceite_litros: true,
      descripcion_trabajo: true,
      observaciones: true,
      estado: true,
      horometro: true,
      odometro: true,
      area_uso: true,
      centro_costo: true,
      tipo_mantencion: true,
      combustible_fraccion: true,
      nombre_responsable: true,
      rut_responsable: true,
      nombre_receptor: true,
      rut_receptor: true,
      fecha_salida: true,
      componentes: true,
      fotos_tablero: true,
      fotos_entrada: true,
      fotos_salida: true,
      equipo: { select: { codigo: true, nombre: true } },
      operador: { select: { nombre: true } },
    },
  });
  if (!p) return null;
  const num = (v: unknown) => (v != null ? Number(v as number) : null);
  return {
    id: p.id,
    equipo_id: p.equipo_id,
    operador_id: p.operador_id,
    equipo: p.equipo?.nombre ?? null,
    equipoCodigo: p.equipo?.codigo ?? null,
    operador: p.operador?.nombre ?? null,
    fecha: p.fecha.toISOString(),
    horometro_inicio: num(p.horometro_inicio),
    horometro_fin: num(p.horometro_fin),
    km_inicio: num(p.km_inicio),
    km_fin: num(p.km_fin),
    combustible_litros: num(p.combustible_litros),
    aceite_litros: num(p.aceite_litros),
    descripcion_trabajo: p.descripcion_trabajo,
    observaciones: p.observaciones,
    estado: p.estado,
    horometro: num(p.horometro),
    odometro: num(p.odometro),
    area_uso: p.area_uso,
    centro_costo: p.centro_costo,
    tipo_mantencion: p.tipo_mantencion,
    combustible_fraccion: p.combustible_fraccion,
    nombre_responsable: p.nombre_responsable,
    rut_responsable: p.rut_responsable,
    nombre_receptor: p.nombre_receptor,
    rut_receptor: p.rut_receptor,
    fecha_salida: p.fecha_salida ? p.fecha_salida.toISOString() : null,
    componentes: (p.componentes as ComponentesData | null) ?? null,
    fotos_tablero: p.fotos_tablero,
    fotos_entrada: p.fotos_entrada,
    fotos_salida: p.fotos_salida,
  };
}

// Convierte rutas de Storage en URLs firmadas para mostrar las fotos del
// registro. Deliberadamente SIN unstable_cache: las URLs firmadas expiran a
// las 3600s y, si quedaran cacheadas, se servirían rotas hasta el próximo
// revalidate. Si Storage falla, se loguea y se devuelve {} — una foto que no
// carga no debe tumbar la página completa del registro.
export async function getFotosFirmadas(
  paths: string[],
): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  try {
    return await getSignedUrls(paths, 3600);
  } catch (e) {
    console.error("[queries] Error al firmar fotos del registro:", e);
    return {};
  }
}

// ── Último registro de entrada por equipo (prellenado del ciclo) ───────────
// El horómetro/odómetro de la ficha del equipo (MantEquipo.horometro_actual)
// solo se escribe al editar el equipo a mano, así que NO es fuente confiable
// para prellenar. La fuente correcta es el último registro de ingreso/salida
// del equipo, y por eso se devuelve también su fecha: quien llena el
// formulario tiene que saber de cuándo viene el dato copiado.
//
// Lista blanca explícita: el registro vive en Operación y el prellenado se
// consume desde Mantención, así que se exponen solo los campos operativos.
// rut_responsable y rut_receptor quedan EXCLUIDOS a propósito.

export type UltimoRegistroEquipo = {
  id: string;
  fecha: string; // ISO date (@db.Date → medianoche UTC)
  fecha_salida: string | null; // ISO date (@db.Date)
  horometro: number | null;
  odometro: number | null;
  area_uso: string | null;
  centro_costo: string | null;
  tipo_mantencion: string | null;
  operador_id: string;
};

// Fila cruda de mant_partes_diarios acotada a la lista blanca. Los Decimal de
// Prisma entran como unknown y se convierten a number en el mapeo.
type UltimoRegistroRow = {
  id: string;
  fecha: Date;
  fecha_salida: Date | null;
  horometro: unknown;
  odometro: unknown;
  area_uso: string | null;
  centro_costo: string | null;
  tipo_mantencion: string | null;
  operador_id: string;
};

function mapUltimoRegistro(r: UltimoRegistroRow): UltimoRegistroEquipo {
  const num = (v: unknown) => (v != null ? Number(v as number) : null);
  return {
    id: r.id,
    fecha: r.fecha.toISOString(),
    fecha_salida: r.fecha_salida ? r.fecha_salida.toISOString() : null,
    horometro: num(r.horometro),
    odometro: num(r.odometro),
    area_uso: r.area_uso,
    centro_costo: r.centro_costo,
    tipo_mantencion: r.tipo_mantencion,
    operador_id: r.operador_id,
  };
}

// Último registro de CADA equipo, indexado por equipo_id. Lo consume el
// formulario para prellenar al vuelo cuando cambia el select de equipo, sin
// ida y vuelta al servidor.
export type UltimosRegistrosPorEquipo = Record<string, UltimoRegistroEquipo>;

export const getUltimosRegistrosPorEquipo = unstable_cache(
  async (): Promise<UltimosRegistrosPorEquipo> => {
    // 1) Fecha del último registro de cada equipo no borrado. Los registros
    //    "Rechazado" quedan fuera: el supervisor desestimó esos datos y no
    //    deben volver como propuesta de horómetro/odómetro. El filtro va en las
    //    DOS consultas; si solo va acá, el paso 2 vuelve a traer la fila
    //    rechazada cuando comparte fecha con otra.
    const maximos = await prisma.mantParteDiario.groupBy({
      by: ["equipo_id"],
      where: {
        deleted_at: null,
        equipo: { deleted_at: null },
        estado: { not: "Rechazado" },
      },
      _max: { fecha: true },
    });
    const pares = maximos
      .filter((m) => m._max.fecha != null)
      .map((m) => ({ equipo_id: m.equipo_id, fecha: m._max.fecha as Date }));
    if (pares.length === 0) return {};

    // 2) Las filas de esas fechas. El orden resuelve el empate cuando un
    //    equipo tiene más de un registro el mismo día.
    const rows = await prisma.mantParteDiario.findMany({
      where: { deleted_at: null, estado: { not: "Rechazado" }, OR: pares },
      orderBy: [{ fecha: "desc" }, { created_at: "desc" }],
      select: {
        id: true,
        equipo_id: true,
        fecha: true,
        fecha_salida: true,
        horometro: true,
        odometro: true,
        area_uso: true,
        centro_costo: true,
        tipo_mantencion: true,
        operador_id: true,
      },
    });

    // Decimal de Prisma -> number dentro del callback del cache (serializable).
    const porEquipo: UltimosRegistrosPorEquipo = {};
    for (const r of rows) {
      if (porEquipo[r.equipo_id]) continue; // el primero ya es el más reciente
      porEquipo[r.equipo_id] = mapUltimoRegistro(r);
    }
    return porEquipo;
  },
  ["mant-ultimos-registros-por-equipo"],
  // La lectura cruza los dos módulos: los registros se crean en Operación
  // (MANT_PARTES_TAG) y los equipos se administran en Mantención
  // (MANT_EQUIPOS_TAG). Sin ambos tags el prellenado quedaría hasta 60 s atrás.
  { revalidate: 60, tags: [MANT_PARTES_TAG, MANT_EQUIPOS_TAG] },
);

// ── Checklists pre-operacionales (Operación) ───────────────

export const MANT_CHECKLISTS_TAG = "mant-checklists";

export type ChecklistLista = {
  id: string;
  fecha: string; // ISO
  equipo: string | null;
  equipoCodigo: string | null;
  operador: string | null;
  estado_general: string;
  ok: number;
  fail: number;
  total: number;
  anulado: boolean;
};

const CHECKLIST_BOOL_SELECT = CHECKLIST_ITEM_KEYS.reduce(
  (acc, k) => ({ ...acc, [k]: true }),
  {} as Record<ChecklistItemKey, true>,
);

// Sin unstable_cache: lista "viva" con AutoRefresh (polling).
export async function getChecklists(): Promise<ChecklistLista[]> {
  const rows = await prisma.mantChecklist.findMany({
    orderBy: { fecha: "desc" },
    take: MAX_LISTA_TERRENO,
    select: {
      id: true,
      fecha: true,
      estado_general: true,
      anulado_at: true,
      ...CHECKLIST_BOOL_SELECT,
      equipo: { select: { codigo: true, nombre: true } },
      operador: { select: { nombre: true } },
    },
  });
  return rows.map((c) => {
    const row = c as unknown as Record<ChecklistItemKey, boolean | null>;
    const ok = CHECKLIST_ITEM_KEYS.filter((k) => row[k] === true).length;
    const fail = CHECKLIST_ITEM_KEYS.filter((k) => row[k] === false).length;
    return {
      id: c.id,
      fecha: c.fecha.toISOString(),
      equipo: c.equipo?.nombre ?? null,
      equipoCodigo: c.equipo?.codigo ?? null,
      operador: c.operador?.nombre ?? null,
      estado_general: c.estado_general,
      ok,
      fail,
      total: CHECKLIST_ITEM_KEYS.length,
      anulado: c.anulado_at != null,
    };
  });
}

// ── Detalle de un checklist ────────────────────────────────

export type ChecklistDetalle = {
  id: string;
  fecha: string; // ISO
  equipo: string | null;
  equipoCodigo: string | null;
  operador: string | null;
  estado_general: string;
  observaciones: string | null;
  items: { key: ChecklistItemKey; valor: boolean | null }[];
  anulado: boolean;
  anulado_at: string | null;
  motivo_anulacion: string | null;
  anulado_por: string | null;
};

export async function getChecklistDetalle(
  id: string,
): Promise<ChecklistDetalle | null> {
  const c = await prisma.mantChecklist.findUnique({
    where: { id },
    select: {
      id: true,
      fecha: true,
      estado_general: true,
      observaciones: true,
      anulado_at: true,
      motivo_anulacion: true,
      ...CHECKLIST_BOOL_SELECT,
      equipo: { select: { codigo: true, nombre: true } },
      operador: { select: { nombre: true } },
      anulado_por: { select: { nombre: true } },
    },
  });
  if (!c) return null;
  const row = c as unknown as Record<ChecklistItemKey, boolean | null>;
  return {
    id: c.id,
    fecha: c.fecha.toISOString(),
    equipo: c.equipo?.nombre ?? null,
    equipoCodigo: c.equipo?.codigo ?? null,
    operador: c.operador?.nombre ?? null,
    estado_general: c.estado_general,
    observaciones: c.observaciones,
    items: CHECKLIST_ITEM_KEYS.map((k) => ({ key: k, valor: row[k] })),
    anulado: c.anulado_at != null,
    anulado_at: c.anulado_at ? c.anulado_at.toISOString() : null,
    motivo_anulacion: c.motivo_anulacion,
    anulado_por: c.anulado_por?.nombre ?? null,
  };
}

// ── Check List de Mantenimiento (taller, 83 ítems) ─────────

export const MANT_CHECKLIST_MANT_TAG = "mant-checklist-mantencion";

export type ChecklistMantLista = {
  id: string;
  correlativo: number;
  fecha: string; // ISO date
  equipo: string | null;
  equipoCodigo: string | null;
  tipo_mantencion: string;
  responsable: string | null;
  anulado: boolean;
};

export const getChecklistsMantencion = unstable_cache(
  async (): Promise<ChecklistMantLista[]> => {
    const rows = await prisma.mantChecklistMantencion.findMany({
      orderBy: { fecha: "desc" },
      take: MAX_LISTA_TERRENO,
      select: {
        id: true,
        correlativo: true,
        fecha: true,
        tipo_mantencion: true,
        anulado_at: true,
        equipo: { select: { codigo: true, nombre: true } },
        responsable: { select: { nombre: true } },
      },
    });
    return rows.map((c) => ({
      id: c.id,
      correlativo: c.correlativo,
      fecha: c.fecha.toISOString(),
      equipo: c.equipo?.nombre ?? null,
      equipoCodigo: c.equipo?.codigo ?? null,
      tipo_mantencion: c.tipo_mantencion,
      responsable: c.responsable?.nombre ?? null,
      anulado: c.anulado_at != null,
    }));
  },
  ["mant-checklist-mantencion"],
  { revalidate: 60, tags: [MANT_CHECKLIST_MANT_TAG] },
);

export type ChecklistMantDetalle = {
  id: string;
  correlativo: number;
  equipo_id: string;
  // responsable_id (además del nombre) para prellenar el documento siguiente
  // del ciclo sin tener que adivinar el Profile por nombre.
  responsable_id: string | null;
  equipo: string | null;
  equipoCodigo: string | null;
  responsable: string | null;
  fecha: string; // ISO date
  tipo_mantencion: string;
  empresa: string;
  patente_snapshot: string | null;
  km_snapshot: number | null;
  horometro_snapshot: number | null;
  proxima_mantencion: number | null;
  items: unknown;
  observaciones_generales: string | null;
  anulado: boolean;
  anulado_at: string | null;
  motivo_anulacion: string | null;
};

export async function getChecklistMantencionDetalle(
  id: string,
): Promise<ChecklistMantDetalle | null> {
  const c = await prisma.mantChecklistMantencion.findUnique({
    where: { id },
    select: {
      id: true,
      correlativo: true,
      equipo_id: true,
      responsable_id: true,
      fecha: true,
      tipo_mantencion: true,
      empresa: true,
      patente_snapshot: true,
      km_snapshot: true,
      horometro_snapshot: true,
      proxima_mantencion: true,
      items: true,
      observaciones_generales: true,
      anulado_at: true,
      motivo_anulacion: true,
      equipo: { select: { codigo: true, nombre: true } },
      responsable: { select: { nombre: true } },
    },
  });
  if (!c) return null;
  const num = (v: unknown) => (v != null ? Number(v as number) : null);
  return {
    id: c.id,
    correlativo: c.correlativo,
    equipo_id: c.equipo_id,
    responsable_id: c.responsable_id,
    equipo: c.equipo?.nombre ?? null,
    equipoCodigo: c.equipo?.codigo ?? null,
    responsable: c.responsable?.nombre ?? null,
    fecha: c.fecha.toISOString(),
    tipo_mantencion: c.tipo_mantencion,
    empresa: c.empresa,
    patente_snapshot: c.patente_snapshot,
    km_snapshot: num(c.km_snapshot),
    horometro_snapshot: num(c.horometro_snapshot),
    proxima_mantencion: num(c.proxima_mantencion),
    items: c.items,
    observaciones_generales: c.observaciones_generales,
    anulado: c.anulado_at != null,
    anulado_at: c.anulado_at ? c.anulado_at.toISOString() : null,
    motivo_anulacion: c.motivo_anulacion,
  };
}

// Siguiente correlativo del año para el check list de mantenimiento.
// La unicidad real la garantiza el índice único (correlativo, anio) en DB;
// la action reintenta si hay carrera (ver createChecklistMantencion).
export async function nextCorrelativoChecklistMant(anio: number): Promise<number> {
  const max = await prisma.mantChecklistMantencion.aggregate({
    _max: { correlativo: true },
    where: { anio },
  });
  return (max._max.correlativo ?? 0) + 1;
}

// ── Certificado de Mantención (documento firmado) ──────────

export const MANT_CERT_MANT_TAG = "mant-certificado-mantencion";

export type CertMantLista = {
  id: string;
  correlativo: number;
  fecha: string; // ISO date
  equipo: string | null;
  equipoCodigo: string | null;
  responsable: string | null;
  anulado: boolean;
};

export const getCertificadosMantencion = unstable_cache(
  async (): Promise<CertMantLista[]> => {
    const rows = await prisma.mantCertificadoMantencion.findMany({
      orderBy: { fecha: "desc" },
      take: MAX_LISTA_TERRENO,
      select: {
        id: true,
        correlativo: true,
        fecha: true,
        anulado_at: true,
        equipo: { select: { codigo: true, nombre: true } },
        responsable: { select: { nombre: true } },
      },
    });
    return rows.map((c) => ({
      id: c.id,
      correlativo: c.correlativo,
      fecha: c.fecha.toISOString(),
      equipo: c.equipo?.nombre ?? null,
      equipoCodigo: c.equipo?.codigo ?? null,
      responsable: c.responsable?.nombre ?? null,
      anulado: c.anulado_at != null,
    }));
  },
  ["mant-certificado-mantencion"],
  { revalidate: 60, tags: [MANT_CERT_MANT_TAG] },
);

export type CertMantDetalle = {
  id: string;
  correlativo: number;
  // Los ids (además de los nombres) los necesita el prellenado del documento
  // siguiente del ciclo: sin ellos habría que resolver equipo y Profile por
  // nombre, que no es único.
  equipo_id: string;
  responsable_id: string | null;
  gerente_id: string | null;
  equipo: string | null;
  equipoCodigo: string | null;
  responsable: string | null;
  gerente: string | null;
  fecha: string; // ISO date
  ciudad: string;
  tipo_equipo_snapshot: string | null;
  marca_snapshot: string | null;
  patente_snapshot: string | null;
  horometro_snapshot: number | null;
  odometro_snapshot: number | null;
  proxima_mantencion: number | null;
  // Firma digital opcional (data URI); hoy no hay UI que la capture, casi
  // siempre viene null y el PDF deja el recuadro vacío para firmar a mano.
  firma_encargado_b64: string | null;
  firma_gerente_b64: string | null;
  anulado: boolean;
  anulado_at: string | null;
  motivo_anulacion: string | null;
};

export async function getCertificadoMantencionDetalle(
  id: string,
): Promise<CertMantDetalle | null> {
  const c = await prisma.mantCertificadoMantencion.findUnique({
    where: { id },
    select: {
      id: true,
      correlativo: true,
      equipo_id: true,
      responsable_id: true,
      gerente_id: true,
      fecha: true,
      ciudad: true,
      tipo_equipo_snapshot: true,
      marca_snapshot: true,
      patente_snapshot: true,
      horometro_snapshot: true,
      odometro_snapshot: true,
      proxima_mantencion: true,
      firma_encargado_b64: true,
      firma_gerente_b64: true,
      anulado_at: true,
      motivo_anulacion: true,
      equipo: { select: { codigo: true, nombre: true } },
      responsable: { select: { nombre: true } },
      gerente: { select: { nombre: true } },
    },
  });
  if (!c) return null;
  const num = (v: unknown) => (v != null ? Number(v as number) : null);
  return {
    id: c.id,
    correlativo: c.correlativo,
    equipo_id: c.equipo_id,
    responsable_id: c.responsable_id,
    gerente_id: c.gerente_id,
    equipo: c.equipo?.nombre ?? null,
    equipoCodigo: c.equipo?.codigo ?? null,
    responsable: c.responsable?.nombre ?? null,
    gerente: c.gerente?.nombre ?? null,
    fecha: c.fecha.toISOString(),
    ciudad: c.ciudad,
    tipo_equipo_snapshot: c.tipo_equipo_snapshot,
    marca_snapshot: c.marca_snapshot,
    patente_snapshot: c.patente_snapshot,
    horometro_snapshot: num(c.horometro_snapshot),
    odometro_snapshot: num(c.odometro_snapshot),
    proxima_mantencion: num(c.proxima_mantencion),
    firma_encargado_b64: c.firma_encargado_b64,
    firma_gerente_b64: c.firma_gerente_b64,
    anulado: c.anulado_at != null,
    anulado_at: c.anulado_at ? c.anulado_at.toISOString() : null,
    motivo_anulacion: c.motivo_anulacion,
  };
}

export async function nextCorrelativoCertMant(anio: number): Promise<number> {
  const max = await prisma.mantCertificadoMantencion.aggregate({
    _max: { correlativo: true },
    where: { anio },
  });
  return (max._max.correlativo ?? 0) + 1;
}

// ── Planes de Mantención (paso 2 del flujo: registro → plan → OT) ──
// El plan planifica un trabajo (A según fabricante, B preventivo, C correctivo)
// a partir de un registro de entrada opcional. Al generar la OT se copia a una
// MantMantencion (Taller) y el plan queda "Con OT".

export const MANT_PLANES_TAG = "mant-planes";

export type PlanMantLista = {
  id: string;
  correlativo: number;
  anio: number;
  plan: string; // "A" | "B" | "C"
  estado: string; // "Planificado" | "Con OT" | "Anulado"
  fecha_planificada: string | null; // ISO date
  equipo: string | null;
  equipoCodigo: string | null;
  responsable: string | null;
  created_at: string; // ISO
};

export const getPlanes = unstable_cache(
  async (): Promise<PlanMantLista[]> => {
    const rows = await prisma.mantPlanMantencion.findMany({
      where: { deleted_at: null },
      orderBy: { created_at: "desc" },
      take: MAX_LISTA_TERRENO,
      select: {
        id: true,
        correlativo: true,
        anio: true,
        plan: true,
        estado: true,
        fecha_planificada: true,
        created_at: true,
        equipo: { select: { codigo: true, nombre: true } },
        responsable: { select: { nombre: true } },
      },
    });
    return rows.map((p) => ({
      id: p.id,
      correlativo: p.correlativo,
      anio: p.anio,
      plan: p.plan,
      estado: p.estado,
      fecha_planificada: p.fecha_planificada
        ? p.fecha_planificada.toISOString()
        : null,
      equipo: p.equipo?.nombre ?? null,
      equipoCodigo: p.equipo?.codigo ?? null,
      responsable: p.responsable?.nombre ?? null,
      created_at: p.created_at.toISOString(),
    }));
  },
  ["mant-planes"],
  { revalidate: 60, tags: [MANT_PLANES_TAG] },
);

export type PlanMantDetalle = {
  id: string;
  correlativo: number;
  anio: number;
  equipo_id: string;
  registro_id: string | null;
  responsable_id: string;
  equipo: string | null;
  equipoCodigo: string | null;
  responsable: string | null;
  plan: string; // "A" | "B" | "C"
  descripcion: string;
  fecha_planificada: string | null; // ISO date
  horometro_referencia: number | null;
  observaciones: string | null;
  estado: string;
  orden_trabajo_id: string | null;
  registroFecha: string | null; // ISO date del parte origen, si hay
  created_at: string; // ISO
};

export async function getPlanDetalle(id: string): Promise<PlanMantDetalle | null> {
  const p = await prisma.mantPlanMantencion.findFirst({
    where: { id, deleted_at: null },
    select: {
      id: true,
      correlativo: true,
      anio: true,
      equipo_id: true,
      registro_id: true,
      responsable_id: true,
      plan: true,
      descripcion: true,
      fecha_planificada: true,
      horometro_referencia: true,
      observaciones: true,
      estado: true,
      orden_trabajo_id: true,
      created_at: true,
      equipo: { select: { codigo: true, nombre: true } },
      responsable: { select: { nombre: true } },
      registro: { select: { fecha: true } },
    },
  });
  if (!p) return null;
  return {
    id: p.id,
    correlativo: p.correlativo,
    anio: p.anio,
    equipo_id: p.equipo_id,
    registro_id: p.registro_id,
    responsable_id: p.responsable_id,
    equipo: p.equipo?.nombre ?? null,
    equipoCodigo: p.equipo?.codigo ?? null,
    responsable: p.responsable?.nombre ?? null,
    plan: p.plan,
    descripcion: p.descripcion,
    fecha_planificada: p.fecha_planificada
      ? p.fecha_planificada.toISOString()
      : null,
    horometro_referencia:
      p.horometro_referencia != null ? Number(p.horometro_referencia) : null,
    observaciones: p.observaciones,
    estado: p.estado,
    orden_trabajo_id: p.orden_trabajo_id,
    registroFecha: p.registro?.fecha ? p.registro.fecha.toISOString() : null,
    created_at: p.created_at.toISOString(),
  };
}

// Lookup inverso: ¿desde qué plan se generó esta orden de trabajo (OT)?
// Se usa en el detalle del Taller para enlazar de vuelta al plan de origen.
export type PlanOrigenResumen = {
  id: string;
  correlativo: number;
  plan: string; // "A" | "B" | "C"
};

export async function getPlanOrigenDeOT(
  ordenTrabajoId: string,
): Promise<PlanOrigenResumen | null> {
  const p = await prisma.mantPlanMantencion.findFirst({
    where: { orden_trabajo_id: ordenTrabajoId, deleted_at: null },
    select: { id: true, correlativo: true, plan: true },
  });
  if (!p) return null;
  return { id: p.id, correlativo: p.correlativo, plan: p.plan };
}

// Siguiente correlativo del año. La unicidad real la garantiza el índice único
// (correlativo, anio); la action reintenta si hay carrera (ver createPlan).
export async function nextCorrelativoPlanMant(anio: number): Promise<number> {
  const max = await prisma.mantPlanMantencion.aggregate({
    _max: { correlativo: true },
    where: { anio },
  });
  return (max._max.correlativo ?? 0) + 1;
}

// Selector de registros de entrada recientes (paso 1) para prellenar el plan.
// Al elegir uno, el form copia equipo + horómetro + observaciones desde la BD.
export type RegistroRecienteOption = {
  id: string;
  fecha: string; // ISO date
  fecha_salida: string | null; // ISO date
  equipo_id: string;
  equipo: string | null; // "CODIGO · nombre"
  operador_id: string;
  horometro: number | null;
  odometro: number | null;
  area_uso: string | null;
  centro_costo: string | null;
  // Vocabulario del registro (Operación). NO se copia crudo al destino: cada
  // formulario tiene su propia lista de tipos y debe mapear con whitelist.
  tipo_mantencion: string | null;
  observaciones: string | null;
};

export const getRegistrosRecientesOptions = unstable_cache(
  async (): Promise<RegistroRecienteOption[]> => {
    const rows = await prisma.mantParteDiario.findMany({
      where: { deleted_at: null },
      orderBy: [{ fecha: "desc" }, { created_at: "desc" }],
      take: 50,
      select: {
        id: true,
        fecha: true,
        fecha_salida: true,
        equipo_id: true,
        operador_id: true,
        horometro: true,
        odometro: true,
        area_uso: true,
        centro_costo: true,
        tipo_mantencion: true,
        observaciones: true,
        equipo: { select: { codigo: true, nombre: true } },
      },
    });
    return rows.map((r) => ({
      id: r.id,
      fecha: r.fecha.toISOString(),
      fecha_salida: r.fecha_salida ? r.fecha_salida.toISOString() : null,
      equipo_id: r.equipo_id,
      equipo: r.equipo ? `${r.equipo.codigo} · ${r.equipo.nombre}` : null,
      operador_id: r.operador_id,
      horometro: r.horometro != null ? Number(r.horometro) : null,
      odometro: r.odometro != null ? Number(r.odometro) : null,
      area_uso: r.area_uso,
      centro_costo: r.centro_costo,
      tipo_mantencion: r.tipo_mantencion,
      observaciones: r.observaciones,
    }));
  },
  ["mant-registros-recientes"],
  // MANT_PARTES_TAG: los registros se crean en Operación (partes-diarios) y esas
  // actions invalidan ese tag — sin él, un registro recién creado tardaría hasta
  // 60s en aparecer en el selector del plan (justo el flujo paso 1 → paso 2).
  { revalidate: 60, tags: [MANT_PLANES_TAG, MANT_PARTES_TAG] },
);

// ── Dashboard del módulo Mantención ────────────────────────

export type MantDashboardMantencion = {
  id: string;
  equipo: string | null;
  tipo: string;
  estado: string;
  fecha_inicio: string; // ISO
};

export type MantDashboardCertificado = {
  id: string;
  equipo: string | null;
  tipo: string;
  fecha_vencimiento: string; // ISO date
  estado: string; // derivado
};

export type MantencionDashboard = {
  kpis: {
    equiposEnMantencion: number;
    mantencionesAbiertas: number;
    mantencionesCompletadas: number;
    certificadosVigentes: number;
    certificadosPorVencer: number;
    certificadosVencidos: number;
  };
  mantencionesEnCurso: MantDashboardMantencion[];
  certificadosPorVencer: MantDashboardCertificado[];
};

export const getMantencionDashboard = unstable_cache(
  async (): Promise<MantencionDashboard> => {
    const ahora = new Date();
    // Medianoche UTC de hoy, para alinear con las fechas @db.Date.
    const hoyUTC = new Date(
      Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate()),
    );
    const en30 = new Date(hoyUTC);
    en30.setUTCDate(en30.getUTCDate() + 30);

    const [
      equiposEnMantencion,
      mantencionesAbiertas,
      mantencionesCompletadas,
      mantencionesEnCurso,
      equiposVenc,
    ] = await Promise.all([
      prisma.mantEquipo.count({
        where: { deleted_at: null, estado: "En Mantención" },
      }),
      prisma.mantMantencion.count({
        where: { deleted_at: null, estado: { not: "Completada" } },
      }),
      prisma.mantMantencion.count({
        where: { deleted_at: null, estado: "Completada" },
      }),
      prisma.mantMantencion.findMany({
        where: { deleted_at: null, estado: { not: "Completada" } },
        orderBy: { fecha_inicio: "desc" },
        take: 5,
        select: {
          id: true,
          tipo: true,
          estado: true,
          fecha_inicio: true,
          equipo: { select: { codigo: true, nombre: true } },
        },
      }),
      prisma.mantEquipo.findMany({
        where: { deleted_at: null },
        select: {
          id: true,
          codigo: true,
          nombre: true,
          soap_vencimiento: true,
          permiso_circ_vencimiento: true,
          rev_tecnica_vencimiento: true,
          extintor_vencimiento: true,
        },
      }),
    ]);

    // Vencimientos: se cuentan los 4 documentos legales de cada equipo.
    const DOCS = [
      { key: "soap_vencimiento", label: "SOAP" },
      { key: "permiso_circ_vencimiento", label: "Permiso de circulación" },
      { key: "rev_tecnica_vencimiento", label: "Revisión técnica" },
      { key: "extintor_vencimiento", label: "Extintor" },
    ] as const;

    let certificadosVigentes = 0;
    let certificadosPorVencerCount = 0;
    let certificadosVencidos = 0;
    const proximos: (MantDashboardCertificado & { _ms: number })[] = [];

    for (const e of equiposVenc) {
      for (const doc of DOCS) {
        const fecha = e[doc.key];
        if (!fecha) continue;
        const dias = Math.floor((fecha.getTime() - hoyUTC.getTime()) / 86_400_000);
        const estado = dias < 0 ? "Vencido" : dias <= 30 ? "Por Vencer" : "Vigente";
        if (estado === "Vigente") {
          certificadosVigentes += 1;
          continue;
        }
        if (estado === "Por Vencer") certificadosPorVencerCount += 1;
        else certificadosVencidos += 1;
        proximos.push({
          id: e.id,
          equipo: `${e.codigo} · ${e.nombre}`,
          tipo: doc.label,
          fecha_vencimiento: fecha.toISOString(),
          estado,
          _ms: fecha.getTime(),
        });
      }
    }
    proximos.sort((a, b) => a._ms - b._ms);

    return {
      kpis: {
        equiposEnMantencion,
        mantencionesAbiertas,
        mantencionesCompletadas,
        certificadosVigentes,
        certificadosPorVencer: certificadosPorVencerCount,
        certificadosVencidos,
      },
      mantencionesEnCurso: mantencionesEnCurso.map((m) => ({
        id: m.id,
        equipo: m.equipo ? `${m.equipo.codigo} · ${m.equipo.nombre}` : null,
        tipo: m.tipo,
        estado: m.estado,
        fecha_inicio: m.fecha_inicio.toISOString(),
      })),
      certificadosPorVencer: proximos.slice(0, 5).map((p) => ({
        id: p.id,
        equipo: p.equipo,
        tipo: p.tipo,
        fecha_vencimiento: p.fecha_vencimiento,
        estado: p.estado,
      })),
    };
  },
  ["mant-dashboard"],
  {
    revalidate: 60,
    // Cualquier mutación de mantenciones, certificados o equipos invalida
    // también este dashboard (comparten estos tags).
    tags: [MANT_MANTENCIONES_TAG, MANT_CERTIFICADOS_TAG, MANT_EQUIPOS_TAG],
  },
);

// ── Detalle de un certificado ──────────────────────────────

export type CertificadoDetalle = {
  id: string;
  equipo_id: string;
  tipo: string;
  numero: string | null;
  fecha_emision: string | null; // ISO date
  fecha_vencimiento: string; // ISO date
  empresa_emisora: string | null;
  observaciones: string | null;
};

export async function getCertificadoDetalle(
  id: string,
): Promise<CertificadoDetalle | null> {
  const c = await prisma.mantCertificado.findFirst({
    where: { id, deleted_at: null },
    select: {
      id: true,
      equipo_id: true,
      tipo: true,
      numero: true,
      fecha_emision: true,
      fecha_vencimiento: true,
      empresa_emisora: true,
      observaciones: true,
    },
  });
  if (!c) return null;
  return {
    id: c.id,
    equipo_id: c.equipo_id,
    tipo: c.tipo,
    numero: c.numero,
    fecha_emision: c.fecha_emision ? c.fecha_emision.toISOString() : null,
    fecha_vencimiento: c.fecha_vencimiento.toISOString(),
    empresa_emisora: c.empresa_emisora,
    observaciones: c.observaciones,
  };
}
