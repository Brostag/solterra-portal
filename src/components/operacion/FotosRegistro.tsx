"use client";

// Galería + subida/borrado de fotos de un grupo del Registro de Ingreso/Salida
// (tablero, entrada o salida). Una instancia por grupo: cada una sube/borra
// solo dentro de su propio arreglo en la BD (ver API de fotos).
//
// Deliberadamente sin next/image: las URLs son firmadas de Supabase Storage
// con expiración de 1h (getFotosFirmadas), y next/image las optimizaría y
// cachearía con una clave que quedaría rota apenas la URL vence.

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  MAX_SIZE_ARCHIVO,
  MENSAJE_HEIC,
  esHeic,
  reducirImagen,
  validarFotos,
} from "@/lib/terreno/imagen";
import { subirFoto, type GrupoFoto } from "@/lib/terreno/fotos";
import { botonCls } from "@/lib/terreno/form-styles";

interface FotosRegistroProps {
  registroId: string;
  grupo: GrupoFoto;
  titulo: string;
  /** Rutas de Storage guardadas en el registro, en el orden que vienen de la BD. */
  paths: string[];
  /** Mapa ruta → URL firmada (getFotosFirmadas). Puede faltar una entrada si la firma falló. */
  urls: Record<string, string>;
  puedeEditar: boolean;
}

export default function FotosRegistro({
  registroId,
  grupo,
  titulo,
  paths,
  urls,
  puedeEditar,
}: FotosRegistroProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [subiendo, setSubiendo] = useState(false);
  // Progreso del lote en curso (null = sin subida activa): permite mostrar
  // "Subiendo 2 de 3…" en vez de un "Subiendo…" ciego durante todo el lote.
  const [progreso, setProgreso] = useState<{ actual: number; total: number } | null>(null);
  // Ruta en curso de borrado (null = ninguna): permite bloquear solo esa
  // miniatura mientras el resto de la galería sigue usable.
  const [eliminando, setEliminando] = useState<string | null>(null);
  const inputCamaraRef = useRef<HTMLInputElement>(null);
  const inputGaleriaRef = useRef<HTMLInputElement>(null);

  const ocupado = subiendo || eliminando !== null;

  function limpiarInputs() {
    if (inputCamaraRef.current) inputCamaraRef.current.value = "";
    if (inputGaleriaRef.current) inputGaleriaRef.current.value = "";
  }

  function labelBoton(base: string): string {
    if (!subiendo) return base;
    return progreso ? `Subiendo ${progreso.actual} de ${progreso.total}…` : "Subiendo…";
  }

  async function subirUnaFoto(archivo: File): Promise<void> {
    // subirFoto ya reintenta una vez por su cuenta ante un 500 transitorio de
    // Storage, y nunca ante un error de red (podría duplicar la foto). Acá
    // solo se traduce su resultado al throw que espera subirArchivos.
    const error = await subirFoto(registroId, grupo, archivo);
    if (error) throw new Error(error);
  }

  async function subirArchivos(archivos: FileList | null) {
    if (!archivos || archivos.length === 0) return;
    setError(null);

    const lista = Array.from(archivos);
    // El tope de 6 fotos se valida ANTES de reducir: no tiene sentido gastar
    // CPU/batería comprimiendo fotos que el servidor va a rechazar igual.
    const problemaCantidad = validarFotos(lista, paths.length);
    if (problemaCantidad) {
      setError(problemaCantidad);
      limpiarInputs();
      return;
    }

    setSubiendo(true);
    let subidas = 0;
    try {
      for (let i = 0; i < lista.length; i++) {
        setProgreso({ actual: i + 1, total: lista.length });
        const original = lista[i];
        const reducida = await reducirImagen(original);

        // La reducción no logró convertir un HEIC: el original no lo
        // aceptaría el servidor, así que se corta acá con el mensaje accionable.
        if (reducida === original && esHeic(original)) {
          setError(MENSAJE_HEIC);
          break;
        }
        if (reducida.size > MAX_SIZE_ARCHIVO) {
          setError("Cada foto debe pesar menos de 4 MB una vez optimizada.");
          break;
        }

        try {
          // Subida secuencial, NO Promise.all: en una conexión de terreno
          // paralelizar fotos grandes empeora el throughput, y el servidor
          // valida el tope de 6 por grupo contra lo ya guardado — en paralelo,
          // dos requests podrían pasarse del tope antes de que el primero
          // impacte el conteo.
          await subirUnaFoto(reducida);
          subidas++;
        } catch (err) {
          const mensaje = err instanceof Error ? err.message : "No se pudo subir la foto.";
          setError(
            subidas > 0
              ? `Se subieron ${subidas} de ${lista.length} fotos. La última falló: ${mensaje}`
              : mensaje
          );
          break;
        }
      }
    } finally {
      setSubiendo(false);
      setProgreso(null);
      limpiarInputs();
      // Las fotos que sí se subieron ya quedaron persistidas en el servidor,
      // aunque el lote se haya cortado a mitad de camino: refrescar las trae.
      if (subidas > 0) router.refresh();
    }
  }

  async function eliminarFoto(path: string) {
    if (!confirm("¿Eliminar esta foto? Esta acción no se puede deshacer.")) return;
    setError(null);
    setEliminando(path);
    try {
      const res = await fetch(`/api/operacion/registro/${registroId}/fotos`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ grupo, path }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) {
        setError(data?.error ?? "No se pudo eliminar la foto.");
        return;
      }
      router.refresh();
    } catch {
      setError("No se pudo eliminar. Revisa tu conexión e intenta de nuevo.");
    } finally {
      setEliminando(null);
    }
  }

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-[#253158]">{titulo}</h2>

      {error && <p className="mb-3 text-sm text-[#c6352e]">{error}</p>}

      {paths.length === 0 ? (
        <p className="text-sm text-gray-400">
          Sin fotos.{puedeEditar ? " Agrega una desde los botones de abajo." : ""}
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {paths.map((path) => {
            const url = urls[path];
            // La firma pudo fallar (Storage caído): se omite la miniatura en
            // vez de romper toda la galería (mismo criterio que getFotosFirmadas).
            if (!url) return null;
            return (
              <div
                key={path}
                className="group relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
              >
                <a href={url} target="_blank" rel="noopener noreferrer">
                  {/* <img> nativo, igual que FotosEquipoSection.tsx: son URLs
                      firmadas de Storage con expiración, next/image las
                      cachearía con una clave que quedaría rota al vencer. */}
                  <img src={url} alt="" className="h-full w-full object-cover" />
                </a>
                {puedeEditar && (
                  <button
                    type="button"
                    onClick={() => eliminarFoto(path)}
                    disabled={ocupado}
                    aria-label="Eliminar foto"
                    className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-sm font-bold leading-none text-white transition hover:bg-[#c6352e] disabled:opacity-60"
                  >
                    ×
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {puedeEditar && (
        <div className="mt-3 flex flex-wrap gap-3">
          <label className={botonCls(ocupado)}>
            {labelBoton("Tomar foto")}
            <input
              ref={inputCamaraRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              capture="environment"
              disabled={ocupado}
              onChange={(e) => {
                void subirArchivos(e.target.files);
              }}
              className="hidden"
            />
          </label>
          <label className={botonCls(ocupado)}>
            {labelBoton("Elegir de galería")}
            <input
              ref={inputGaleriaRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              disabled={ocupado}
              onChange={(e) => {
                void subirArchivos(e.target.files);
              }}
              className="hidden"
            />
          </label>
        </div>
      )}
    </div>
  );
}
