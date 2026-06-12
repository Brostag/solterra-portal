export const dynamic = "force-dynamic";

import React from "react";
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { ContractDocument, type ContractPDFData, type ContractEquipoFotosPDF } from "@/lib/pdf/contract-template";
import { formatContractDisplayNumber, formatContractCorrelativo } from "@/lib/contracts";
import { downloadImageForPdf } from "@/lib/supabase/storage";

const TIPO_FOTO_LABELS: Record<string, string> = {
  FRONTAL:           "Frontal",
  LATERAL_DERECHO:   "Lateral derecho",
  LATERAL_IZQUIERDO: "Lateral izquierdo",
  TRASERA:           "Trasera",
  CABINA:            "Cabina",
  HOROMETRO:         "Horómetro",
  RODADO:            "Rodado",
  DANIOS:            "Daños",
  OTRO:              "Otro",
};

// Formatos que @react-pdf puede embeber. WEBP no está soportado: esas fotos se
// referencian en el anexo con una nota en vez de romper la generación del PDF.
const PDF_EMBED_MIME = new Set(["image/jpeg", "image/png"]);

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const contrato = await prisma.contract.findUnique({
    where: { id },
    include: {
      client: true,
      equipos: {
        orderBy: { orden: "asc" },
        include: { photos: { orderBy: { created_at: "asc" } } },
      },
    },
  });
  if (!contrato) {
    return NextResponse.json({ error: "Contrato no encontrado" }, { status: 404 });
  }

  // Anexo fotográfico: descargar las fotos del bucket y embeberlas como data
  // URI. Best-effort por foto — una imagen caída o en formato no soportado se
  // anota en el PDF, nunca bloquea la generación del documento.
  const fotosEquipos: ContractEquipoFotosPDF[] = await Promise.all(
    contrato.equipos.map(async (eq) => ({
      descripcion: eq.descripcion,
      fotos: await Promise.all(
        eq.photos.map(async (p) => {
          const base = {
            tipo_label: TIPO_FOTO_LABELS[p.tipo] ?? p.tipo,
            fecha: p.created_at,
            observacion: p.observacion,
          };
          try {
            const { buffer, contentType } = await downloadImageForPdf(p.storage_path);
            const mime = PDF_EMBED_MIME.has(contentType) ? contentType : p.mime_type;
            if (!PDF_EMBED_MIME.has(mime)) {
              return { ...base, src: null, nota: "Formato no compatible con PDF — disponible en el portal" };
            }
            return { ...base, src: `data:${mime};base64,${buffer.toString("base64")}`, nota: null };
          } catch {
            return { ...base, src: null, nota: "Imagen no disponible" };
          }
        }),
      ),
    })),
  );

  // Número visible legal (NNN/YYYY) y etiqueta de anexo (NNN-A). Los CTR-XXXX
  // antiguos se mapean con el año de fecha_emision; los nuevos ya vienen así.
  const numeroVisible = formatContractDisplayNumber(contrato.numero_contrato, contrato.fecha_emision);
  const anexoLabel = `${formatContractCorrelativo(contrato.numero_contrato, contrato.fecha_emision)}-A`;

  const data: ContractPDFData = {
    numero_contrato: numeroVisible,
    anexo_label: anexoLabel,
    ciudad_celebracion: contrato.ciudad_celebracion,
    fecha: contrato.fecha_emision,
    vigencia_contrato: contrato.vigencia_contrato,
    cliente: {
      nombre:    contrato.cliente_nombre_snapshot    ?? contrato.client.nombre,
      rut:       contrato.cliente_rut_snapshot       ?? contrato.client.rut,
      direccion: contrato.cliente_direccion_snapshot ?? contrato.client.direccion,
      email:     contrato.cliente_email_snapshot     ?? contrato.client.email,
    },
    representante_cliente: contrato.representante_cliente,
    rut_representante: contrato.rut_representante,
    numero_anexo: contrato.numero_anexo,
    fecha_anexo: contrato.fecha_anexo,
    numero_cotizacion: contrato.numero_cotizacion,
    lugar_operacion: contrato.lugar_operacion,
    forma_pago: contrato.forma_pago,
    correo_notificaciones: contrato.correo_notificaciones,
    moneda: contrato.moneda,
    equipos: contrato.equipos.map((eq) => ({
      descripcion: eq.descripcion,
      marca: eq.marca,
      modelo: eq.modelo,
      patente: eq.patente,
      anio: eq.anio,
      chasis: eq.chasis,
      motor: eq.motor,
      color: eq.color,
      horometro_inicial: eq.horometro_inicial,
      mantenimiento_horas: eq.mantenimiento_horas,
      valor_hora: Number(eq.valor_hora),
      horas_minimas_mensuales: eq.horas_minimas_mensuales,
      tarifa_hora_extra: eq.tarifa_hora_extra != null ? Number(eq.tarifa_hora_extra) : null,
      valor_mensual_estimado: eq.valor_mensual_estimado != null ? Number(eq.valor_mensual_estimado) : null,
    })),
    fotos_equipos: fotosEquipos,
  };

  let buffer: Buffer;
  try {
    const element = React.createElement(ContractDocument, { data }) as React.ReactElement;
    buffer = await renderToBuffer(element);
  } catch (err) {
    console.error("[contrato-pdf] Error generando PDF:", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Error al generar el PDF" }, { status: 500 });
  }

  const safeNum = numeroVisible.replace(/\//g, "-").replace(/[^a-zA-Z0-9-]/g, "");
  return new NextResponse(buffer, {
    headers: {
      "Content-Type":        "application/pdf",
      "Content-Disposition": `attachment; filename="contrato-arrendamiento-solterra-${safeNum}.pdf"`,
      "Cache-Control":       "no-store",
    },
  });
}
