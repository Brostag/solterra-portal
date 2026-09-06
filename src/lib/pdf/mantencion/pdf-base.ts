// Base compartida de los PDF del módulo Mantención. Antes el registro de
// fuentes y la paleta estaban duplicados en los 4 templates.
import { Font } from "@react-pdf/renderer";
import fs from "fs";
import path from "path";

let registered = false;

// Idempotente: registra la fuente Inter una sola vez por proceso.
export function registerFonts() {
  if (registered) return;
  Font.register({
    family: "Inter",
    fonts: [
      { src: path.join(process.cwd(), "public", "fonts", "Inter-Regular.ttf"), fontWeight: 400 },
      { src: path.join(process.cwd(), "public", "fonts", "Inter-Bold.ttf"), fontWeight: 700 },
    ],
  });
  registered = true;
}

export const PDF_COLORS = {
  BLUE: "#253158",
  RED: "#c6352e",
  GRAY: "#6b7280",
  BORDER: "#cbd5e1",
  HEAD: "#1e3a5f",
} as const;

/**
 * Razón social real de la empresa. Los documentos del módulo decían
 * "SOLTERRA E.I.R.L.", que no corresponde: la sociedad es SpA (igual que en
 * los documentos comerciales, ver src/lib/pdf/contract-template.tsx).
 */
export const EMPRESA_NOMBRE = "SOLTERRA SPA";

type LogoSrc = { data: Buffer; format: "png" };

let logoSrc: LogoSrc | null = null;

/**
 * Logo corporativo para la cabecera de los PDF. Se lee del disco una sola vez
 * por proceso, igual que las fuentes: sin dependencia de red externa.
 *
 * Es una función y no una constante a propósito: leyéndolo en tiempo de import
 * (`fs.readFileSync` a nivel de módulo), un archivo ausente en el bundle
 * reventaba el import de este módulo y con él los 5 endpoints PDF de
 * Mantención, no solo los dos que dibujan el logo.
 *
 * OJO: @react-pdf v4 trata un `src` de tipo string como URL y lo pasa por
 * fetch — con una ruta de disco falla en silencio ("fetch failed" en el log) y
 * el logo simplemente no se dibuja. Hay que entregarle el Buffer explícito.
 */
export function getLogoSrc(): LogoSrc {
  if (!logoSrc) {
    logoSrc = {
      data: fs.readFileSync(
        path.join(process.cwd(), "public", "solterra-logo-color.png"),
      ),
      format: "png",
    };
  }
  return logoSrc;
}
