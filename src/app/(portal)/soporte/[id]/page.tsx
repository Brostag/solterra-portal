import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ImageOff, ExternalLink } from "lucide-react";
import { getSignedUrls } from "@/lib/supabase/storage";
import { requireSoporte } from "../guard";
import {
  ESTADOS, ESTADO_COLORS, TIPO_COLORS, TIPO_COLOR_FALLBACK, MODULO_LABELS,
  fmtFechaHora, formatTamano,
  type EstadoReporte,
} from "../vocabulario";
import AccionesSoporte from "./AccionesSoporte";

interface Props {
  params: Promise<{ id: string }>;
}

function Dato({ etiqueta, valor, mono }: { etiqueta: string; valor: string | null; mono?: boolean }) {
  return (
    <div>
      <dt className="text-xs text-gray-400 uppercase tracking-wide">{etiqueta}</dt>
      <dd
        className={`text-gray-800 break-words ${mono ? "font-mono text-xs" : "text-sm"}`}
      >
        {valor && valor.trim() ? valor : "—"}
      </dd>
    </div>
  );
}

export default async function ReporteSoportePage({ params }: Props) {
  await requireSoporte();

  const { id } = await params;

  const reporte = await prisma.feedbackReport.findUnique({
    where: { id },
    select: {
      id: true,
      correlativo: true,
      anio: true,
      tipo: true,
      mensaje: true,
      ruta: true,
      modulo: true,
      user_agent: true,
      viewport: true,
      estado: true,
      nota_interna: true,
      resuelto_at: true,
      created_at: true,
      autor: { select: { nombre: true, email: true, rol: true } },
      resuelto_por: { select: { nombre: true } },
      adjuntos: {
        // La captura anotada primero: es lo que explica el reporte de un vistazo.
        orderBy: [{ es_captura: "desc" }, { created_at: "asc" }],
        select: {
          id: true,
          storage_path: true,
          mime: true,
          tamano: true,
          es_captura: true,
        },
      },
    },
  });

  if (!reporte) notFound();

  // Las imágenes viven en el bucket privado: se sirven por URL firmada de 1 hora.
  // Si Storage falla, el reporte igual se muestra; solo se avisa de las imágenes.
  let urls: Record<string, string> = {};
  let errorStorage = false;
  if (reporte.adjuntos.length > 0) {
    try {
      urls = await getSignedUrls(reporte.adjuntos.map((a) => a.storage_path), 3600);
    } catch {
      errorStorage = true;
    }
  }

  const estadoClass =
    ESTADO_COLORS[reporte.estado as EstadoReporte] ?? TIPO_COLOR_FALLBACK;

  return (
    <div className="max-w-5xl space-y-6">
      {/* Encabezado */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/soporte">
            <Button variant="ghost" size="sm" className="flex-shrink-0">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl font-bold text-[#253158]">
              Reporte N° {reporte.correlativo}/{reporte.anio}
            </h1>
            <p className="text-gray-500 text-sm">
              Enviado el {fmtFechaHora(reporte.created_at)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 pl-10 sm:pl-0">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${TIPO_COLORS[reporte.tipo] ?? TIPO_COLOR_FALLBACK}`}>
            {reporte.tipo}
          </span>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-md ${estadoClass}`}>
            {reporte.estado.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna principal: mensaje + imágenes */}
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h2 className="font-semibold text-[#253158]">Mensaje</h2>
            <p className="text-sm text-gray-800 whitespace-pre-wrap break-words">
              {reporte.mensaje}
            </p>
          </section>

          <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-[#253158]">Imágenes</h2>
              <span className="text-xs text-gray-400">
                {reporte.adjuntos.length} archivo{reporte.adjuntos.length !== 1 ? "s" : ""}
              </span>
            </div>

            {errorStorage && (
              <p className="text-sm text-[#c6352e]">
                No se pudieron generar los enlaces de las imágenes. Recarga la página.
              </p>
            )}

            {reporte.adjuntos.length === 0 ? (
              <p className="text-sm text-gray-400">El reporte no trae imágenes adjuntas.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {reporte.adjuntos.map((a) => {
                  const url = urls[a.storage_path] ?? "";
                  return (
                    <figure
                      key={a.id}
                      className="rounded-lg border border-gray-200 overflow-hidden bg-gray-50"
                    >
                      <div className="aspect-video bg-gray-100 flex items-center justify-center overflow-hidden">
                        {url ? (
                          // Imagen privada de Supabase Storage vía URL firmada.
                          // <img> nativo: next.config.ts tiene images.unoptimized.
                          <img
                            src={url}
                            alt={
                              a.es_captura
                                ? "Captura de pantalla anotada por el usuario"
                                : "Imagen adjunta al reporte"
                            }
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <ImageOff className="h-6 w-6 text-gray-300" />
                        )}
                      </div>
                      <figcaption className="px-3 py-2 flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold text-[#253158]">
                            {a.es_captura ? "Captura anotada" : "Adjunto"}
                          </p>
                          <p className="text-[10px] text-gray-400">
                            {a.mime} · {formatTamano(a.tamano)}
                          </p>
                        </div>
                        {url && (
                          <a
                            href={url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-[#253158] hover:underline flex-shrink-0"
                          >
                            Ver completa
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        )}
                      </figcaption>
                    </figure>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        {/* Columna lateral: contexto + gestión */}
        <div className="space-y-6">
          <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h2 className="font-semibold text-[#253158]">Quién reportó</h2>
            <dl className="space-y-2">
              <Dato etiqueta="Nombre" valor={reporte.autor.nombre} />
              <Dato etiqueta="Correo" valor={reporte.autor.email} />
              <Dato etiqueta="Rol" valor={reporte.autor.rol} />
            </dl>
          </section>

          <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
            <h2 className="font-semibold text-[#253158]">Dónde ocurrió</h2>
            <dl className="space-y-2">
              <Dato etiqueta="Pantalla" valor={reporte.ruta} mono />
              <Dato
                etiqueta="Módulo"
                valor={reporte.modulo ? (MODULO_LABELS[reporte.modulo] ?? reporte.modulo) : null}
              />
              <Dato etiqueta="Tamaño de pantalla" valor={reporte.viewport} mono />
              <Dato etiqueta="Navegador" valor={reporte.user_agent} mono />
              <Dato etiqueta="Fecha y hora" valor={fmtFechaHora(reporte.created_at)} />
              {reporte.resuelto_at && (
                <Dato
                  etiqueta="Resuelto"
                  valor={`${fmtFechaHora(reporte.resuelto_at)}${
                    reporte.resuelto_por ? ` · ${reporte.resuelto_por.nombre}` : ""
                  }`}
                />
              )}
            </dl>
          </section>

          <AccionesSoporte
            id={reporte.id}
            estado={reporte.estado}
            notaInicial={reporte.nota_interna ?? ""}
            estados={[...ESTADOS]}
          />
        </div>
      </div>
    </div>
  );
}
