export const dynamic = "force-dynamic";

import React from "react";
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { getCompanySettings } from "@/lib/company-settings";
import { prisma } from "@/lib/prisma";
import { calcularCotizacion, type CotizadorInput } from "@/lib/cotizador";
import { CotizadorDocument } from "@/lib/pdf/cotizador-template";

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
});

const inputSchema = z.object({
  items:               z.array(itemSchema).min(1).max(50),
  gastos:              gastosSchema,
  porcentajeDescuento: z.number().min(0).max(100),
  ivaPorcentaje:       z.number().min(0).max(100),
  clienteId:           z.string().min(1).max(100).nullish(),
  // N° de cotización mostrado en el encabezado del PDF (solo presentación:
  // no se persiste desde aquí; la cotización formal valida el suyo aparte).
  numero:              z.string().trim().max(30).nullish(),
  // Validez del presupuesto en días (solo presentación en la vista previa).
  validezDias:         z.number().int().min(1).max(365).nullish(),
});

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let parsed: z.infer<typeof inputSchema>;
  try {
    parsed = inputSchema.parse(await req.json());
  } catch {
    return NextResponse.json({ error: "Datos inválidos" }, { status: 400 });
  }

  const input: CotizadorInput = {
    items:               parsed.items,
    gastos:              parsed.gastos,
    porcentajeDescuento: parsed.porcentajeDescuento,
    ivaPorcentaje:       parsed.ivaPorcentaje,
  };
  const result = calcularCotizacion(input);

  // El receptor se resuelve en el servidor desde la DB usando solo el id (el id
  // es de una COMPANY/Empresa): nunca se confía en datos enviados por el navegador.
  const [empresa, config] = await Promise.all([
    parsed.clienteId
      ? prisma.company.findUnique({
          where:  { id: parsed.clienteId },
          select: {
            nombre_razon_social: true, rut: true, giro: true,
            email: true, telefono: true, direccion: true,
            comuna: true, ciudad: true, region: true,
            representante_legal: true, correo_notificaciones: true,
          },
        })
      : Promise.resolve(null),
    getCompanySettings(),
  ]);

  // Mapeo Company → datos del receptor del presupuesto (todo desde Company).
  const cliente = empresa
    ? {
        nombre: empresa.nombre_razon_social,
        rut: empresa.rut,
        giro: empresa.giro,
        direccion:
          [empresa.direccion, empresa.comuna, empresa.ciudad, empresa.region]
            .filter((v) => v && v.trim() !== "")
            .join(", ") || null,
        email: empresa.email ?? empresa.correo_notificaciones,
        telefono: empresa.telefono,
        representante_legal: empresa.representante_legal,
      }
    : null;

  let buffer: Buffer;
  try {
    const element = React.createElement(CotizadorDocument, {
      data: {
        input,
        result,
        fecha: new Date(),
        cliente,
        numero: parsed.numero ?? undefined,
        validezDias: parsed.validezDias ?? undefined,
        company: {
          razon_social: config?.razon_social ?? "Solterra",
          rut:          config?.rut ?? "—",
          giro:         config?.giro ?? null,
          direccion:    config?.direccion ?? null,
          email:        config?.email ?? null,
          telefono:     config?.telefono ?? null,
        },
      },
    }) as React.ReactElement;
    buffer = await renderToBuffer(element);
  } catch (err) {
    console.error("[cotizador-pdf] Error generando PDF:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Error al generar el PDF" }, { status: 500 });
  }

  const yyyymmdd = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return new NextResponse(buffer, {
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="presupuesto-arriendo-solterra-${yyyymmdd}.pdf"`,
      "Cache-Control":       "no-store",
    },
  });
}
