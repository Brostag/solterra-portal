// @react-pdf/reconciler v0.23 no reconoce react.transitional.element
// (JSX transform de React 18.3). Se usa React.createElement siempre. NO JSX.
import React from "react";
import { Document, Page, Text, View, Image, StyleSheet } from "@react-pdf/renderer";
import { registerFonts, PDF_COLORS, EMPRESA_NOMBRE, getLogoSrc } from "./pdf-base";

registerFonts();

const { GRAY, BORDER } = PDF_COLORS;

const styles = StyleSheet.create({
  page: { fontFamily: "Inter", fontSize: 10.5, color: "#1a1a1a", padding: 40, lineHeight: 1.5 },
  // Cabecera: número + ciudad arriba a la derecha, logo debajo a la izquierda.
  header: { marginBottom: 16 },
  docRow: { alignItems: "flex-end", marginBottom: 10 },
  docNum: { fontSize: 10, fontWeight: 700, color: "#1a1a1a", textAlign: "right" },
  docCity: { fontSize: 9, color: GRAY, textAlign: "right", marginTop: 2 },
  logo: { width: 130, height: 58, objectFit: "contain" },
  title: { fontSize: 14, fontWeight: 700, textAlign: "center", textDecoration: "underline", marginVertical: 12, color: "#1a1a1a" },
  para: { fontSize: 10, textAlign: "justify", marginBottom: 10 },
  bold: { fontWeight: 700 },
  bullets: { marginVertical: 4, paddingLeft: 18 },
  bullet: { fontSize: 10, marginBottom: 2 },
  // Firmas: apiladas verticalmente y centradas, cada una con recuadro para
  // firmar + línea gruesa + cargo/empresa (sin nombre de persona).
  firmas: { alignItems: "center", marginTop: 24 },
  firmaCol: { alignItems: "center", marginBottom: 16 },
  firmaBox: { width: 180, height: 100, border: `1px solid ${BORDER}` },
  firmaBoxImg: { width: "100%", height: "100%", objectFit: "contain" },
  firmaLine: { borderTop: "2px solid #1a1a1a", width: 180 },
  firmaCargo: { fontSize: 9, color: "#1a1a1a", textAlign: "center", marginTop: 4 },
  firmaEmpresa: { fontSize: 9, color: "#1a1a1a", textAlign: "center" },
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
  /** Data URI (image/png o image/jpeg) de la firma digital; null si aún no se firmó (recuadro vacío para firmar a mano). */
  firmaEncargadoB64: string | null;
  firmaGerenteB64: string | null;
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

// Bloque de firma reutilizable: recuadro para la firma (o la imagen si ya
// está firmada digitalmente), línea gruesa y, debajo, cargo + empresa.
function firmaBlock(cargo: string, firmaB64: string | null) {
  return ce(
    View,
    { style: styles.firmaCol, wrap: false },
    ce(
      View,
      { style: styles.firmaBox },
      firmaB64 ? ce(Image, { style: styles.firmaBoxImg, src: firmaB64 }) : null,
    ),
    ce(View, { style: styles.firmaLine }),
    ce(Text, { style: styles.firmaCargo }, cargo),
    ce(Text, { style: styles.firmaEmpresa }, EMPRESA_NOMBRE),
  );
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
        { style: styles.header },
        ce(
          View,
          { style: styles.docRow },
          ce(Text, { style: styles.docNum }, `Certificado Nº ${data.correlativo}`),
          ce(Text, { style: styles.docCity }, `${data.ciudad}, ${fechaUTC(data.fecha)}`),
        ),
        ce(Image, { style: styles.logo, src: getLogoSrc() }),
      ),
      ce(Text, { style: styles.title }, "CERTIFICADO MANTENCIÓN"),
      ce(
        Text,
        { style: styles.para },
        ce(Text, { style: styles.bold }, "SOLTERRA SPA, Rut: 76.021.667-4, "),
        "Empresa en el Rubro de Arriendo Maquinarias, Movimiento de Tierra y de Mantención Preventiva como Correctiva y que de acuerdo a las pautas de mantenimiento señaladas por el fabricante e impartidas por SOLTERRA SPA, se señala que existe un riguroso Plan de Mantenimiento de sus maquinarias pesadas como también a sus vehículos de menor tamaño; a su vez certifica que el siguiente vehículo motorizado",
      ),
      ce(
        View,
        { style: styles.bullets },
        ...bullets.map((b, i) =>
          ce(
            Text,
            { key: i, style: styles.bullet },
            "•  - ",
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
        firmaBlock("Encargado Mantención", data.firmaEncargadoB64),
        firmaBlock("Gerente de Operaciones", data.firmaGerenteB64),
      ),
    ),
  );
}
