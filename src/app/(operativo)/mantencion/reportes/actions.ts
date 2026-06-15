"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";
import { estadoCertificado } from "@/lib/terreno/queries";

export type ReporteTipo =
  | "mantenciones"
  | "certificados"
  | "partes"
  | "checklists";

export type Columna = { key: string; label: string };
export type Fila = Record<string, string | number | null>;

export type ReporteResult =
  | { error: string }
  | { columnas: Columna[]; filas: Fila[] };

export type ReporteFiltros = {
  tipo: ReporteTipo;
  equipoId: string; // "" = todos
  desde: string; // YYYY-MM-DD
  hasta: string; // YYYY-MM-DD
};

const TIPOS: ReporteTipo[] = [
  "mantenciones",
  "certificados",
  "partes",
  "checklists",
];

function fecha(iso: Date | null): string {
  return iso ? iso.toLocaleDateString("es-CL") : "—";
}

// Para campos @db.Date (medianoche UTC): formatear en UTC para no retroceder
// un día en Chile (UTC-4).
function fechaUTC(iso: Date | null): string {
  return iso ? iso.toLocaleDateString("es-CL", { timeZone: "UTC" }) : "—";
}

function rango(desde: string, hasta: string): { gte: Date; lte: Date } | null {
  if (!desde || !hasta) return null;
  const gte = new Date(`${desde}T00:00:00`);
  const lte = new Date(`${hasta}T23:59:59`);
  if (Number.isNaN(gte.getTime()) || Number.isNaN(lte.getTime())) return null;
  return { gte, lte };
}

export async function generarReporte(
  filtros: ReporteFiltros,
): Promise<ReporteResult> {
  const session = await getSession();
  if (!session) return { error: "Sesión expirada. Vuelve a iniciar sesión." };
  if (!canAccessModule(session, "MANTENCION")) {
    return { error: "No tienes acceso a este módulo." };
  }
  if (!TIPOS.includes(filtros.tipo)) {
    return { error: "Tipo de reporte inválido." };
  }

  const equipoFilter = filtros.equipoId ? { equipo_id: filtros.equipoId } : {};

  // ── Mantenciones ──────────────────────────────────────────
  if (filtros.tipo === "mantenciones") {
    const r = rango(filtros.desde, filtros.hasta);
    const rows = await prisma.mantMantencion.findMany({
      where: {
        deleted_at: null,
        ...equipoFilter,
        ...(r ? { fecha_inicio: { gte: r.gte, lte: r.lte } } : {}),
      },
      orderBy: { fecha_inicio: "asc" },
      select: {
        fecha_inicio: true,
        tipo: true,
        descripcion: true,
        costo: true,
        estado: true,
        equipo: { select: { codigo: true, nombre: true } },
        responsable: { select: { nombre: true } },
      },
    });
    return {
      columnas: [
        { key: "fecha", label: "Fecha" },
        { key: "equipo", label: "Equipo" },
        { key: "tipo", label: "Tipo" },
        { key: "descripcion", label: "Descripción" },
        { key: "responsable", label: "Responsable" },
        { key: "costo", label: "Costo" },
        { key: "estado", label: "Estado" },
      ],
      filas: rows.map((m) => ({
        fecha: fecha(m.fecha_inicio),
        equipo: m.equipo ? `${m.equipo.codigo} · ${m.equipo.nombre}` : "—",
        tipo: m.tipo,
        descripcion: m.descripcion,
        responsable: m.responsable?.nombre ?? "—",
        costo: m.costo != null ? Number(m.costo) : null,
        estado: m.estado,
      })),
    };
  }

  // ── Certificados (sin filtro de fecha; ordenados por vencimiento) ──
  if (filtros.tipo === "certificados") {
    const rows = await prisma.mantCertificado.findMany({
      where: { deleted_at: null, ...equipoFilter },
      orderBy: { fecha_vencimiento: "asc" },
      select: {
        tipo: true,
        numero: true,
        fecha_vencimiento: true,
        empresa_emisora: true,
        equipo: { select: { codigo: true, nombre: true } },
      },
    });
    return {
      columnas: [
        { key: "equipo", label: "Equipo" },
        { key: "tipo", label: "Tipo" },
        { key: "numero", label: "N° documento" },
        { key: "vencimiento", label: "Vencimiento" },
        { key: "empresa", label: "Empresa" },
        { key: "estado", label: "Estado" },
      ],
      filas: rows.map((c) => ({
        equipo: c.equipo ? `${c.equipo.codigo} · ${c.equipo.nombre}` : "—",
        tipo: c.tipo,
        numero: c.numero ?? "—",
        vencimiento: fechaUTC(c.fecha_vencimiento),
        empresa: c.empresa_emisora ?? "—",
        estado: estadoCertificado(c.fecha_vencimiento.toISOString()),
      })),
    };
  }

  // ── Partes diarios ────────────────────────────────────────
  if (filtros.tipo === "partes") {
    const r = rango(filtros.desde, filtros.hasta);
    const rows = await prisma.mantParteDiario.findMany({
      where: {
        deleted_at: null,
        ...equipoFilter,
        ...(r ? { fecha: { gte: r.gte, lte: r.lte } } : {}),
      },
      orderBy: { fecha: "asc" },
      select: {
        fecha: true,
        horometro_inicio: true,
        horometro_fin: true,
        combustible_litros: true,
        estado: true,
        equipo: { select: { codigo: true, nombre: true } },
        operador: { select: { nombre: true } },
      },
    });
    return {
      columnas: [
        { key: "fecha", label: "Fecha" },
        { key: "equipo", label: "Equipo" },
        { key: "operador", label: "Operador" },
        { key: "hrInicio", label: "Hrm. inicio" },
        { key: "hrFin", label: "Hrm. fin" },
        { key: "combustible", label: "Combustible (L)" },
        { key: "estado", label: "Estado" },
      ],
      filas: rows.map((p) => ({
        fecha: fechaUTC(p.fecha),
        equipo: p.equipo ? `${p.equipo.codigo} · ${p.equipo.nombre}` : "—",
        operador: p.operador?.nombre ?? "—",
        hrInicio: p.horometro_inicio != null ? Number(p.horometro_inicio) : null,
        hrFin: p.horometro_fin != null ? Number(p.horometro_fin) : null,
        combustible:
          p.combustible_litros != null ? Number(p.combustible_litros) : null,
        estado: p.estado,
      })),
    };
  }

  // ── Checklists ────────────────────────────────────────────
  const r = rango(filtros.desde, filtros.hasta);
  const rows = await prisma.mantChecklist.findMany({
    where: {
      anulado_at: null,
      ...equipoFilter,
      ...(r ? { fecha: { gte: r.gte, lte: r.lte } } : {}),
    },
    orderBy: { fecha: "asc" },
    select: {
      fecha: true,
      estado_general: true,
      equipo: { select: { codigo: true, nombre: true } },
      operador: { select: { nombre: true } },
    },
  });
  return {
    columnas: [
      { key: "fecha", label: "Fecha" },
      { key: "equipo", label: "Equipo" },
      { key: "operador", label: "Operador" },
      { key: "estado", label: "Estado general" },
    ],
    filas: rows.map((cl) => ({
      fecha: fecha(cl.fecha),
      equipo: cl.equipo ? `${cl.equipo.codigo} · ${cl.equipo.nombre}` : "—",
      operador: cl.operador?.nombre ?? "—",
      estado: cl.estado_general,
    })),
  };
}
