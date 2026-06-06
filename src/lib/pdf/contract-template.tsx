// NOTE: misma convención que invoice/purchase-order/cotizador templates.
// @react-pdf/reconciler v0.23 no reconoce react.transitional.element (creado
// por el JSX transform de React 18.3 en dev). React.createElement siempre crea
// react.element. NO convertir a JSX.
import React from "react";
import {
  Document, Page, Text, View, StyleSheet, Font, Image,
} from "@react-pdf/renderer";
import path from "path";
import { CONDICIONES_GENERALES } from "./contract-clauses";

const LOGO_URL = "https://ext.same-assets.com/2134444905/2150008532.png";

Font.register({
  family: "Inter",
  fonts: [
    { src: path.join(process.cwd(), "public", "fonts", "Inter-Regular.ttf"), fontWeight: 400 },
    { src: path.join(process.cwd(), "public", "fonts", "Inter-Bold.ttf"),    fontWeight: 700 },
  ],
});

const BLUE   = "#253158";
const GRAY   = "#4b5563";
const LGRAY  = "#9ca3af";
const BORDER = "#d1d5db";

// Datos fijos de la Arrendadora (Solterra SpA). No provienen del contrato.
const SOLTERRA = {
  razon:        "SOLTERRA SPA",
  rut:          "76.021.667-4",
  representante:"Mauricio Salvatierra Gale",
  ci:           "10.513.115-1",
  domicilio:    "Juan Zaldívar St 20, Barrio Industrial, Puerto Seco, Comuna de Calama",
  correo:       "maquinarias@solterra.cl",
  banco:        "BCI",
  cuenta:       "21643351",
};

const styles = StyleSheet.create({
  page: { fontFamily: "Inter", fontSize: 8.5, color: "#1a1a1a", padding: 40, paddingBottom: 56, lineHeight: 1.35 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14, borderBottom: `1.5px solid ${BLUE}`, paddingBottom: 8 },
  logo: { width: 120, height: 38, objectFit: "contain" },
  headerRight: { alignItems: "flex-end" },
  docNum: { fontSize: 12, fontWeight: 700, color: BLUE },
  docTitle: { fontSize: 8, color: GRAY, marginTop: 2, textTransform: "uppercase", letterSpacing: 0.5 },
  intro: { fontSize: 8.5, color: "#1a1a1a", textAlign: "justify", marginBottom: 10 },
  clausula: { marginBottom: 8 },
  clausulaTitulo: { fontSize: 8.5, fontWeight: 700, color: BLUE, marginBottom: 3 },
  parrafo: { fontSize: 8.5, color: "#1a1a1a", textAlign: "justify", marginBottom: 3 },
  // Firmas
  firmasRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 28 },
  firmaCol: { width: "45%", alignItems: "center" },
  firmaLine: { borderTop: `1px solid #1a1a1a`, width: "100%", marginBottom: 3, marginTop: 24 },
  firmaName: { fontSize: 8.5, fontWeight: 700, color: "#1a1a1a", textAlign: "center" },
  firmaSub: { fontSize: 7.5, color: GRAY, textAlign: "center" },
  firmaEmpresa: { fontSize: 8, fontWeight: 700, color: BLUE, textAlign: "center", marginTop: 2 },
  // Anexo
  sectionTitle: { fontSize: 11, fontWeight: 700, color: BLUE, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
  sectionSub: { fontSize: 9, fontWeight: 700, color: GRAY, marginBottom: 10 },
  anexoMetaRow: { flexDirection: "row", marginBottom: 2 },
  anexoLabel: { fontSize: 8.5, color: GRAY, width: 150 },
  anexoValue: { fontSize: 8.5, color: "#1a1a1a", fontWeight: 700, flex: 1 },
  equipoBox: { border: `1px solid ${BORDER}`, borderRadius: 3, padding: 8, marginTop: 8 },
  equipoTitulo: { fontSize: 9, fontWeight: 700, color: BLUE, marginBottom: 4, borderBottom: `1px solid ${BORDER}`, paddingBottom: 3 },
  dataGrid: { flexDirection: "row", flexWrap: "wrap" },
  dataCell: { width: "33.33%", marginBottom: 3, paddingRight: 6 },
  dataCellLabel: { fontSize: 7, color: LGRAY, textTransform: "uppercase", letterSpacing: 0.3 },
  dataCellValue: { fontSize: 8.5, color: "#1a1a1a", fontWeight: 700 },
  valoresBox: { marginTop: 6, backgroundColor: "#f6f7f9", borderRadius: 3, padding: 7 },
  valorRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 2 },
  valorLabel: { fontSize: 8.5, color: GRAY },
  valorValue: { fontSize: 8.5, color: BLUE, fontWeight: 700 },
  nota: { fontSize: 7.5, color: LGRAY, marginTop: 10, textAlign: "justify" },
});

const ce = React.createElement;

export interface ContractEquipoPDF {
  descripcion: string;
  marca: string | null;
  modelo: string | null;
  patente: string | null;
  anio: number | null;
  chasis: string | null;
  motor: string | null;
  color: string | null;
  horometro_inicial: string | null;
  mantenimiento_horas: string | null;
  valor_hora: number;
  horas_minimas_mensuales: number | null;
  tarifa_hora_extra: number | null;
  valor_mensual_estimado: number | null;
}

export interface ContractPDFData {
  numero_contrato: string;
  ciudad_celebracion: string | null;
  fecha: Date;
  vigencia_contrato: string | null;
  cliente: { nombre: string; rut: string | null; direccion: string | null; email: string | null };
  representante_cliente: string | null;
  rut_representante: string | null;
  numero_anexo: string | null;
  fecha_anexo: Date | null;
  numero_cotizacion: string | null;
  lugar_operacion: string | null;
  forma_pago: string | null;
  correo_notificaciones: string | null;
  moneda: string;
  equipos: ContractEquipoPDF[];
}

function dash(v?: string | number | null): string {
  if (v === null || v === undefined) return "—";
  const s = String(v).trim();
  return s === "" ? "—" : s;
}

function fmtFecha(d: Date | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("es-CL", { day: "numeric", month: "long", year: "numeric" });
}

function fmtMoneda(n: number | null, moneda: string): string {
  if (n === null || n === undefined) return "—";
  if (moneda === "CLP") return `$${Math.round(n).toLocaleString("es-CL")}`;
  return `${moneda} ${n.toLocaleString("es-CL", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function metaRow(label: string, value: string) {
  return ce(View, { style: styles.anexoMetaRow },
    ce(Text, { style: styles.anexoLabel }, label),
    ce(Text, { style: styles.anexoValue }, value),
  );
}

function dataCell(label: string, value: string) {
  return ce(View, { style: styles.dataCell },
    ce(Text, { style: styles.dataCellLabel }, label),
    ce(Text, { style: styles.dataCellValue }, value),
  );
}

function valorRow(label: string, value: string) {
  return ce(View, { style: styles.valorRow },
    ce(Text, { style: styles.valorLabel }, label),
    ce(Text, { style: styles.valorValue }, value),
  );
}

function header(numero: string) {
  return ce(View, { style: styles.header, fixed: true },
    ce(Image, { style: styles.logo, src: LOGO_URL }),
    ce(View, { style: styles.headerRight },
      ce(Text, { style: styles.docNum }, `CONTRATO ${numero}`),
      ce(Text, { style: styles.docTitle }, "Condiciones Generales de Arrendamiento"),
    ),
  );
}

function firmas(repCliente: string, ciCliente: string, empresaCliente: string) {
  return ce(View, { style: styles.firmasRow, wrap: false },
    ce(View, { style: styles.firmaCol },
      ce(View, { style: styles.firmaLine }),
      ce(Text, { style: styles.firmaName }, SOLTERRA.representante),
      ce(Text, { style: styles.firmaSub }, SOLTERRA.ci),
      ce(Text, { style: styles.firmaEmpresa }, SOLTERRA.razon),
    ),
    ce(View, { style: styles.firmaCol },
      ce(View, { style: styles.firmaLine }),
      ce(Text, { style: styles.firmaName }, repCliente),
      ce(Text, { style: styles.firmaSub }, ciCliente),
      ce(Text, { style: styles.firmaEmpresa }, empresaCliente),
    ),
  );
}

export function ContractDocument({ data }: { data: ContractPDFData }) {
  const vigencia = dash(data.vigencia_contrato) === "—" ? "2 años" : (data.vigencia_contrato as string);
  const ciudad = dash(data.ciudad_celebracion) === "—" ? "Calama" : (data.ciudad_celebracion as string);
  const repCliente = dash(data.representante_cliente) === "—" ? "—" : (data.representante_cliente as string);
  const ciCliente = dash(data.rut_representante);

  const intro =
    `En ${ciudad} de Chile a ${fmtFecha(data.fecha)}, entre, por una parte, ${SOLTERRA.razon}, ` +
    `Rol Único Tributario N° ${SOLTERRA.rut}, representada por don ${SOLTERRA.representante}, ` +
    `cédula nacional de identidad N° ${SOLTERRA.ci}, domiciliada en ${SOLTERRA.domicilio} (“Arrendadora”); ` +
    `y por la otra, ${dash(data.cliente.nombre)}, Rol Único Tributario N° ${dash(data.cliente.rut)}, ` +
    `representada por ${repCliente}, cédula nacional de identidad N° ${ciCliente}, ` +
    `domiciliada en ${dash(data.cliente.direccion)} (“Arrendataria”); se ha convenido la celebración del ` +
    `presente contrato de arrendamiento (Contrato) de bien(es) mueble(s), el que se regirá por los ` +
    `siguientes términos y condiciones:`;

  return ce(Document, { title: `Contrato ${data.numero_contrato}`, author: "Solterra SpA" },
    // ── Condiciones generales (fluye a varias páginas) ──
    ce(Page, { size: "A4", style: styles.page },
      header(data.numero_contrato),
      ce(Text, { style: styles.intro }, intro),
      ...CONDICIONES_GENERALES.map((cl, i) =>
        ce(View, { key: `cl-${i}`, style: styles.clausula, wrap: true },
          ce(Text, { style: styles.clausulaTitulo }, cl.titulo),
          ...cl.parrafos.map((p, j) =>
            ce(Text, { key: `p-${j}`, style: styles.parrafo }, p.replace("{{VIGENCIA}}", vigencia)),
          ),
        ),
      ),
      firmas(repCliente, ciCliente, dash(data.cliente.nombre)),
    ),
    // ── Condiciones particulares / Anexo (página nueva) ──
    ce(Page, { size: "A4", style: styles.page },
      header(data.numero_contrato),
      ce(Text, { style: styles.sectionTitle }, "Condiciones Particulares"),
      ce(Text, { style: styles.sectionSub },
        `Anexo ${dash(data.numero_anexo)} / Contrato ${data.numero_contrato}`),
      metaRow("Sres.:", dash(data.cliente.nombre)),
      metaRow("RUT:", dash(data.cliente.rut)),
      metaRow("Fecha:", `${ciudad}, ${fmtFecha(data.fecha_anexo ?? data.fecha)}`),
      metaRow("Cotización Solterra N°:", dash(data.numero_cotizacion)),
      metaRow("Lugar de operación / entrega:", dash(data.lugar_operacion)),
      metaRow("Condición de pago:", dash(data.forma_pago)),
      metaRow("Correo para notificaciones:", dash(data.correo_notificaciones)),
      ce(Text, { style: { fontSize: 8, color: GRAY, marginTop: 8, marginBottom: 2 } },
        "Por la presente se informan los datos correspondientes a la(s) máquina(s) que será(n) entregada(s) en arriendo:"),
      ...data.equipos.map((eq, i) =>
        ce(View, { key: `eq-${i}`, style: styles.equipoBox, wrap: false },
          ce(Text, { style: styles.equipoTitulo },
            `Equipo ${i + 1}: ${dash(eq.descripcion)}`),
          ce(View, { style: styles.dataGrid },
            dataCell("Marca", dash(eq.marca)),
            dataCell("Modelo", dash(eq.modelo)),
            dataCell("Patente", dash(eq.patente)),
            dataCell("Año", dash(eq.anio)),
            dataCell("N° Chasis", dash(eq.chasis)),
            dataCell("N° Motor", dash(eq.motor)),
            dataCell("Color", dash(eq.color)),
            dataCell("Horómetro inicial", dash(eq.horometro_inicial)),
            dataCell("Mantención cada", dash(eq.mantenimiento_horas)),
          ),
          ce(View, { style: styles.valoresBox },
            valorRow("Valor arriendo neto por hora", fmtMoneda(eq.valor_hora, data.moneda)),
            valorRow("Horas mínimas mensuales", dash(eq.horas_minimas_mensuales)),
            valorRow("Tarifa hora extra", fmtMoneda(eq.tarifa_hora_extra, data.moneda)),
            valorRow("Valor mensual estimado (neto)", fmtMoneda(eq.valor_mensual_estimado, data.moneda)),
          ),
        ),
      ),
      ce(Text, { style: styles.nota },
        "Los valores indicados son netos y no incluyen IVA. La Renta de Arrendamiento se rige por la Cláusula Tercera de las Condiciones Generales. Datos de pago: Titular SOLTERRA SPA · RUT 76.021.667-4 · Banco BCI · Cuenta N° 21643351."),
      firmas(repCliente, ciCliente, dash(data.cliente.nombre)),
    ),
  );
}
