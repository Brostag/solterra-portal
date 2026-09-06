"use server";

import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";
import { estadoCertificado } from "@/lib/terreno/queries";

export type ReporteTipo =
  | "mantenciones"
  | "certificados"
  | "partes"
  | "checklists"
  | "checklists-mantencion"
  | "certificados-mantencion";

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
  "checklists-mantencion",
  "certificados-mantencion",
];

// Tipos con filtro de rango de fechas (todos menos "certificados" = vencimientos).
const TIPOS_CON_FECHA = new Set<ReporteTipo>([
  "mantenciones",
  "partes",
  "checklists",
  "checklists-mantencion",
  "certificados-mantencion",
]);

function fecha(iso: Date | null): string {
  return iso ? iso.toLocaleDateString("es-CL") : "—";
}

// Para campos @db.Date (medianoche UTC): formatear en UTC para no retroceder
// un día en Chile (UTC-4).
function fechaUTC(iso: Date | null): string {
  return iso ? iso.toLocaleDateString("es-CL", { timeZone: "UTC" }) : "—";
}

// Rango en hora de Chile (UTC-4) para campos DateTime con hora local
// (mant_mantenciones.fecha_inicio desde datetime-local, mant_checklists.fecha).
// Caveat DST: offset fijo -04:00 (1h de desfase en verano chileno).
function rangoLocal(desde: string, hasta: string): { gte: Date; lte: Date } | null {
  if (!desde || !hasta) return null;
  const gte = new Date(`${desde}T00:00:00-04:00`);
  const lte = new Date(`${hasta}T23:59:59.999-04:00`);
  if (Number.isNaN(gte.getTime()) || Number.isNaN(lte.getTime())) return null;
  if (lte < gte) return null;
  return { gte, lte };
}

// Rango en UTC para campos @db.Date, guardados como medianoche UTC
// (mant_partes_diarios.fecha, mant_checklists_mantencion.fecha,
// mant_certificados_mantencion.fecha). Un borde -04:00 los excluiría el día inicial.
function rangoUTC(desde: string, hasta: string): { gte: Date; lte: Date } | null {
  if (!desde || !hasta) return null;
  const gte = new Date(`${desde}T00:00:00.000Z`);
  const lte = new Date(`${hasta}T23:59:59.999Z`);
  if (Number.isNaN(gte.getTime()) || Number.isNaN(lte.getTime())) return null;
  if (lte < gte) return null;
  return { gte, lte };
}

const RANGO_INVALIDO =
  "Rango de fechas inválido: 'hasta' no puede ser anterior a 'desde'.";

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

  // Fix A: rango obligatorio para los tipos con fecha. Antes se ignoraba en
  // silencio si faltaba un extremo y se devolvía la tabla completa.
  if (TIPOS_CON_FECHA.has(filtros.tipo) && (!filtros.desde || !filtros.hasta)) {
    return { error: "Selecciona el rango de fechas (desde y hasta)." };
  }

  const equipoFilter = filtros.equipoId ? { equipo_id: filtros.equipoId } : {};

  // ── Mantenciones ──────────────────────────────────────────
  if (filtros.tipo === "mantenciones") {
    const r = rangoLocal(filtros.desde, filtros.hasta);
    if (!r) return { error: RANGO_INVALIDO };
    const rows = await prisma.mantMantencion.findMany({
      where: {
        deleted_at: null,
        ...equipoFilter,
        fecha_inicio: { gte: r.gte, lte: r.lte },
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
    const r = rangoUTC(filtros.desde, filtros.hasta);
    if (!r) return { error: RANGO_INVALIDO };
    const rows = await prisma.mantParteDiario.findMany({
      where: {
        deleted_at: null,
        ...equipoFilter,
        fecha: { gte: r.gte, lte: r.lte },
      },
      orderBy: { fecha: "asc" },
      select: {
        fecha: true,
        // horometro (ingreso) y horometro_fin (salida) son las columnas que el
        // flujo actual escribe. horometro_inicio quedó del modelo viejo de parte
        // diario y nunca se llena: leerla dejaba la columna siempre vacía.
        horometro: true,
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
        hrInicio: p.horometro != null ? Number(p.horometro) : null,
        hrFin: p.horometro_fin != null ? Number(p.horometro_fin) : null,
        combustible:
          p.combustible_litros != null ? Number(p.combustible_litros) : null,
        estado: p.estado,
      })),
    };
  }

  // ── Checklists de mantención (83 ítems, Taller) ───────────
  if (filtros.tipo === "checklists-mantencion") {
    const r = rangoUTC(filtros.desde, filtros.hasta);
    if (!r) return { error: RANGO_INVALIDO };
    const rows = await prisma.mantChecklistMantencion.findMany({
      where: {
        deleted_at: null,
        anulado_at: null,
        ...equipoFilter,
        fecha: { gte: r.gte, lte: r.lte },
      },
      orderBy: { fecha: "asc" },
      select: {
        correlativo: true,
        fecha: true,
        tipo_mantencion: true,
        equipo: { select: { codigo: true, nombre: true } },
        responsable: { select: { nombre: true } },
      },
    });
    return {
      columnas: [
        { key: "correlativo", label: "N°" },
        { key: "fecha", label: "Fecha" },
        { key: "equipo", label: "Equipo" },
        { key: "tipo", label: "Tipo mantención" },
        { key: "responsable", label: "Encargado" },
      ],
      filas: rows.map((c) => ({
        correlativo: c.correlativo,
        fecha: fechaUTC(c.fecha),
        equipo: c.equipo ? `${c.equipo.codigo} · ${c.equipo.nombre}` : "—",
        tipo: c.tipo_mantencion,
        responsable: c.responsable?.nombre ?? "—",
      })),
    };
  }

  // ── Certificados de mantención (documento firmado) ────────
  if (filtros.tipo === "certificados-mantencion") {
    const r = rangoUTC(filtros.desde, filtros.hasta);
    if (!r) return { error: RANGO_INVALIDO };
    const rows = await prisma.mantCertificadoMantencion.findMany({
      where: {
        deleted_at: null,
        anulado_at: null,
        ...equipoFilter,
        fecha: { gte: r.gte, lte: r.lte },
      },
      orderBy: { fecha: "asc" },
      select: {
        correlativo: true,
        fecha: true,
        ciudad: true,
        equipo: { select: { codigo: true, nombre: true } },
        responsable: { select: { nombre: true } },
        gerente: { select: { nombre: true } },
      },
    });
    return {
      columnas: [
        { key: "correlativo", label: "N°" },
        { key: "fecha", label: "Fecha" },
        { key: "equipo", label: "Equipo" },
        { key: "ciudad", label: "Ciudad" },
        { key: "encargado", label: "Encargado" },
        { key: "gerente", label: "Gerente" },
      ],
      filas: rows.map((c) => ({
        correlativo: c.correlativo,
        fecha: fechaUTC(c.fecha),
        equipo: c.equipo ? `${c.equipo.codigo} · ${c.equipo.nombre}` : "—",
        ciudad: c.ciudad,
        encargado: c.responsable?.nombre ?? "—",
        gerente: c.gerente?.nombre ?? "—",
      })),
    };
  }

  // ── Checklists (Operación) ────────────────────────────────
  const r = rangoLocal(filtros.desde, filtros.hasta);
  if (!r) return { error: RANGO_INVALIDO };
  const rows = await prisma.mantChecklist.findMany({
    where: {
      deleted_at: null,
      anulado_at: null,
      ...equipoFilter,
      fecha: { gte: r.gte, lte: r.lte },
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
