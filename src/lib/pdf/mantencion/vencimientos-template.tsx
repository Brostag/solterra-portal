// React.createElement siempre (bug @react-pdf/reconciler v0.23 con JSX). NO JSX.
import React from "react";
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import path from "path";
import type { EquipoVencimientos, VencimientoDoc } from "@/lib/terreno/queries";

Font.register({
  family: "Inter",
  fonts: [
    { src: path.join(process.cwd(), "public", "fonts", "Inter-Regular.ttf"), fontWeight: 400 },
    { src: path.join(process.cwd(), "public", "fonts", "Inter-Bold.ttf"), fontWeight: 700 },
  ],
});

const BLUE = "#253158";
const BORDER = "#cbd5e1";
const HEAD = "#1e3a5f";
const RED_BG = "#fde8e8";
const RED_TX = "#c6352e";
const YEL_BG = "#fef3c7";
const YEL_TX = "#92400e";
const GRN_BG = "#dcfce7";
const GRN_TX = "#166534";

const styles = StyleSheet.create({
  page: { fontFamily: "Inter", fontSize: 8, color: "#1a1a1a", padding: 28 },
  brand: { fontSize: 12, fontWeight: 700, color: BLUE },
  title: { fontSize: 13, fontWeight: 700, textAlign: "center", marginVertical: 10 },
  thRow: { flexDirection: "row", backgroundColor: HEAD },
  th: { color: "#fff", fontWeight: 700, padding: 4, fontSize: 7, textAlign: "center", borderRight: "0.5px solid #fff" },
  row: { flexDirection: "row", borderBottom: `0.5px solid ${BORDER}` },
  cell: { padding: 4, fontSize: 7, borderRight: `0.5px solid ${BORDER}`, textAlign: "center" },
  cellL: { padding: 4, fontSize: 7, borderRight: `0.5px solid ${BORDER}`, textAlign: "left" },
  colPat: { width: 50 },
  colTipo: { flex: 1 },
  colFecha: { width: 48 },
  colEstado: { width: 52 },
});

export type VencimientosPDFData = { equipos: EquipoVencimientos[] };

const ce = React.createElement;

function fechaUTC(iso: string | null): string {
  return iso ? new Date(iso).toLocaleDateString("es-CL", { timeZone: "UTC" }) : "—";
}

function estadoStyle(estado: string) {
  if (estado === "Vencido") return { backgroundColor: RED_BG, color: RED_TX };
  if (estado === "Por Vencer") return { backgroundColor: YEL_BG, color: YEL_TX };
  if (estado === "Vigente") return { backgroundColor: GRN_BG, color: GRN_TX };
  return {};
}

function estadoLabel(d: VencimientoDoc): string {
  if (!d.fecha) return "—";
  if (d.estado === "Vencido") return "Vencido";
  return `${d.dias}d`;
}

function docCells(d: VencimientoDoc) {
  const st = estadoStyle(d.estado);
  return [
    ce(Text, { style: [styles.cell, styles.colFecha] }, fechaUTC(d.fecha)),
    ce(Text, { style: [styles.cell, styles.colEstado, st] }, estadoLabel(d)),
  ];
}

export function VencimientosDocument({ data }: { data: VencimientosPDFData }) {
  return ce(
    Document,
    {},
    ce(
      Page,
      { size: "A4", orientation: "landscape", style: styles.page },
      ce(Text, { style: styles.brand }, "SOLTERRA E.I.R.L."),
      ce(Text, { style: styles.title }, "Reporte de Fechas"),
      ce(
        View,
        { style: styles.thRow, fixed: true },
        ce(Text, { style: [styles.th, styles.colPat] }, "Patente"),
        ce(Text, { style: [styles.th, styles.colTipo] }, "Tipo"),
        ce(Text, { style: [styles.th, styles.colFecha] }, "SOAP"),
        ce(Text, { style: [styles.th, styles.colEstado] }, "Días"),
        ce(Text, { style: [styles.th, styles.colFecha] }, "Perm. circ"),
        ce(Text, { style: [styles.th, styles.colEstado] }, "Días"),
        ce(Text, { style: [styles.th, styles.colFecha] }, "Rev. técn"),
        ce(Text, { style: [styles.th, styles.colEstado] }, "Días"),
        ce(Text, { style: [styles.th, styles.colFecha] }, "Extintor"),
        ce(Text, { style: [styles.th, styles.colEstado] }, "Días"),
      ),
      ...data.equipos.map((e) =>
        ce(
          View,
          { key: e.id, style: styles.row, wrap: false },
          ce(Text, { style: [styles.cell, styles.colPat] }, e.patente || e.codigo),
          ce(Text, { style: [styles.cellL, styles.colTipo] }, e.tipo),
          ...docCells(e.soap),
          ...docCells(e.permiso_circ),
          ...docCells(e.rev_tecnica),
          ...docCells(e.extintor),
        ),
      ),
      data.equipos.length === 0
        ? ce(Text, { style: { padding: 12, color: "#6b7280" } }, "Sin equipos registrados.")
        : null,
    ),
  );
}
