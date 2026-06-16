// @react-pdf/reconciler v0.23 no reconoce react.transitional.element
// (JSX transform de React 18.3). Se usa React.createElement siempre. NO JSX.
import React from "react";
import { Document, Page, Text, View, StyleSheet, Font } from "@react-pdf/renderer";
import path from "path";

Font.register({
  family: "Inter",
  fonts: [
    { src: path.join(process.cwd(), "public", "fonts", "Inter-Regular.ttf"), fontWeight: 400 },
    { src: path.join(process.cwd(), "public", "fonts", "Inter-Bold.ttf"), fontWeight: 700 },
  ],
});

const BLUE = "#253158";
const GRAY = "#6b7280";

const styles = StyleSheet.create({
  page: { fontFamily: "Inter", fontSize: 10.5, color: "#1a1a1a", padding: 48, lineHeight: 1.5 },
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  brand: { fontSize: 16, fontWeight: 700, color: BLUE },
  brandSub: { fontSize: 8, color: GRAY, marginTop: 2 },
  docNum: { fontSize: 10, fontWeight: 700, color: "#1a1a1a", textAlign: "right" },
  docCity: { fontSize: 9, color: GRAY, textAlign: "right", marginTop: 2 },
  title: { fontSize: 14, fontWeight: 700, textAlign: "center", textDecoration: "underline", marginVertical: 18, color: "#1a1a1a" },
  para: { fontSize: 10, textAlign: "justify", marginBottom: 12 },
  bold: { fontWeight: 700 },
  bullets: { marginVertical: 6, paddingLeft: 18 },
  bullet: { fontSize: 10, marginBottom: 3 },
  firmas: { flexDirection: "row", justifyContent: "center", gap: 48, marginTop: 64 },
  firmaCol: { alignItems: "center", width: 200 },
  firmaLine: { borderTop: "1px solid #1a1a1a", width: 180, marginBottom: 4 },
  firmaName: { fontSize: 9, fontWeight: 700, color: "#1a1a1a", textAlign: "center" },
  firmaRole: { fontSize: 8, color: GRAY, textAlign: "center" },
});

export type CertificadoPDFData = {
  correlativo: number;
  ciudad: string;
  fecha: string; // ISO
  tipoEquipo: string | null;
  marca: string | null;
  patente: string | null;
  horometro: number | null;
  odometro: number | null;
  proximaMantencion: number | null;
  encargado: string | null;
  gerente: string | null;
};

const ce = React.createElement;

function fechaUTC(iso: string): string {
  return new Date(iso).toLocaleDateString("es-CL", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

function fmt(n: number | null): string {
  return n != null ? n.toLocaleString("es-CL") : "—";
}

export function CertificadoMantencionDocument({ data }: { data: CertificadoPDFData }) {
  const bullets = [
    ["Equipo: ", (data.tipoEquipo ?? "—").toUpperCase()],
    ["Marca: ", (data.marca ?? "—").toUpperCase()],
    ["Placa Patente: ", data.patente ?? "—"],
    ["Horómetro actual: ", `${fmt(data.horometro)} Hrs`],
    ["Odómetro actual: ", `${fmt(data.odometro)} Km`],
    ["Próxima Mantención: ", fmt(data.proximaMantencion)],
  ];

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
          ce(Text, { style: styles.brand }, "SOLTERRA E.I.R.L."),
          ce(Text, { style: styles.brandSub }, "Movimiento de Tierra, Maquinarias y Equipos"),
        ),
        ce(
          View,
          {},
          ce(Text, { style: styles.docNum }, `Certificado Nº ${data.correlativo}`),
          ce(Text, { style: styles.docCity }, `${data.ciudad}, ${fechaUTC(data.fecha)}`),
        ),
      ),
      ce(Text, { style: styles.title }, "CERTIFICADO MANTENCIÓN"),
      ce(
        Text,
        { style: styles.para },
        ce(Text, { style: styles.bold }, "SOLTERRA E.I.R.L. Rut: 76.021.667-4, "),
        "Empresa en el Rubro de Arriendo Maquinarias, Movimiento de Tierra y de Mantención Preventiva como Correctiva y que de acuerdo a las pautas de mantenimiento señaladas por el fabricante e impartidas por SOLTERRA E.I.R.L, se señala que existe un riguroso Plan de Mantenimiento de sus maquinarias pesadas como también a sus vehículos de menor tamaño; a su vez certifica que el siguiente vehículo motorizado",
      ),
      ce(
        View,
        { style: styles.bullets },
        ...bullets.map((b, i) =>
          ce(
            Text,
            { key: i, style: styles.bullet },
            "•  ",
            ce(Text, { style: styles.bold }, b[0]),
            b[1],
          ),
        ),
      ),
      ce(
        Text,
        { style: styles.para },
        "Ha sido inspeccionado y se encuentra en buenas condiciones, mecánicas, eléctricas, hidráulicas y operacionales para trabajar en cualquier faena minera, civil, vial u otra",
      ),
      ce(
        Text,
        { style: styles.para },
        "Se extiende el Presente Certificado a petición del interesado, para los fines que estime convenientes",
      ),
      ce(
        View,
        { style: styles.firmas },
        ce(
          View,
          { style: styles.firmaCol },
          ce(View, { style: styles.firmaLine }),
          ce(Text, { style: styles.firmaName }, data.encargado ?? "Encargado Mantención"),
          ce(Text, { style: styles.firmaRole }, "Encargado Mantención · SOLTERRA E.I.R.L"),
        ),
        ce(
          View,
          { style: styles.firmaCol },
          ce(View, { style: styles.firmaLine }),
          ce(Text, { style: styles.firmaName }, data.gerente ?? "Gerente de Operaciones"),
          ce(Text, { style: styles.firmaRole }, "Gerente de Operaciones · SOLTERRA E.I.R.L"),
        ),
      ),
    ),
  );
}
