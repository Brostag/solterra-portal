// Utilidades de imagen del módulo terreno, compartidas por los componentes de
// fotos: la galería de un registro YA guardado (FotosRegistro) y el selector de
// fotos pendientes de un formulario de creación (FotosPendientes).
//
// Vivían dentro de FotosRegistro.tsx y se extrajeron tal cual, para que ambos
// flujos apliquen exactamente la misma reducción y las mismas validaciones: si
// una foto se acepta al crear, tiene que aceptarse igual al subirla después.
//
// Todo esto corre SOLO en el navegador (createImageBitmap, canvas, File): no
// importar desde un Server Component ni desde una server action.

export const MAX_FOTOS_POR_GRUPO = 6;

// Se valida sobre el archivo YA REDUCIDO (ver reducirImagen), no sobre el
// original: una foto de 8MB del celular que queda en 400KB debe poder
// subirse. El límite real de una función serverless en Vercel es ~4.5MB
// de body; 4MB deja margen para el resto del multipart.
export const MAX_SIZE_ARCHIVO = 4 * 1024 * 1024;

// Lado más largo al que se escala antes de subir. 1600px alcanza de sobra
// para ver el estado de un equipo en pantalla (celular o desktop) y evita
// gastar datos del plan del taller en fotos de 4000px+ que nadie va a mirar
// a esa resolución.
export const LADO_MAXIMO = 1600;

// 0.82 es el punto donde JPEG ya no pierde calidad visible en fotos de
// equipos/maquinaria, pero recorta bastante peso frente a valores 0.9+.
const CALIDAD_JPEG = 0.82;

// Mensaje accionable cuando la reducción no logró convertir un HEIC (ver
// reducirImagen). Compartido por FotosPendientes y FotosRegistro: antes
// estaba duplicado inline en cada componente.
export const MENSAJE_HEIC =
  "Las fotos HEIC del iPhone no son compatibles. En Ajustes › Cámara › Formatos, elige «Más compatible», o comparte la foto como JPG.";

// iOS entrega HEIC/HEIF por defecto y el endpoint solo acepta JPG/PNG/WEBP.
// Ya no se bloquea por adelantado: createImageBitmap convierte HEIC a JPEG
// en Safari (ver reducirImagen). Este detector queda solo como diagnóstico
// de FALLBACK, para cuando esa conversión no fue posible.
export function esHeic(archivo: File): boolean {
  const nombre = archivo.name.toLowerCase();
  return (
    archivo.type === "image/heic" ||
    archivo.type === "image/heif" ||
    nombre.endsWith(".heic") ||
    nombre.endsWith(".heif")
  );
}

function nombreJpg(nombreOriginal: string): string {
  const sinExtension = nombreOriginal.replace(/\.[^.]+$/, "");
  return `${sinExtension || "foto"}.jpg`;
}

/**
 * Reduce una foto en el navegador antes de subirla: escala el lado más largo
 * a 1600px y recomprime a JPEG calidad 0.82. Como efecto secundario resuelve
 * HEIC de iPhone, porque createImageBitmap lo decodifica nativo en Safari y
 * el canvas siempre exporta JPEG.
 *
 * Si algo falla (navegador sin soporte, formato no decodificable, etc.) se
 * devuelve el archivo ORIGINAL sin tocar: la optimización nunca debe impedir
 * que el mecánico pueda subir la foto, sobre todo con la conectividad
 * variable del taller en terreno, donde reintentar sale más caro que subir
 * un archivo más pesado.
 */
export async function reducirImagen(archivo: File): Promise<File> {
  if (typeof createImageBitmap !== "function") return archivo;

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(archivo);

    const escala = Math.min(1, LADO_MAXIMO / Math.max(bitmap.width, bitmap.height));
    // escala <= 1 siempre: si la imagen ya es más chica que el máximo, no se agranda.
    const ancho = Math.round(bitmap.width * escala);
    const alto = Math.round(bitmap.height * escala);

    const canvas = document.createElement("canvas");
    canvas.width = ancho;
    canvas.height = alto;
    const ctx = canvas.getContext("2d");
    if (!ctx) return archivo;
    ctx.drawImage(bitmap, 0, 0, ancho, alto);

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", CALIDAD_JPEG)
    );
    if (!blob) return archivo;

    const convertido = new File([blob], nombreJpg(archivo.name), { type: "image/jpeg" });

    // Un HEIC original nunca lo aceptaría el servidor (solo JPG/PNG/WEBP):
    // el convertido se prefiere aunque termine pesando más que el HEIC de origen.
    if (esHeic(archivo)) return convertido;

    // Para el resto de formatos, guarda el que pese menos: evita "optimizar"
    // una imagen ya comprimida y dejarla más pesada de lo que llegó.
    return blob.size < archivo.size ? convertido : archivo;
  } catch {
    return archivo;
  } finally {
    // Libera el bitmap decodificado: relevante en celulares al subir varias
    // fotos seguidas dentro del mismo lote, para no acumular memoria.
    bitmap?.close();
  }
}

/**
 * Valida SOLO la cantidad de fotos del grupo, contando las que ya están.
 *
 * El peso NO se valida acá a propósito: se comprueba después de reducir cada
 * archivo (contra MAX_SIZE_ARCHIVO), porque una foto de 8MB del celular que
 * queda en 400KB tiene que poder subirse igual.
 *
 * Devuelve el mensaje de error listo para mostrar, o null si está todo bien.
 */
export function validarFotos(archivos: File[], yaExistentes: number): string | null {
  if (yaExistentes + archivos.length > MAX_FOTOS_POR_GRUPO) {
    return `Puedes tener hasta ${MAX_FOTOS_POR_GRUPO} fotos en este grupo (ya tienes ${yaExistentes}).`;
  }
  return null;
}
