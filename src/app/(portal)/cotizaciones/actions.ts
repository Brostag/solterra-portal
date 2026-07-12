"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth/session";
import { requireModule } from "@/lib/modules";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { calcularCotizacion, type CotizadorInput } from "@/lib/cotizador";
import { anioCorto, buildDefaultQuotationNumber, parseQuotationNumber } from "@/lib/quotations";

const gastosSchema = z
  .array(
    z.object({
      id:    z.string().max(40),
      label: z.string().trim().min(1).max(60),
      monto: z.number().min(0),
    })
  )
  .max(30);

const itemSchema = z.object({
  id:                  z.string().min(1).max(100),
  equipo:              z.string().max(200).default(""),
  tipo:                z.enum(["horas", "dias"]),
  valorHora:           z.number().min(0).max(1_000_000_000),
  horasMinimasDiarias: z.number().int().min(0).max(24),
  cantidadHoras:       z.number().min(0).max(100_000),
  cantidadDias:        z.number().min(0).max(10_000),
  fecha_desde:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
  fecha_hasta:         z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullish(),
});

/**
 * "YYYY-MM-DD" → Date a medianoche UTC, para columnas @db.Date (evita el
 * off-by-one del repo: NUNCA new Date("YYYY-MM-DD")). null/undefined → null.
 */
function fechaDateUTC(s: string | null | undefined): Date | null {
  if (!s) return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  return new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
}

const createSchema = z.object({
  numero:              z.string().trim().max(60).optional().nullable(),
  clienteId:           z.string().min(1).max(100).optional().nullable(),
  items:               z.array(itemSchema).min(1, "Agrega al menos un equipo o servicio.").max(50),
  gastos:              gastosSchema,
  porcentajeDescuento: z.number().min(0).max(100),
  ivaPorcentaje:       z.number().min(0).max(100),
  validez_dias:        z.number().int().min(1).max(365).nullish(),
  observaciones:       z.string().trim().max(2000).optional().nullable(),
  condiciones:         z.string().trim().max(2000).optional().nullable(),
});

export type CreateQuotationInput = z.infer<typeof createSchema>;

const updateSchema = createSchema.extend({
  id: z.string().min(1).max(100),
});

export type UpdateQuotationInput = z.infer<typeof updateSchema>;

/**
 * Número por defecto sugerido (NNN R0/YYY del año actual). Best-effort: parsea
 * los números existentes del año y toma el máximo correlativo + 1. El campo es
 * editable en el formulario, así que esto es solo la sugerencia inicial.
 */
export async function getNextQuotationNumber(): Promise<string> {
  const session = await getSession();
  if (!session) redirect("/login");
  requireModule(session, "COMERCIAL");

  const year = new Date().getFullYear();
  const yShort = year % 1000;
  // Solo números que contengan el sufijo del año actual ("/026"): el correlativo
  // reinicia por año y parseQuotationNumber igual descarta cualquier otro formato.
  // Evita traer toda la tabla para filtrar en memoria.
  const existentes = await prisma.quotation.findMany({
    where: { numero: { contains: `/${anioCorto(year)}` } },
    select: { numero: true },
  });
  let max = 0;
  for (const q of existentes) {
    const parsed = parseQuotationNumber(q.numero);
    if (parsed && parsed.anioCorto === yShort && parsed.correlativo > max) {
      max = parsed.correlativo;
    }
  }
  return buildDefaultQuotationNumber(year, max);
}

export async function createQuotation(rawData: CreateQuotationInput): Promise<{ id: string }> {
  const session = await getSession();
  if (!session) redirect("/login");
  requireModule(session, "COMERCIAL");
  if (session.rol !== "ADMINISTRADOR" && session.rol !== "SUPERVISOR") {
    throw new Error("Sin permisos para crear cotizaciones.");
  }

  const data = createSchema.parse(rawData);

  // Receptor: se resuelve SIEMPRE desde la DB con el id (Company). Nunca se
  // confía en datos del navegador. Los valores quedan congelados en snapshot.
  const empresa = data.clienteId
    ? await prisma.company.findUnique({
        where: { id: data.clienteId },
        select: {
          id: true, nombre_razon_social: true, rut: true, giro: true,
          email: true, telefono: true, direccion: true,
          comuna: true, ciudad: true, region: true, correo_notificaciones: true,
        },
      })
    : null;

  const direccionSnapshot = empresa
    ? [empresa.direccion, empresa.comuna, empresa.ciudad, empresa.region]
        .filter((v) => v && v.trim() !== "")
        .join(", ") || null
    : null;

  // Re-ejecuta el cálculo server-side (fuente de verdad de los montos).
  const input: CotizadorInput = {
    items: data.items,
    gastos: data.gastos,
    porcentajeDescuento: data.porcentajeDescuento,
    ivaPorcentaje: data.ivaPorcentaje,
  };
  const result = calcularCotizacion(input);

  const numero = data.numero?.trim() ? data.numero.trim() : await getNextQuotationNumber();

  let created: { id: string };
  try {
    created = await prisma.quotation.create({
      data: {
        numero,
        company_id: empresa?.id ?? null,
        cliente_nombre_snapshot:    empresa?.nombre_razon_social ?? null,
        cliente_rut_snapshot:       empresa?.rut ?? null,
        cliente_giro_snapshot:      empresa?.giro ?? null,
        cliente_email_snapshot:     empresa?.email ?? empresa?.correo_notificaciones ?? null,
        cliente_telefono_snapshot:  empresa?.telefono ?? null,
        cliente_direccion_snapshot: direccionSnapshot,
        moneda: "CLP",
        iva_porcentaje: data.ivaPorcentaje,
        descuento_porcentaje: data.porcentajeDescuento,
        gastos: data.gastos as unknown as Prisma.InputJsonValue,
        subtotal: result.subtotal,
        descuento_monto: result.descuentoMonto,
        neto: result.neto,
        iva_monto: result.iva,
        total: result.total,
        estado: "BORRADOR",
        validez_dias: data.validez_dias ?? null,
        observaciones: data.observaciones || null,
        condiciones: data.condiciones || null,
        user_id: session.id,
        items: {
          create: data.items.map((it, idx) => ({
            orden: idx + 1,
            descripcion: it.equipo.trim() || "Equipo o servicio no especificado",
            tipo: it.tipo,
            valor_hora: it.valorHora,
            horas_minimas_diarias: it.horasMinimasDiarias,
            cantidad_horas: it.cantidadHoras,
            cantidad_dias: it.cantidadDias,
            fecha_desde: fechaDateUTC(it.fecha_desde),
            fecha_hasta: fechaDateUTC(it.fecha_hasta),
            subtotal: result.items[idx]?.subtotal ?? 0,
          })),
        },
      },
      select: { id: true },
    });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new Error(`El número de cotización "${numero}" ya existe. Usa otro.`);
    }
    throw err;
  }

  await logAudit(
    session.id,
    "cotizacion_creada",
    "cotizaciones",
    `Nº ${numero} | Cliente: ${empresa?.nombre_razon_social ?? "—"} | Total: ${result.total}`
  );

  revalidatePath("/cotizaciones");
  return { id: created.id };
}

/** Transición BORRADOR → EMITIDA. Solo ADMIN/SUPERVISOR. */
export async function emitirCotizacion(id: string): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  requireModule(session, "COMERCIAL");
  if (session.rol !== "ADMINISTRADOR" && session.rol !== "SUPERVISOR") {
    throw new Error("Sin permisos para emitir la cotización.");
  }

  const cot = await prisma.quotation.findUnique({
    where: { id },
    select: { id: true, estado: true, numero: true },
  });
  if (!cot) throw new Error("La cotización no existe.");
  if (cot.estado !== "BORRADOR") {
    throw new Error("Solo una cotización en borrador puede emitirse.");
  }

  await prisma.quotation.update({ where: { id }, data: { estado: "EMITIDA" } });

  await logAudit(session.id, "cotizacion_emitida", "cotizaciones", `Nº ${cot.numero} emitida`);

  revalidatePath("/cotizaciones");
  revalidatePath(`/cotizaciones/${id}`);
}

/**
 * Edita una cotización EN BORRADOR. Mismo pipeline que create: re-resuelve la
 * empresa desde la DB, re-congela snapshots, re-ejecuta el cálculo server-side
 * y reemplaza los items. Solo BORRADOR (una emitida ya salió al cliente).
 */
export async function updateQuotation(rawData: UpdateQuotationInput): Promise<{ id: string }> {
  const session = await getSession();
  if (!session) redirect("/login");
  requireModule(session, "COMERCIAL");
  if (session.rol !== "ADMINISTRADOR" && session.rol !== "SUPERVISOR") {
    throw new Error("Sin permisos para editar cotizaciones.");
  }

  const data = updateSchema.parse(rawData);

  const existente = await prisma.quotation.findUnique({
    where: { id: data.id },
    select: { id: true, estado: true },
  });
  if (!existente) throw new Error("La cotización no existe.");
  if (existente.estado !== "BORRADOR") {
    throw new Error("Solo una cotización en borrador puede editarse.");
  }

  // Receptor: se re-resuelve SIEMPRE desde la DB con el id (Company). Nunca se
  // confía en datos del navegador. Los valores quedan congelados en snapshot.
  const empresa = data.clienteId
    ? await prisma.company.findUnique({
        where: { id: data.clienteId },
        select: {
          id: true, nombre_razon_social: true, rut: true, giro: true,
          email: true, telefono: true, direccion: true,
          comuna: true, ciudad: true, region: true, correo_notificaciones: true,
        },
      })
    : null;

  const direccionSnapshot = empresa
    ? [empresa.direccion, empresa.comuna, empresa.ciudad, empresa.region]
        .filter((v) => v && v.trim() !== "")
        .join(", ") || null
    : null;

  // Re-ejecuta el cálculo server-side (fuente de verdad de los montos).
  const input: CotizadorInput = {
    items: data.items,
    gastos: data.gastos,
    porcentajeDescuento: data.porcentajeDescuento,
    ivaPorcentaje: data.ivaPorcentaje,
  };
  const result = calcularCotizacion(input);

  // Número editable: si viene, trim y usar; si no, se conserva el existente
  // (getNextQuotationNumber NUNCA se invoca aquí — no se renumera al editar).
  const numero = data.numero?.trim() || undefined;

  try {
    await prisma.$transaction([
      prisma.quotation.update({
        where: { id: data.id },
        data: {
          ...(numero ? { numero } : {}),
          company_id: empresa?.id ?? null,
          cliente_nombre_snapshot:    empresa?.nombre_razon_social ?? null,
          cliente_rut_snapshot:       empresa?.rut ?? null,
          cliente_giro_snapshot:      empresa?.giro ?? null,
          cliente_email_snapshot:     empresa?.email ?? empresa?.correo_notificaciones ?? null,
          cliente_telefono_snapshot:  empresa?.telefono ?? null,
          cliente_direccion_snapshot: direccionSnapshot,
          moneda: "CLP",
          iva_porcentaje: data.ivaPorcentaje,
          descuento_porcentaje: data.porcentajeDescuento,
          gastos: data.gastos as unknown as Prisma.InputJsonValue,
          subtotal: result.subtotal,
          descuento_monto: result.descuentoMonto,
          neto: result.neto,
          iva_monto: result.iva,
          total: result.total,
          validez_dias: data.validez_dias ?? null,
          observaciones: data.observaciones || null,
          condiciones: data.condiciones || null,
        },
      }),
      prisma.quotationItem.deleteMany({ where: { quotation_id: data.id } }),
      prisma.quotationItem.createMany({
        data: data.items.map((it, idx) => ({
          quotation_id: data.id,
          orden: idx + 1,
          descripcion: it.equipo.trim() || "Equipo o servicio no especificado",
          tipo: it.tipo,
          valor_hora: it.valorHora,
          horas_minimas_diarias: it.horasMinimasDiarias,
          cantidad_horas: it.cantidadHoras,
          cantidad_dias: it.cantidadDias,
          fecha_desde: fechaDateUTC(it.fecha_desde),
          fecha_hasta: fechaDateUTC(it.fecha_hasta),
          subtotal: result.items[idx]?.subtotal ?? 0,
        })),
      }),
    ]);
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw new Error(`El número de cotización "${numero}" ya existe. Usa otro.`);
    }
    throw err;
  }

  await logAudit(
    session.id,
    "cotizacion_editada",
    "cotizaciones",
    `Nº ${numero ?? "(sin cambio)"} | Total: ${result.total}`
  );

  revalidatePath("/cotizaciones");
  revalidatePath(`/cotizaciones/${data.id}`);
  return { id: data.id };
}

/** Transición EMITIDA → ANULADA. Solo ADMIN/SUPERVISOR. Deja el registro. */
export async function anularCotizacion(id: string): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  requireModule(session, "COMERCIAL");
  if (session.rol !== "ADMINISTRADOR" && session.rol !== "SUPERVISOR") {
    throw new Error("Sin permisos para anular la cotización.");
  }

  const cot = await prisma.quotation.findUnique({
    where: { id },
    select: { id: true, estado: true, numero: true },
  });
  if (!cot) throw new Error("La cotización no existe.");
  if (cot.estado !== "EMITIDA") {
    throw new Error("Solo una cotización emitida puede anularse. Un borrador se elimina, no se anula.");
  }

  await prisma.quotation.update({ where: { id }, data: { estado: "ANULADA" } });

  await logAudit(session.id, "cotizacion_anulada", "cotizaciones", `Nº ${cot.numero} anulada`);

  revalidatePath("/cotizaciones");
  revalidatePath(`/cotizaciones/${id}`);
}

/**
 * Elimina una cotización. Solo BORRADOR o ANULADA (una emitida se anula, no se
 * borra: queda el registro). Los items caen por onDelete: Cascade.
 * El correlativo NO se renumera: eliminar deja un hueco histórico.
 */
export async function deleteQuotation(id: string): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/login");
  requireModule(session, "COMERCIAL");
  if (session.rol !== "ADMINISTRADOR" && session.rol !== "SUPERVISOR") {
    throw new Error("Sin permisos para eliminar la cotización.");
  }

  const cot = await prisma.quotation.findUnique({
    where: { id },
    select: { id: true, estado: true, numero: true, total: true },
  });
  if (!cot) throw new Error("La cotización no existe.");
  if (cot.estado === "EMITIDA") {
    throw new Error("Una cotización emitida no se elimina: anúlala primero.");
  }

  await prisma.quotation.delete({ where: { id } });

  await logAudit(
    session.id,
    "cotizacion_eliminada",
    "cotizaciones",
    `Nº ${cot.numero} | Estado previo: ${cot.estado} | Total: ${Number(cot.total)}`
  );

  revalidatePath("/cotizaciones");
}

/** Datos de una cotización para auto-rellenar el contrato al asociarla. */
export interface QuotationForContract {
  numero:         string;
  companyId:      string | null;
  clienteNombre:  string | null;
  fechaInicio:    string | null;
  fechaTermino:   string | null;
  items:          { descripcion: string; valorHora: number; horasMinimasDiarias: number }[];
}

/**
 * Lectura para el auto-relleno del contrato desde una cotización. Gate ligero:
 * sesión + módulo COMERCIAL (sin gate de rol — es solo lectura). Devuelve un
 * objeto plano serializable. fechaInicio = mínima fecha_desde de los ítems,
 * fechaTermino = máxima fecha_hasta ("YYYY-MM-DD" leído en UTC); null si ningún
 * ítem tiene fechas. Decimal → Number.
 */
export async function getQuotationForContract(id: string): Promise<QuotationForContract | null> {
  const session = await getSession();
  if (!session) redirect("/login");
  requireModule(session, "COMERCIAL");

  const cot = await prisma.quotation.findUnique({
    where: { id },
    select: {
      numero: true,
      company_id: true,
      cliente_nombre_snapshot: true,
      items: {
        orderBy: { orden: "asc" },
        select: {
          descripcion: true,
          valor_hora: true,
          horas_minimas_diarias: true,
          fecha_desde: true,
          fecha_hasta: true,
        },
      },
    },
  });
  if (!cot) return null;

  // Columnas @db.Date: se leen en UTC (toISOString().slice(0,10)) para evitar el
  // off-by-one. Mín/máx por comparación lexicográfica de "YYYY-MM-DD" (equivale
  // al orden cronológico en ese formato).
  let fechaInicio: string | null = null;
  let fechaTermino: string | null = null;
  for (const it of cot.items) {
    if (it.fecha_desde) {
      const d = it.fecha_desde.toISOString().slice(0, 10);
      if (fechaInicio === null || d < fechaInicio) fechaInicio = d;
    }
    if (it.fecha_hasta) {
      const h = it.fecha_hasta.toISOString().slice(0, 10);
      if (fechaTermino === null || h > fechaTermino) fechaTermino = h;
    }
  }

  return {
    numero: cot.numero,
    companyId: cot.company_id,
    clienteNombre: cot.cliente_nombre_snapshot,
    fechaInicio,
    fechaTermino,
    items: cot.items.map((it) => ({
      descripcion: it.descripcion,
      valorHora: Number(it.valor_hora),
      horasMinimasDiarias: it.horas_minimas_diarias,
    })),
  };
}
