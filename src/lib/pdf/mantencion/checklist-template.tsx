// React.createElement siempre (bug @react-pdf/reconciler v0.23 con JSX). NO JSX.
import React from "react";
import { Document, Page, Text, View, StyleSheet, Image } from "@react-pdf/renderer";
import {
  SECCION_A,
  SECCION_B,
  type ChecklistMantData,
  type ItemMant,
  type ItemValor,
  type ValorItem,
} from "@/lib/terreno/checklist-mantencion-items";
import { registerFonts, PDF_COLORS, getLogoSrc, EMPRESA_NOMBRE } from "./pdf-base";

registerFonts();

const { BLUE, BORDER, HEAD } = PDF_COLORS;

const styles = StyleSheet.create({
  page: { fontFamily: "Inter", fontSize: 7.5, color: "#1a1a1a", padding: 24 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  logo: { width: 86, height: 38, objectFit: "contain" },
  brand: { fontSize: 8, fontWeight: 700, color: BLUE },
  title: { fontSize: 11, fontWeight: 700, textAlign: "center", marginVertical: 8, color: "#1a1a1a" },
  infoGrid: { flexDirection: "row", flexWrap: "wrap", border: `1px solid ${BORDER}`, marginBottom: 10 },
  infoCell: { width: "33.33%", flexDirection: "row", borderRight: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` },
  infoLabel: { width: 64, padding: 3, fontWeight: 700, color: "#374151", backgroundColor: "#f1f5f9" },
  infoValue: { flex: 1, padding: 3 },
  secHead: { backgroundColor: HEAD, color: "#fff", fontWeight: 700, padding: 4, marginTop: 6, fontSize: 8 },
  thRow: { flexDirection: "row", backgroundColor: HEAD },
  th: { color: "#fff", fontWeight: 700, padding: 3, fontSize: 7 },
  row: { flexDirection: "row", borderBottom: `0.5px solid ${BORDER}` },
  td: { padding: 3, fontSize: 7 },
  colNum: { width: 28, borderRight: `0.5px solid ${BORDER}` },
  colLabel: { flex: 1, borderRight: `0.5px solid ${BORDER}` },
  colMark: { width: 22, textAlign: "center", borderRight: `0.5px solid ${BORDER}` },
  colObs: { width: 110 },
  correctivaItem: { padding: 3, borderBottom: `0.5px solid ${BORDER}`, fontSize: 8 },
  obsBox: { border: `1px solid ${BORDER}`, padding: 6, marginTop: 8, minHeight: 30 },
  firma: { marginTop: 40, alignItems: "center", width: 200 },
  firmaLine: { borderTop: "1px solid #1a1a1a", width: 180, marginBottom: 3 },
});

export type ChecklistPDFData = {
  correlativo: number;
  fecha: string; // ISO
  tipoMantencion: string;
  empresa: string;
  patente: string | null;
  tipoEquipo: string | null;
  km: number | null;
  horometro: number | null;
  proximaMantencion: number | null;
  encargado: string | null;
  items: ChecklistMantData | null;
  observaciones: string | null;
};

const ce = React.createElement;

function fechaUTC(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", { timeZone: "UTC" });
}
function fmt(n: number | null): string {
  return n != null ? n.toLocaleString("es-CL") : "—";
}
function mark(valor: ValorItem | null | undefined, col: ValorItem): string {
  return valor === col ? "X" : "";
}

function thRow() {
  return ce(
    View,
    { style: styles.thRow, fixed: true },
    ce(Text, { style: [styles.th, styles.colNum] }, "N°"),
    ce(Text, { style: [styles.th, styles.colLabel] }, "Detalle"),
    ce(Text, { style: [styles.th, styles.colMark] }, "SI"),
    ce(Text, { style: [styles.th, styles.colMark] }, "NO"),
    ce(Text, { style: [styles.th, styles.colMark] }, "N/A"),
    ce(Text, { style: [styles.th, styles.colObs] }, "Observaciones"),
  );
}

function itemRow(item: ItemMant, valores: Record<string, ItemValor> | undefined) {
  const v = valores?.[item.codigo];
  return ce(
    View,
    { key: item.codigo, style: styles.row, wrap: false },
    ce(Text, { style: [styles.td, styles.colNum] }, item.codigo),
    ce(Text, { style: [styles.td, styles.colLabel] }, item.label),
    ce(Text, { style: [styles.td, styles.colMark] }, mark(v?.valor, "SI")),
    ce(Text, { style: [styles.td, styles.colMark] }, mark(v?.valor, "NO")),
    ce(Text, { style: [styles.td, styles.colMark] }, mark(v?.valor, "NA")),
    ce(Text, { style: [styles.td, styles.colObs] }, v?.obs ?? ""),
  );
}

export function ChecklistMantencionDocument({ data }: { data: ChecklistPDFData }) {
  const infos: [string, string][] = [
    ["Correlativo", String(data.correlativo)],
    ["Fecha", fechaUTC(data.fecha)],
    ["Tipo Mant.", data.tipoMantencion],
    ["Empresa", data.empresa],
    ["Patente", data.patente ?? "—"],
    ["Tipo Equipo", data.tipoEquipo ?? "—"],
    ["KM", fmt(data.km)],
    ["HR", fmt(data.horometro)],
    ["Próx. Mant.", fmt(data.proximaMantencion)],
  ];
  const correctivas = data.items?.seccion_c ?? [];

  return ce(
    Document,
    {},
    ce(
      Page,
      { size: "A4", style: styles.page },
      ce(
        View,
        { style: styles.header },
        ce(Image, { style: styles.logo, src: getLogoSrc() }),
        ce(Text, { style: styles.brand }, EMPRESA_NOMBRE),
      ),
      ce(Text, { style: styles.title }, "CHECK LIST MANTENIMIENTO"),
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
      ce(Text, { style: styles.secHead }, "1.0 MANTENIMIENTO DEL FABRICANTE (A)"),
      thRow(),
      ...SECCION_A.map((item) => itemRow(item, data.items?.seccion_a)),
      ce(Text, { style: styles.secHead }, "2.0 MANTENIMIENTO PREVENTIVO (B)"),
      thRow(),
      ...SECCION_B.map((item) => itemRow(item, data.items?.seccion_b)),
      ce(Text, { style: styles.secHead }, "MANTENCIÓN CORRECTIVA (C)"),
      correctivas.length
        ? ce(
            View,
            {},
            ...correctivas.map((r, i) =>
              ce(Text, { key: i, style: styles.correctivaItem }, `${i + 1}.  ${r}`),
            ),
          )
        : ce(Text, { style: styles.correctivaItem }, "Sin mantenciones correctivas."),
      ce(Text, { style: [styles.secHead, { backgroundColor: "transparent", color: BLUE }] }, "Observaciones generales"),
      ce(Text, { style: styles.obsBox }, data.observaciones ?? ""),
      ce(
        View,
        { style: styles.firma },
        ce(View, { style: styles.firmaLine }),
        ce(Text, { style: { fontSize: 8, fontWeight: 700 } }, data.encargado ?? "Firma Encargado"),
        ce(Text, { style: { fontSize: 7, color: "#6b7280" } }, "Firma Encargado"),
      ),
    ),
  );
}
