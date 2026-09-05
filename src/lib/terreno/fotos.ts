// Subida de UNA foto del Registro de Ingreso/Salida, con reintento acotado
// ante tropiezos transitorios de Storage.
//
// Motivo (QA real, no hipotético): en una prueba end-to-end contra Supabase
// de producción, la primera subida tras arrancar el servidor devolvió 500
// con el mensaje de error vacío — un tropiezo transitorio al contactar
// Storage. Repetida la operación idéntica, funcionó a la primera. En terreno,
// con la señal intermitente del taller en Calama, esto va a pasar seguido.
//
// Único punto de la política de reintento: lo usan tanto ParteForm (fotos
// pendientes de un registro recién creado) como FotosRegistro (galería de un
// registro ya existente), para no duplicar ni desalinear el criterio entre
// los dos flujos.

export type GrupoFoto = "tablero" | "entrada" | "salida";

// Espera antes del único reintento. El tropiezo real observado en QA se
// resolvió al toque en el segundo intento; no hay motivo para esperar más y
// hacer sentir la subida más lenta de lo que ya es con mala señal.
const ESPERA_REINTENTO_MS = 800;

const MENSAJE_ERROR_GENERICO =
  "No se pudo subir la foto. Revisa tu conexión e intenta de nuevo.";

function construirFormData(grupo: GrupoFoto, archivo: File): FormData {
  const fd = new FormData();
  // `set`, no `append`: debe existir un solo valor de "grupo" en el body.
  fd.set("grupo", grupo);
  // Una foto por request, nunca varias: una función serverless de Vercel
  // rechaza el body sobre ~4,5 MB, y el servidor valida el tope de 6 fotos
  // por grupo contra lo ya guardado (en paralelo, dos requests podrían
  // pasarse del tope antes de que la primera lo impacte).
  fd.append("fotos", archivo);
  return fd;
}

function intentarSubida(
  registroId: string,
  grupo: GrupoFoto,
  archivo: File,
): Promise<Response> {
  // Sin try/catch acá a propósito: si `fetch` lanza (error de red), el
  // rechazo tiene que llegar intacto a quien llama, que es quien decide si
  // corresponde reintentar (ver subirFoto).
  return fetch(`/api/operacion/registro/${registroId}/fotos`, {
    method: "POST",
    body: construirFormData(grupo, archivo),
  });
}

async function leerMensajeError(res: Response): Promise<string> {
  const data: unknown = await res.json().catch(() => null);
  const error =
    data && typeof data === "object" && "error" in data
      ? (data as { error?: unknown }).error
      : null;
  return typeof error === "string" && error ? error : MENSAJE_ERROR_GENERICO;
}

function esperar(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Sube UNA foto al registro indicado. Devuelve `null` si quedó guardada, o el
 * mensaje de error (en español) a mostrar si no.
 *
 * Reintenta como MÁXIMO una vez, y SOLO cuando la respuesta llegó con
 * `status >= 500`. Es seguro reintentar en ese caso puntual porque el
 * endpoint revierte a Storage lo que alcanzó a subir antes de responder 500
 * (ver src/app/api/operacion/registro/[id]/fotos/route.ts): un 500 significa
 * que no quedó nada a medio guardar, así que repetir la request no puede
 * dejar la foto duplicada.
 *
 * Un 4xx (403 el responsable elegido no es quien sube ni un supervisor, 400
 * formato inválido o tope de 6 alcanzado, 413 foto muy pesada) NUNCA se
 * reintenta: son rechazos del propio request, no del contacto con Storage, y
 * repetirlo exactamente igual no cambia el resultado.
 *
 * Un error de RED (fetch lanza porque la conexión se cortó y no hubo
 * respuesta) TAMPOCO se reintenta, y esta es la regla crítica: acá no hay
 * forma de saber si el servidor alcanzó a subir el archivo a Storage y
 * guardar la referencia antes de que se cortara la conexión. Reintentar a
 * ciegas en ese caso podría dejar la misma foto guardada dos veces.
 */
export async function subirFoto(
  registroId: string,
  grupo: GrupoFoto,
  archivo: File,
): Promise<string | null> {
  let res: Response;
  try {
    res = await intentarSubida(registroId, grupo, archivo);
  } catch {
    return MENSAJE_ERROR_GENERICO;
  }

  if (res.ok) return null;

  if (res.status >= 500) {
    await esperar(ESPERA_REINTENTO_MS);
    try {
      res = await intentarSubida(registroId, grupo, archivo);
    } catch {
      // El primer intento fue un 500 que ya revirtió lo subido a Storage: no
      // hay riesgo de duplicado aunque el reintento en sí falle por red.
      return MENSAJE_ERROR_GENERICO;
    }
    if (res.ok) return null;
  }

  return leerMensajeError(res);
}
