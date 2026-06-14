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
