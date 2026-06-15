import { prisma } from "@/lib/prisma";
import { unstable_cache } from "next/cache";

// Tag para invalidar el dashboard de Operación cuando existan acciones de
// escritura (partes diarios / checklists / equipos). Por ahora solo lectura.
export const OPERACION_DASHBOARD_TAG = "operacion-dashboard";

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
    created_at: e.created_at.toISOString(),
    updated_at: e.updated_at.toISOString(),
  };
}

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
