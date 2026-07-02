// Base compartida de los PDF del módulo Mantención. Antes el registro de
// fuentes y la paleta estaban duplicados en los 4 templates.
import { Font } from "@react-pdf/renderer";
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
