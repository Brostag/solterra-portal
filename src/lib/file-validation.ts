/**
 * Validación de archivos subidos por contenido real (magic bytes).
 *
 * No se confía en el MIME declarado por el navegador (`file.type`): un archivo
 * renombrado puede declarar cualquier tipo. Aquí se inspeccionan los primeros
 * bytes del buffer y se exige que correspondan al MIME declarado.
 *
 * Limitación conocida: los formatos Office (docx/xlsx = ZIP, doc/xls = OLE2)
 * solo se verifican a nivel de contenedor — un ZIP arbitrario renombrado a
 * .docx pasa este check. Aun así bloquea ejecutables, scripts y HTML.
 */

const PDF_SIG = [0x25, 0x50, 0x44, 0x46, 0x2d]; // %PDF-
const PNG_SIG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG_SIG = [0xff, 0xd8, 0xff];
const RIFF_SIG = [0x52, 0x49, 0x46, 0x46]; // RIFF (WebP)
const WEBP_SIG = [0x57, 0x45, 0x42, 0x50]; // WEBP en offset 8
const ZIP_SIG = [0x50, 0x4b, 0x03, 0x04]; // PK.. (docx/xlsx)
const OLE_SIG = [0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]; // doc/xls legacy

function bytesAt(buffer: Buffer, expected: readonly number[], offset = 0): boolean {
  if (buffer.length < offset + expected.length) return false;
  return expected.every((byte, i) => buffer[offset + i] === byte);
}

function isWebp(buffer: Buffer): boolean {
  return bytesAt(buffer, RIFF_SIG) && bytesAt(buffer, WEBP_SIG, 8);
}

/** MIME declarado → verificador del contenido real. */
const VERIFIERS: Record<string, (buffer: Buffer) => boolean> = {
  "application/pdf": (b) => bytesAt(b, PDF_SIG),
  "image/png": (b) => bytesAt(b, PNG_SIG),
  "image/jpeg": (b) => bytesAt(b, JPEG_SIG),
  "image/webp": isWebp,
  "application/msword": (b) => bytesAt(b, OLE_SIG),
  "application/vnd.ms-excel": (b) => bytesAt(b, OLE_SIG),
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": (b) =>
    bytesAt(b, ZIP_SIG),
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": (b) =>
    bytesAt(b, ZIP_SIG),
};

/**
 * true solo si el contenido del buffer corresponde al MIME declarado.
 * MIME sin verificador conocido → false (rechazo por defecto).
 */
export function fileContentMatchesMime(declaredMime: string, buffer: Buffer): boolean {
  const verify = VERIFIERS[declaredMime];
  if (!verify) return false;
  return verify(buffer);
}
