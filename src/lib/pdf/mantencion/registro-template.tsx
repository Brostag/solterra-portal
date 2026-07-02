// React.createElement siempre (bug @react-pdf/reconciler v0.23 con JSX). NO JSX.
import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import {
  REGISTRO_COMPONENTES,
  type ComponentesData,
  type ValorComponente,
} from "@/lib/terreno/registro-componentes";
import { registerFonts, PDF_COLORS } from "./pdf-base";

registerFonts();

const { BLUE, BORDER, HEAD } = PDF_COLORS;

const styles = StyleSheet.create({
  page: { fontFamily: "Inter", fontSize: 8, color: "#1a1a1a", padding: 28 },
  brand: { fontSize: 12, fontWeight: 700, color: BLUE },
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
});

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

  return ce(
    Document,
    {},
    ce(
      Page,
      { size: "A4", style: styles.page },
      ce(Text, { style: styles.brand }, "SOLTERRA E.I.R.L."),
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
        ce(Text, {}, "Fotos de Tablero: ___________________________"),
        ce(Text, { style: { marginTop: 4 } }, "Fotos de Entrada: ___________________________"),
        ce(Text, { style: { marginTop: 4 } }, "Fotos de Salida: ____________________________"),
      ),
    ),
  );
}
