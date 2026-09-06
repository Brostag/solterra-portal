export const dynamic = "force-dynamic";

import React from "react";
import { NextRequest, NextResponse } from "next/server";
import { renderToBuffer } from "@react-pdf/renderer";
import { getSession } from "@/lib/auth/session";
import { canAccessModule } from "@/lib/modules";
import { prisma } from "@/lib/prisma";
import { getParteDetalle } from "@/lib/terreno/queries";
import { downloadImageForPdf } from "@/lib/supabase/storage";
import {
  RegistroDocument,
  type RegistroPDFData,
  type RegistroFotoPDF,
} from "@/lib/pdf/mantencion/registro-template";

// Formatos que @react-pdf puede embeber. WEBP no está soportado: esas fotos se
// muestran en el anexo con una nota en vez de romper la generación del PDF.
const PDF_EMBED_MIME = new Set(["image/jpeg", "image/png"]);

// La extensión en Storage la fija el endpoint de subida desde el MIME ya
// verificado por magic bytes, así que es una fuente confiable cuando la
// descarga devuelve un Content-Type genérico (octet-stream).
function mimeDesdeRuta(path: string): string | null {
  const ext = path.split("?")[0].split(".").pop()?.toLowerCase();
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  return null;
}

// Best-effort por foto: una imagen caída o en formato no embebible se anota en
// el anexo, nunca bloquea la generación del documento.
async function embeberFoto(path: string, etiqueta: string): Promise<RegistroFotoPDF> {
  try {
    const { buffer, contentType } = await downloadImageForPdf(path);
    const mime = PDF_EMBED_MIME.has(contentType) ? contentType : mimeDesdeRuta(path);
    if (!mime || !PDF_EMBED_MIME.has(mime)) {
      return {
        src: null,
        etiqueta,
        nota: "Formato no compatible con PDF — disponible en el portal",
      };
    }
    return { src: `data:${mime};base64,${buffer.toString("base64")}`, etiqueta, nota: null };
  } catch {
    return { src: null, etiqueta, nota: "Imagen no disponible" };
  }
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session || !canAccessModule(session, "MANTENCION")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await params;
  const p = await getParteDetalle(id);
  if (!p) {
    return NextResponse.json({ error: "Registro no encontrado" }, { status: 404 });
  }

  const equipo = await prisma.mantEquipo.findUnique({
    where: { id: p.equipo_id },
    select: { tipo: true, patente: true },
  });

  // Anexo fotográfico. Las fotos de "tablero" ya no se usan en la UI nueva pero
  // los registros antiguos las tienen: se muestran dentro del grupo de ingreso
  // con su propia etiqueta para no perderlas. Descargas en paralelo (máximo 6
  // por grupo según el endpoint de subida).
  const [fotosIngreso, fotosSalida] = await Promise.all([
    Promise.all([
      ...p.fotos_entrada.map((path, i) => embeberFoto(path, `Ingreso ${i + 1}`)),
      ...p.fotos_tablero.map((path, i) => embeberFoto(path, `Tablero ${i + 1}`)),
    ]),
    Promise.all(p.fotos_salida.map((path, i) => embeberFoto(path, `Salida ${i + 1}`))),
  ]);

  const data: RegistroPDFData = {
    responsable: p.operador,
    tipoEquipo: equipo?.tipo ?? p.equipo,
    patente: equipo?.patente ?? p.equipoCodigo,
    odometro: p.odometro,
    horometro: p.horometro,
    areaUso: p.area_uso,
    centroCosto: p.centro_costo,
    tipoMantencion: p.tipo_mantencion,
    combustible: p.combustible_fraccion,
    fechaIngreso: p.fecha,
    fechaSalida: p.fecha_salida,
    nombreResponsable: p.nombre_responsable,
    rutResponsable: p.rut_responsable,
    nombreReceptor: p.nombre_receptor,
    rutReceptor: p.rut_receptor,
    componentes: p.componentes,
    observaciones: p.observaciones,
    fotos: { ingreso: fotosIngreso, salida: fotosSalida },
  };

  let buffer: Buffer;
  try {
    const element = React.createElement(RegistroDocument, {
      data,
    }) as React.ReactElement;
    buffer = await renderToBuffer(element);
  } catch (err) {
    console.error(
      "[registro-pdf] Error generando PDF:",
      err instanceof Error ? err.message : String(err),
    );
    return NextResponse.json({ error: "Error al generar el PDF" }, { status: 500 });
  }

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="registro-${id.slice(0, 8)}.pdf"`,
      "Cache-Control": "no-store",
    },
  });
}
