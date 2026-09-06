// React.createElement siempre (bug @react-pdf/reconciler v0.23 con JSX). NO JSX.
import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { registerFonts, PDF_COLORS, EMPRESA_NOMBRE } from "./pdf-base";

registerFonts();

const { BLUE, GRAY, BORDER } = PDF_COLORS;

const styles = StyleSheet.create({
  page: { fontFamily: "Inter", fontSize: 9.5, color: "#1a1a1a", padding: 40, lineHeight: 1.4 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 },
  brand: { fontSize: 15, fontWeight: 700, color: BLUE },
  brandSub: { fontSize: 8, color: GRAY, marginTop: 2 },
  docNum: { fontSize: 10, fontWeight: 700, color: "#1a1a1a", textAlign: "right" },
  docCity: { fontSize: 9, color: GRAY, textAlign: "right", marginTop: 2 },
  title: { fontSize: 13, fontWeight: 700, textAlign: "center", textDecoration: "underline", marginVertical: 16, color: "#1a1a1a" },
  grid: { flexDirection: "row", flexWrap: "wrap", border: `1px solid ${BORDER}`, marginBottom: 16 },
  cell: { width: "50%", flexDirection: "row", borderRight: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` },
  cellLabel: { width: 150, padding: 5, fontWeight: 700, color: "#374151", backgroundColor: "#f1f5f9", fontSize: 8.5 },
  cellValue: { flex: 1, padding: 5, fontSize: 8.5 },
  secHead: { fontSize: 9.5, fontWeight: 700, color: BLUE, marginTop: 10, marginBottom: 3 },
  secBody: { fontSize: 9, marginBottom: 4 },
  firmas: { flexDirection: "row", justifyContent: "center", gap: 48, marginTop: 56 },
  firmaCol: { alignItems: "center", width: 200 },
  firmaLine: { borderTop: "1px solid #1a1a1a", width: 180, marginBottom: 4 },
  firmaName: { fontSize: 9, fontWeight: 700, color: "#1a1a1a", textAlign: "center" },
  firmaRole: { fontSize: 8, color: GRAY, textAlign: "center" },
});

export type OTPDFData = {
  equipoCodigo: string | null;
  equipoNombre: string | null;
  tipoEquipo: string | null;
  marca: string | null;
  patente: string | null;
  tipoMantencion: string;
  estado: string;
  responsable: string | null;
  fechaInicio: string; // ISO, DateTime en hora local
  fechaFin: string | null; // ISO, DateTime en hora local
  horometroRealizada: number | null;
  costo: number | null;
  proximaMantencionHorometro: number | null;
  proximaMantencionFecha: string | null; // ISO date (@db.Date, medianoche UTC)
  descripcion: string;
  trabajosRealizados: string | null;
  repuestosUsados: string | null;
  observaciones: string | null;
};

const ce = React.createElement;

// mant_mantenciones no tiene campo ciudad (a diferencia de
// MantCertificadoMantencion, que sí lo persiste). La sede de referencia de
// Mantención es Calama, igual que el default del resto de sus documentos.
const CIUDAD = "Calama";

function fechaLocalCorta(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function fechaLocalLarga(iso: string): string {
  return new Date(iso).toLocaleString("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// Para proxima_mantencion_fecha (@db.Date, medianoche UTC): formatear con
// timeZone UTC para no retroceder un día en Chile (UTC-4).
function fechaUTC(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

function fmt(n: number | null): string {
  return n != null ? n.toLocaleString("es-CL") : "—";
}

function gridCell(label: string, value: string, key: number) {
  return ce(
    View,
    { key, style: styles.cell },
    ce(Text, { style: styles.cellLabel }, label),
    ce(Text, { style: styles.cellValue }, value),
  );
}

export function OrdenTrabajoDocument({ data }: { data: OTPDFData }) {
  const equipo = data.equipoNombre
    ? `${data.equipoCodigo ?? ""} ${data.equipoNombre}`.trim()
    : "—";

  const datos: [string, string][] = [
    ["Equipo", equipo],
    ["Tipo de equipo", data.tipoEquipo ?? "—"],
    ["Marca", data.marca ?? "—"],
    ["Patente", data.patente ?? "—"],
    ["Tipo de mantención", data.tipoMantencion],
    ["Estado", data.estado],
    ["Responsable", data.responsable ?? "—"],
    ["Fecha de inicio", fechaLocalLarga(data.fechaInicio)],
    ["Fecha de término", data.fechaFin ? fechaLocalLarga(data.fechaFin) : "—"],
    [
      "Horómetro al realizar",
      data.horometroRealizada != null ? `${fmt(data.horometroRealizada)} h` : "—",
    ],
    ["Costo", data.costo != null ? `$${fmt(data.costo)}` : "—"],
    [
      "Próx. mantención (horómetro)",
      data.proximaMantencionHorometro != null
        ? `${fmt(data.proximaMantencionHorometro)} h`
        : "—",
    ],
    [
      "Próx. mantención (fecha)",
      data.proximaMantencionFecha ? fechaUTC(data.proximaMantencionFecha) : "—",
    ],
    ["", ""],
  ];

  const textos = (
    [
      ["Descripción", data.descripcion],
      ["Trabajos realizados", data.trabajosRealizados],
      ["Repuestos usados", data.repuestosUsados],
      ["Observaciones", data.observaciones],
    ] as [string, string | null][]
  ).filter((t): t is [string, string] => Boolean(t[1]));

  return ce(
    Document,
    {},
    ce(
      Page,
      { size: "A4", style: styles.page },
      ce(
        View,
        { style: styles.topRow },
        ce(
          View,
          {},
          ce(Text, { style: styles.brand }, EMPRESA_NOMBRE),
          ce(Text, { style: styles.brandSub }, "Movimiento de Tierra, Maquinarias y Equipos"),
        ),
        ce(
          View,
          {},
          ce(Text, { style: styles.docNum }, `OT · ${data.equipoCodigo ?? "—"}`),
          ce(Text, { style: styles.docCity }, `${CIUDAD}, ${fechaLocalCorta(data.fechaInicio)}`),
        ),
      ),
      ce(Text, { style: styles.title }, "ORDEN DE TRABAJO"),
      ce(View, { style: styles.grid }, ...datos.map((d, i) => gridCell(d[0], d[1], i))),
      ...textos.map(([label, value]) =>
        ce(
          View,
          { key: label },
          ce(Text, { style: styles.secHead }, label),
          ce(Text, { style: styles.secBody }, value),
        ),
      ),
      ce(
        View,
        { style: styles.firmas },
        ce(
          View,
          { style: styles.firmaCol },
          ce(View, { style: styles.firmaLine }),
          ce(Text, { style: styles.firmaName }, data.responsable ?? "Encargado Mantención"),
          ce(Text, { style: styles.firmaRole }, "Encargado Mantención · SOLTERRA SPA"),
        ),
        ce(
          View,
          { style: styles.firmaCol },
          ce(View, { style: styles.firmaLine }),
          // La OT no persiste quién administra la orden (a diferencia del
          // certificado, que sí guarda gerente_id). La línea va genérica para
          // que el documento sea reproducible: el mismo PDF descargado por
          // cualquier usuario debe salir idéntico.
          ce(Text, { style: styles.firmaName }, "Administración"),
          ce(Text, { style: styles.firmaRole }, EMPRESA_NOMBRE),
        ),
      ),
    ),
  );
}
