"use server";

import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { getSession } from "@/lib/auth/session";
import { logAudit } from "@/lib/audit";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { calcularCotizacion, type CotizadorInput, type GastosGenerales } from "@/lib/cotizador";
import { anioCorto, buildDefaultQuotationNumber, parseQuotationNumber } from "@/lib/quotations";

const gastosSchema = z.object({
  combustible: z.number().min(0).default(0),
  operador:    z.number().min(0).default(0),
  traslado:    z.number().min(0).default(0),
  peajes:      z.number().min(0).default(0),
  viaticos:    z.number().min(0).default(0),
  alojamiento: z.number().min(0).default(0),
  mantencion:  z.number().min(0).default(0),
  seguro:      z.number().min(0).default(0),
  otros:       z.number().min(0).default(0),
});

const itemSchema = z.object({
  id:                  z.string().min(1).max(100),
  equipo:              z.string().max(200).default(""),
  tipo:                z.enum(["horas", "dias"]),
  valorHora:           z.number().min(0).max(1_000_000_000),
  horasMinimasDiarias: z.number().int().min(0).max(24),
  cantidadHoras:       z.number().min(0).max(100_000),
  cantidadDias:        z.number().min(0).max(10_000),
});

const createSchema = z.object({
  numero:              z.string().trim().max(60).optional().nullable(),
  clienteId:           z.string().min(1).max(100).optional().nullable(),
  items:               z.array(itemSchema).min(1, "Agrega al menos un equipo o servicio.").max(50),
  gastos:              gastosSchema,
  porcentajeDescuento: z.number().min(0).max(100),
  ivaPorcentaje:       z.number().min(0).max(100),
  observaciones:       z.string().trim().max(2000).optional().nullable(),
  condiciones:         z.string().trim().max(2000).optional().nullable(),
});

export type CreateQuotationInput = z.infer<typeof createSchema>;

/**
 * Número por defecto sugerido (NNN R0/YYY del año actual). Best-effort: parsea
 * los números existentes del año y toma el máximo correlativo + 1. El campo es
 * editable en el formulario, así que esto es solo la sugerencia inicial.
 */
export async function getNextQuotationNumber(): Promise<string> {
  const session = await getSession();
  if (!session) redirect("/login");

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
