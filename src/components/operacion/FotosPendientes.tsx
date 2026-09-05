"use client";

// Selector de fotos para formularios de CREACIÓN: acumula archivos en memoria
// y NO toca la red. Se usa cuando todavía no existe el id al cual colgar las
// fotos (ej. crear una orden de trabajo); el formulario las guarda en su estado
// y recién las sube después de guardar el documento.
//
// La galería de un documento YA guardado es FotosRegistro: ese sí sube y borra
// contra la API. Ambos comparten la reducción y las validaciones de
// @/lib/terreno/imagen, para que una foto aceptada acá se acepte igual al subir.

import { useEffect, useRef, useState } from "react";
import {
  MAX_SIZE_ARCHIVO,
  MENSAJE_HEIC,
  esHeic,
  reducirImagen,
  validarFotos,
} from "@/lib/terreno/imagen";
import { botonCls } from "@/lib/terreno/form-styles";

interface FotosPendientesProps {
  titulo: string;
  /** Fotos ya elegidas, en el orden en que se agregaron. El estado vive en el padre. */
  archivos: File[];
  onChange: (archivos: File[]) => void;
  disabled?: boolean;
}

export default function FotosPendientes({
  titulo,
  archivos,
  onChange,
  disabled = false,
}: FotosPendientesProps) {
  const [error, setError] = useState<string | null>(null);
  // Reducir varias fotos de celular toma segundos: sin este aviso el mecánico
  // cree que el botón no respondió y vuelve a apretarlo.
  const [preparando, setPreparando] = useState(false);
  // Cache de miniaturas por File (nunca por posición): quitar la foto del
  // medio de la lista no debe correr las URLs de las que quedaron. Vive en un
  // ref porque las URLs son un recurso externo (no estado serializable) que
  // hay que poder revocar sin depender del ciclo de render.
  const previewsRef = useRef<Map<File, string>>(new Map());
  // Solo dispara un re-render cuando el efecto de abajo agrega o saca algo
  // del cache; el valor en sí no se usa en el JSX.
  const [, forzarRender] = useState(0);
  const inputCamaraRef = useRef<HTMLInputElement>(null);
  const inputGaleriaRef = useRef<HTMLInputElement>(null);

  const ocupado = disabled || preparando;

  // Las miniaturas usan object URLs, que el navegador NO libera solo: retienen
  // el archivo completo en memoria hasta que se revocan. Acá se crean SOLO las
  // que faltan (los File que ya estaban se reusan, sin parpadeo de la grilla)
  // y se revocan las de los File que salieron de la lista.
  useEffect(() => {
    const vigentes = new Set(archivos);
    let cambios = false;
    for (const [archivo, url] of previewsRef.current) {
      if (!vigentes.has(archivo)) {
        URL.revokeObjectURL(url);
        previewsRef.current.delete(archivo);
        cambios = true;
      }
    }
    for (const archivo of archivos) {
      if (!previewsRef.current.has(archivo)) {
        previewsRef.current.set(archivo, URL.createObjectURL(archivo));
        cambios = true;
      }
    }
    if (cambios) forzarRender((v) => v + 1);
  }, [archivos]);

  // Red de seguridad al desmontar: revoca lo que haya quedado vivo en el
  // cache, sin importar cómo se haya llegado ahí.
  //
  // El Map se copia a una variable local del efecto en vez de leer
  // `previewsRef.current` dentro del cleanup: es el mismo objeto durante toda
  // la vida del componente (la ref nunca se reasigna), pero leerlo en el
  // cleanup dispara react-hooks/exhaustive-deps, y el proyecto no tolera
  // warnings de lint.
  useEffect(() => {
    const cache = previewsRef.current;
    return () => {
      for (const url of cache.values()) URL.revokeObjectURL(url);
      cache.clear();
    };
  }, []);

  function limpiarInputs() {
    // Sin esto, volver a elegir el MISMO archivo no dispara onChange (el value
    // del input no cambia) y el mecánico cree que la foto no se agregó.
    if (inputCamaraRef.current) inputCamaraRef.current.value = "";
    if (inputGaleriaRef.current) inputGaleriaRef.current.value = "";
  }

  async function agregarArchivos(seleccion: FileList | null) {
    if (!seleccion || seleccion.length === 0) return;
    setError(null);

    const nuevos = Array.from(seleccion);
    // El tope se valida ANTES de reducir: no tiene sentido gastar CPU y batería
    // comprimiendo fotos que igual no caben en el grupo.
    const problemaCantidad = validarFotos(nuevos, archivos.length);
    if (problemaCantidad) {
      setError(problemaCantidad);
      limpiarInputs();
      return;
    }

    setPreparando(true);
    const preparadas: File[] = [];
    try {
      for (const original of nuevos) {
        const reducida = await reducirImagen(original);

        // La reducción no logró convertir un HEIC: el original lo rechazaría
        // el servidor al subirlo, así que se corta acá con el mensaje accionable
        // en vez de dejar pasar una foto que va a fallar después de guardar.
        if (reducida === original && esHeic(original)) {
          setError(MENSAJE_HEIC);
          break;
        }
        if (reducida.size > MAX_SIZE_ARCHIVO) {
          setError("Cada foto debe pesar menos de 4 MB una vez optimizada.");
          break;
        }
        preparadas.push(reducida);
      }
    } finally {
      setPreparando(false);
      limpiarInputs();
      // Las que sí se pudieron preparar se conservan aunque el lote se corte a
      // mitad de camino: el mecánico no tiene que volver a elegirlas todas.
      if (preparadas.length > 0) onChange([...archivos, ...preparadas]);
    }
  }

  function quitarFoto(indice: number) {
    // Sin confirm(): todavía no se subió ni guardó nada, quitar una foto de la
    // lista no destruye nada que el usuario pueda perder.
    setError(null);
    onChange(archivos.filter((_, i) => i !== indice));
  }

  return (
    <div>
      <h2 className="mb-3 text-sm font-semibold text-[#253158]">{titulo}</h2>

      {error && <p className="mb-3 text-sm text-[#c6352e]">{error}</p>}

      {archivos.length === 0 ? (
        <p className="text-sm text-gray-400">Sin fotos.</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {archivos.map((archivo, indice) => {
            const url = previewsRef.current.get(archivo);
            // Un archivo recién agregado puede no tener URL todavía (el efecto
            // que la crea corre después de este render): se omite esa
            // miniatura en vez de mostrar una equivocada.
            if (!url) return null;
            return (
              <div
                key={`${archivo.name}-${archivo.lastModified}-${indice}`}
                className="relative aspect-square overflow-hidden rounded-lg border border-gray-200 bg-gray-50"
              >
                {/* <img> nativo, igual que FotosRegistro: es un object URL local,
                    next/image no puede optimizar un blob del navegador. */}
                <img src={url} alt="" className="h-full w-full object-cover" />
                <button
                  type="button"
                  onClick={() => quitarFoto(indice)}
                  disabled={ocupado}
                  aria-label="Quitar foto"
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-sm font-bold leading-none text-white transition hover:bg-[#c6352e] disabled:opacity-60"
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-3">
        <label className={botonCls(ocupado)}>
          {preparando ? "Preparando fotos…" : "Tomar foto"}
          <input
            ref={inputCamaraRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            capture="environment"
            disabled={ocupado}
            onChange={(e) => {
              void agregarArchivos(e.target.files);
            }}
            className="hidden"
          />
        </label>
        <label className={botonCls(ocupado)}>
          {preparando ? "Preparando fotos…" : "Elegir de galería"}
          <input
            ref={inputGaleriaRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={ocupado}
            onChange={(e) => {
              void agregarArchivos(e.target.files);
            }}
            className="hidden"
          />
        </label>
      </div>
    </div>
  );
}
