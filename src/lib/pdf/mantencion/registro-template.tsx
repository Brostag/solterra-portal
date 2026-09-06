// React.createElement siempre (bug @react-pdf/reconciler v0.23 con JSX). NO JSX.
import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import {
  REGISTRO_COMPONENTES,
  type ComponentesData,
  type ValorComponente,
} from "@/lib/terreno/registro-componentes";
import { registerFonts, PDF_COLORS, EMPRESA_NOMBRE, getLogoSrc } from "./pdf-base";

registerFonts();

const { BLUE, BORDER, HEAD, GRAY } = PDF_COLORS;

const styles = StyleSheet.create({
  page: { fontFamily: "Inter", fontSize: 8, color: "#1a1a1a", padding: 28 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  logo: { width: 86, height: 38, objectFit: "contain" },
  brand: { fontSize: 8, fontWeight: 700, color: BLUE },
  title: { fontSize: 10.5, fontWeight: 700, textAlign: "center", marginVertical: 8 },
  infoGrid: { flexDirection: "row", flexWrap: "wrap", border: `1px solid ${BORDER}`, marginBottom: 10 },
  infoCell: { width: "33.33%", flexDirection: "row", borderRight: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` },
  infoLabel: { width: 70, padding: 3, fontWeight: 700, color: "#374151", backgroundColor: "#f1f5f9" },
  infoValue: { flex: 1, padding: 3 },
  thRow: { flexDirection: "row", backgroundColor: HEAD },
  th: { color: "#fff", fontWeight: 700, padding: 3, fontSize: 7, textAlign: "center" },
  row: { flexDirection: "row", borderBottom: `0.5px solid ${BORDER}` },
  td: { padding: 3, fontSize: 7 },
  colComp: { flex: 1, borderRight: `0.5px solid ${BORDER}` },
  colMark: { width: 20, textAlign: "center", borderRight: `0.5px solid ${BORDER}` },
  group: { width: "50%" },
  groupHead: { backgroundColor: BLUE, color: "#fff", fontWeight: 700, padding: 3, textAlign: "center", fontSize: 7.5 },
  obsBox: { border: `1px solid ${BORDER}`, padding: 6, marginTop: 8, minHeight: 26 },
  fotos: { marginTop: 10, fontSize: 8, color: "#374151" },
  // Anexo fotográfico
  anexoIntro: { fontSize: 8, color: GRAY, marginBottom: 4 },
  grupoTitulo: { fontSize: 9, fontWeight: 700, color: BLUE, marginTop: 8, marginBottom: 2, borderBottom: `1px solid ${BORDER}`, paddingBottom: 3 },
  fotoGrid: { flexDirection: "row", flexWrap: "wrap" },
  fotoCell: { width: "50%", padding: 4 },
  fotoFrame: { border: `1px solid ${BORDER}`, borderRadius: 3, padding: 4 },
  fotoImg: { width: "100%", height: 150, objectFit: "contain", backgroundColor: "#f6f7f9" },
  fotoMissing: { width: "100%", height: 150, backgroundColor: "#f6f7f9", alignItems: "center", justifyContent: "center" },
  fotoCaption: { fontSize: 8, fontWeight: 700, color: BLUE, marginTop: 3 },
  fotoNota: { fontSize: 7.5, color: GRAY, textAlign: "center", paddingHorizontal: 6 },
});

/**
 * Foto ya resuelta por el endpoint: `src` es un data URI listo para embeber
 * (`data:image/jpeg;base64,...`). Cuando la descarga falla o el formato no es
 * embebible (WEBP no lo soporta @react-pdf), `src` viene en null y se dibuja
 * el marco con la `nota` en vez de romper la generación del documento.
 */
export type RegistroFotoPDF = {
  src: string | null;
  etiqueta: string;
  nota: string | null;
};

/** Fotos del registro agrupadas por momento del ciclo. */
export type RegistroFotosPDF = {
  ingreso: RegistroFotoPDF[];
  salida: RegistroFotoPDF[];
};

export type RegistroPDFData = {
  responsable: string | null;
  tipoEquipo: string | null;
  patente: string | null;
  odometro: number | null;
  horometro: number | null;
  areaUso: string | null;
  centroCosto: string | null;
  tipoMantencion: string | null;
  combustible: string | null;
  fechaIngreso: string; // ISO
  fechaSalida: string | null; // ISO
  nombreResponsable: string | null;
  rutResponsable: string | null;
  nombreReceptor: string | null;
  rutReceptor: string | null;
  componentes: ComponentesData | null;
  observaciones: string | null;
  /** Anexo fotográfico opcional: si viene vacío o ausente, el PDF no cambia. */
  fotos?: RegistroFotosPDF;
};

const ce = React.createElement;

function fechaUTC(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("es-CL", { timeZone: "UTC" }) : "—";
}
function fmt(n: number | null): string {
  return n != null ? n.toLocaleString("es-CL") : "—";
}
function mark(v: ValorComponente | null | undefined, col: ValorComponente): string {
  return v === col ? "X" : "";
}

// El formulario en papel deja una línea en blanco para anotar las fotos. Con
// fotos embebidas esa línea pierde sentido: se reemplaza por el conteo y la
// referencia al anexo.
function lineaFotos(label: string, n: number): string {
  return n > 0
    ? `${label}: ${n} ${n === 1 ? "imagen" : "imágenes"} — ver anexo fotográfico`
    : `${label}: ___________________________`;
}

// Cabecera compartida por la hoja del registro y por el anexo. `getLogoSrc()`
// devuelve el Buffer del PNG: @react-pdf v4 trata un src string como URL y una
// ruta de disco falla en silencio.
function cabecera() {
  return ce(
    View,
    { style: styles.header },
    ce(Image, { style: styles.logo, src: getLogoSrc() }),
    ce(Text, { style: styles.brand }, EMPRESA_NOMBRE),
  );
}

function compTabla(
  comps: ComponentesData | null,
  campo: "ingreso" | "salida",
  titulo: string,
) {
  return ce(
    View,
    { style: styles.group },
    ce(Text, { style: styles.groupHead }, titulo),
    ce(
      View,
      { style: styles.thRow },
      ce(Text, { style: [styles.th, styles.colComp, { textAlign: "left" }] }, "Componente"),
      ce(Text, { style: [styles.th, styles.colMark] }, "SI"),
      ce(Text, { style: [styles.th, styles.colMark] }, "NO"),
      ce(Text, { style: [styles.th, styles.colMark] }, "NA"),
    ),
    ...REGISTRO_COMPONENTES.map((item) => {
      const v = comps?.[item.key]?.[campo];
      return ce(
        View,
        { key: item.key, style: styles.row, wrap: false },
        ce(Text, { style: [styles.td, styles.colComp] }, item.label),
        ce(Text, { style: [styles.td, styles.colMark] }, mark(v, "SI")),
        ce(Text, { style: [styles.td, styles.colMark] }, mark(v, "NO")),
        ce(Text, { style: [styles.td, styles.colMark] }, mark(v, "NA")),
      );
    }),
  );
}

// Grilla de 2 fotos por fila. `wrap: false` por celda: ninguna foto se parte
// entre páginas. La resolución la fija el endpoint (downloadImageForPdf reduce
// a 1200px de ancho / calidad 75) — no subirla acá: con el máximo del registro
// (6 de ingreso + 6 de salida) el PDF ya puede pesar del orden de 2 a 4 MB.
function grupoFotos(titulo: string, fotos: RegistroFotoPDF[], key: string) {
  return ce(
    View,
    { key },
    ce(Text, { style: styles.grupoTitulo }, titulo),
    ce(
      View,
      { style: styles.fotoGrid },
      ...fotos.map((f, i) =>
        ce(
          View,
          { key: `${key}-${i}`, style: styles.fotoCell, wrap: false },
          ce(
            View,
            { style: styles.fotoFrame },
            f.src
              ? ce(Image, { style: styles.fotoImg, src: f.src })
              : ce(
                  View,
                  { style: styles.fotoMissing },
                  ce(Text, { style: styles.fotoNota }, f.nota ?? "Imagen no disponible"),
                ),
            ce(Text, { style: styles.fotoCaption }, f.etiqueta),
          ),
        ),
      ),
    ),
  );
}

export function RegistroDocument({ data }: { data: RegistroPDFData }) {
  const infos: [string, string][] = [
    ["Responsable", data.responsable ?? "—"],
    ["Tipo Equipo", (data.tipoEquipo ?? "—").toUpperCase()],
    ["Patente", data.patente ?? "—"],
    ["Odómetro", fmt(data.odometro)],
    ["Horómetro", fmt(data.horometro)],
    ["Tipo Mant.", data.tipoMantencion ?? "—"],
    ["Área de uso", data.areaUso ?? "—"],
    ["Centro Costo", data.centroCosto ?? "—"],
    ["Combustible", data.combustible ?? "—"],
    ["F. Ingreso", fechaUTC(data.fechaIngreso)],
    ["F. Salida", fechaUTC(data.fechaSalida)],
    ["", ""],
  ];

  const fotosIngreso = data.fotos?.ingreso ?? [];
  const fotosSalida = data.fotos?.salida ?? [];
  // Un grupo sin fotos no se dibuja: una orden todavía abierta no muestra un
  // bloque "Fotos de salida" vacío.
  const grupos = [
    { titulo: "FOTOS DE INGRESO", fotos: fotosIngreso, key: "gi" },
    { titulo: "FOTOS DE SALIDA", fotos: fotosSalida, key: "gs" },
  ].filter((g) => g.fotos.length > 0);

  return ce(
    Document,
    {},
    ce(
      Page,
      { size: "A4", style: styles.page },
      cabecera(),
      ce(Text, { style: styles.title }, "REGISTRO INGRESO Y SALIDA DE EQUIPO · DEPTO. MAQUINARIAS"),
      ce(
        View,
        { style: styles.infoGrid },
        ...infos.map((it, i) =>
          ce(
            View,
            { key: i, style: styles.infoCell },
            ce(Text, { style: styles.infoLabel }, it[0]),
            ce(Text, { style: styles.infoValue }, it[1]),
          ),
        ),
      ),
      ce(
        View,
        { style: { flexDirection: "row", gap: 8 } },
        compTabla(data.componentes, "ingreso", "INGRESO"),
        compTabla(data.componentes, "salida", "SALIDA"),
      ),
      ce(
        View,
        { style: { flexDirection: "row", gap: 8, marginTop: 8 } },
        ce(
          Text,
          { style: { flex: 1, fontSize: 8 } },
          ce(Text, { style: { fontWeight: 700 } }, "Ingreso: "),
          `${data.nombreResponsable ?? "—"} · ${data.rutResponsable ?? "—"}`,
        ),
        ce(
          Text,
          { style: { flex: 1, fontSize: 8 } },
          ce(Text, { style: { fontWeight: 700 } }, "Salida: "),
          `${data.nombreReceptor ?? "—"} · ${data.rutReceptor ?? "—"}`,
        ),
      ),
      ce(Text, { style: { marginTop: 8, fontWeight: 700, color: BLUE, fontSize: 8 } }, "Observaciones generales"),
      ce(Text, { style: styles.obsBox }, data.observaciones ?? ""),
      ce(
        View,
        { style: styles.fotos },
        // Sin fotos cargadas el documento conserva las líneas del formulario en
        // papel; con fotos se remite al anexo.
        ...(grupos.length > 0
          ? [
              ce(Text, { key: "fi" }, lineaFotos("Fotos de ingreso", fotosIngreso.length)),
              ce(
                Text,
                { key: "fs", style: { marginTop: 4 } },
                lineaFotos("Fotos de salida", fotosSalida.length),
              ),
            ]
          : [
              ce(Text, { key: "ft" }, "Fotos de Tablero: ___________________________"),
              ce(Text, { key: "fe", style: { marginTop: 4 } }, "Fotos de Entrada: ___________________________"),
              ce(Text, { key: "fs0", style: { marginTop: 4 } }, "Fotos de Salida: ____________________________"),
            ]),
      ),
    ),
    // ── Anexo fotográfico (página nueva, SOLO si el registro tiene fotos) ──
    grupos.length > 0
      ? ce(
          Page,
          { size: "A4", style: styles.page },
          cabecera(),
          ce(Text, { style: styles.title }, "ANEXO FOTOGRÁFICO · REGISTRO INGRESO Y SALIDA"),
          ce(
            Text,
            { style: styles.anexoIntro },
            `Equipo ${(data.tipoEquipo ?? "—").toUpperCase()} · Patente ${data.patente ?? "—"} · Ingreso ${fechaUTC(data.fechaIngreso)}`,
          ),
          ...grupos.map((g) => grupoFotos(g.titulo, g.fotos, g.key)),
        )
      : null,
  );
}
