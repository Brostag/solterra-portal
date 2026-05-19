// NOTE: same convention as invoice/purchase-order templates.
// @react-pdf/reconciler v0.23 no reconoce react.transitional.element
// (creado por el JSX transform de React 18.3 en dev). React.createElement
// siempre crea react.element. NO convertir a JSX.
import React from "react";
import {
  Document, Page, Text, View, StyleSheet, Font, Image,
} from "@react-pdf/renderer";
import path from "path";
import type { CotizadorInput, CotizadorResult } from "@/lib/cotizador";

const LOGO_URL = "https://ext.same-assets.com/2134444905/2150008532.png";

Font.register({
  family: "Inter",
  fonts: [
    { src: path.join(process.cwd(), "public", "fonts", "Inter-Regular.ttf"), fontWeight: 400 },
    { src: path.join(process.cwd(), "public", "fonts", "Inter-Bold.ttf"),    fontWeight: 700 },
  ],
});

const BLUE   = "#253158";
const RED    = "#c6352e";
const GRAY   = "#6b7280";
const LGRAY  = "#9ca3af";
const BORDER = "#d1d5db";

const styles = StyleSheet.create({
  page: { fontFamily: "Inter", fontSize: 10, color: "#1a1a1a", padding: 40 },

  // Encabezado
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  emisorLogo: { width: 150, height: 50, objectFit: "contain", marginBottom: 6 },
  emisorName: { fontSize: 13, fontWeight: 700, color: BLUE, marginBottom: 2 },
  emisorLine: { fontSize: 9, color: GRAY, marginBottom: 1 },

  // Recuadro tipo documento
  docBox: { border: `2px solid ${BLUE}`, borderRadius: 3, padding: "10 12", width: 200, alignItems: "center" },
  docTipo: { fontSize: 11, fontWeight: 700, color: BLUE, textAlign: "center", marginBottom: 5 },
  docSub:  { fontSize: 8, color: LGRAY, textAlign: "center", marginBottom: 1 },
  docDate: { fontSize: 9, color: "#1a1a1a", textAlign: "center", borderTop: `1px solid ${BORDER}`, paddingTop: 6, marginTop: 4 },

  // Banner aviso (rojo claro)
  warnBanner: {
    backgroundColor: "#fef2f2",
    border: `1px solid #fca5a5`,
    borderRadius: 3,
    padding: "6 12",
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  warnText: {
    fontSize: 10,
    fontWeight: 700,
    color: "#b91c1c",
    textAlign: "center",
    flex: 1,
    letterSpacing: 0.5,
  },

  divider: { borderBottom: `1px solid ${BORDER}`, marginVertical: 7 },

  // Tabla genérica
  tableHeader: { flexDirection: "row", backgroundColor: BLUE, paddingVertical: 5, paddingHorizontal: 8 },
  tableRow:    { flexDirection: "row", borderBottom: `1px solid #f3f4f6`, paddingVertical: 4, paddingHorizontal: 8 },
  tableRowAlt: { flexDirection: "row", borderBottom: `1px solid #f3f4f6`, paddingVertical: 4, paddingHorizontal: 8, backgroundColor: "#f9fafb" },
  tableRowTotal: { flexDirection: "row", paddingVertical: 5, paddingHorizontal: 8, borderTop: `1px solid ${BORDER}`, backgroundColor: "#f3f4f6" },
  thText:      { fontSize: 8, color: "#ffffff", fontWeight: 700 },
  tdText:      { fontSize: 9, color: "#374151" },
  tdTextBold:  { fontSize: 9, color: "#1a1a1a", fontWeight: 700 },

  // Tabla equipos (columnas)
  colItemEquipo:    { flex: 1, paddingRight: 4 },
  colItemTipo:      { width: 46, textAlign: "right" },
  colItemValorHora: { width: 70, textAlign: "right" },
  colItemHorasMin:  { width: 48, textAlign: "right" },
  colItemCantidad:  { width: 56, textAlign: "right" },
  colItemSubtotal:  { width: 80, textAlign: "right" },

  // Tabla gastos (columnas)
  colDesc:     { flex: 1 },
  colAmount:   { width: 110, textAlign: "right" },

  sectionTitle: { fontSize: 8, fontWeight: 700, color: BLUE, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6, marginTop: 4 },

  // Resumen totales
  bottomRow: { flexDirection: "row", justifyContent: "flex-end", marginTop: 10 },
  resumeBox:    { width: "55%", border: `1px solid ${BORDER}`, borderRadius: 3, overflow: "hidden" },
  resumeHeader: { backgroundColor: BLUE, paddingVertical: 4, paddingHorizontal: 8 },
  resumeHeaderText: { fontSize: 8, color: "#ffffff", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 },
  resumeBody:   { padding: "8 10" },
  totalRow:     { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  totalLabel:   { fontSize: 9, color: GRAY },
  totalValue:   { fontSize: 9, color: "#1a1a1a" },
  grandRow:     { flexDirection: "row", justifyContent: "space-between", backgroundColor: BLUE, padding: "6 8", marginHorizontal: -10, marginBottom: -8, marginTop: 4 },
  grandLabel:   { fontSize: 11, fontWeight: 700, color: "#ffffff" },
  grandValue:   { fontSize: 11, fontWeight: 700, color: "#ffffff" },

  // Nota legal
  legalNote: {
    marginTop: 10,
    padding: "7 10",
    borderRadius: 3,
    backgroundColor: "#fffbeb",
    border: `1px solid #fcd34d`,
  },
  legalLabel: { fontSize: 8, fontWeight: 700, color: "#92400e", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 3 },
  legalText:  { fontSize: 9, color: "#374151", lineHeight: 1.4 },

  // Footer
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, borderTop: `1px solid ${BORDER}`, paddingTop: 6 },
  footerRow:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footerLeft:   { flex: 1, fontSize: 7, color: LGRAY },
  footerCenter: { flex: 1, fontSize: 8, fontWeight: 700, color: BLUE, textAlign: "center" },
  footerRight:  { flex: 1, fontSize: 7, color: LGRAY, textAlign: "right" },
});

function fmtCLP(n: number): string {
  return `$${Math.round(n).toLocaleString("es-CL")}`;
}

export interface CotizadorPDFData {
  input:  CotizadorInput;
  result: CotizadorResult;
  fecha:  Date;
  company: {
    razon_social: string;
    rut:          string;
    giro?:        string | null;
    direccion?:   string | null;
    email?:       string | null;
    telefono?:    string | null;
  };
}

const ce = React.createElement;

export function CotizadorDocument({ data }: { data: CotizadorPDFData }) {
  const { input, result, fecha, company } = data;
  const hasDesc = input.porcentajeDescuento > 0;

  const gastoRows: { key: string; label: string; value: number }[] = [
    { key: "combustible", label: "Combustible", value: input.gastos.combustible },
    { key: "operador",    label: "Operador",    value: input.gastos.operador },
    { key: "traslado",    label: "Traslado",    value: input.gastos.traslado },
    { key: "peajes",      label: "Peajes",      value: input.gastos.peajes },
    { key: "viaticos",    label: "Viáticos",    value: input.gastos.viaticos },
    { key: "alojamiento", label: "Alojamiento", value: input.gastos.alojamiento },
    { key: "mantencion",  label: "Mantención",  value: input.gastos.mantencion },
    { key: "seguro",      label: "Seguro",      value: input.gastos.seguro },
    { key: "otros",       label: "Otros",       value: input.gastos.otros },
  ];
  const gastoRowsVisibles = gastoRows.filter((g) => g.value > 0);

  return ce(Document, null,
    ce(Page, { size: "A4", style: styles.page },

      // ── ENCABEZADO ──
      ce(View, { style: styles.topRow },
        ce(View, { style: { flex: 1, paddingRight: 14 } },
          ce(Image, { src: LOGO_URL, style: styles.emisorLogo }),
          ce(Text, { style: styles.emisorName }, company.razon_social),
          ce(Text, { style: styles.emisorLine }, `RUT: ${company.rut}`),
          company.giro      ? ce(Text, { style: styles.emisorLine }, `Giro: ${company.giro}`) : null,
          company.direccion ? ce(Text, { style: styles.emisorLine }, company.direccion) : null,
          company.telefono  ? ce(Text, { style: styles.emisorLine }, `Tel: ${company.telefono}`) : null,
          company.email     ? ce(Text, { style: styles.emisorLine }, company.email) : null,
        ),

        ce(View, { style: styles.docBox },
          ce(Text, { style: styles.docTipo }, "PRESUPUESTO"),
          ce(Text, { style: styles.docTipo }, "DE ARRIENDO"),
          ce(Text, { style: styles.docSub }, "Documento referencial"),
          ce(Text, { style: styles.docDate },
            `Emisión: ${fecha.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" })}`,
          ),
        ),
      ),

      ce(View, { style: styles.divider }),

      // ── BANNER DE AVISO ──
      ce(View, { style: styles.warnBanner },
        ce(Text, { style: styles.warnText }, "PRESUPUESTO REFERENCIAL — NO VÁLIDO COMO FACTURA"),
      ),

      // ── TABLA DE EQUIPOS / SERVICIOS ──
      ce(Text, { style: styles.sectionTitle }, "Equipos y servicios"),
      ce(View, { style: styles.tableHeader },
        ce(Text, { style: [styles.thText, styles.colItemEquipo] }, "Equipo / Servicio"),
        ce(Text, { style: [styles.thText, styles.colItemTipo] }, "Tipo"),
        ce(Text, { style: [styles.thText, styles.colItemValorHora] }, "Valor hora"),
        ce(Text, { style: [styles.thText, styles.colItemHorasMin] }, "H. mín."),
        ce(Text, { style: [styles.thText, styles.colItemCantidad] }, "Cantidad"),
        ce(Text, { style: [styles.thText, styles.colItemSubtotal] }, "Subtotal"),
      ),
      ...result.items.map((it, i) => {
        const tipoLabel = it.tipo === "horas" ? "Horas" : "Días";
        const cantUnit  = it.tipo === "horas" ? "h" : "d";
        const horasMinDisplay = it.tipo === "dias" ? `${it.horasMinimasDiarias} h` : "—";
        return ce(View, { key: it.id, style: i % 2 === 0 ? styles.tableRow : styles.tableRowAlt },
          ce(Text, { style: [styles.tdText, styles.colItemEquipo] }, it.equipo),
          ce(Text, { style: [styles.tdText, styles.colItemTipo] }, tipoLabel),
          ce(Text, { style: [styles.tdText, styles.colItemValorHora] }, fmtCLP(it.valorHora)),
          ce(Text, { style: [styles.tdText, styles.colItemHorasMin] }, horasMinDisplay),
          ce(Text, { style: [styles.tdText, styles.colItemCantidad] }, `${it.cantidad} ${cantUnit}`),
          ce(Text, { style: [styles.tdTextBold, styles.colItemSubtotal] }, fmtCLP(it.subtotal)),
        );
      }),
      ce(View, { style: styles.tableRowTotal },
        ce(Text, { style: [styles.tdTextBold, styles.colItemEquipo] }, "Subtotal equipos"),
        ce(Text, { style: [styles.tdText, styles.colItemTipo] }, ""),
        ce(Text, { style: [styles.tdText, styles.colItemValorHora] }, ""),
        ce(Text, { style: [styles.tdText, styles.colItemHorasMin] }, ""),
        ce(Text, { style: [styles.tdText, styles.colItemCantidad] }, ""),
        ce(Text, { style: [styles.tdTextBold, styles.colItemSubtotal] }, fmtCLP(result.subtotalEquipos)),
      ),

      // ── GASTOS GENERALES ──
      ce(Text, { style: styles.sectionTitle }, "Gastos generales"),
      ce(View, { style: styles.tableHeader },
        ce(Text, { style: [styles.thText, styles.colDesc] }, "Concepto"),
        ce(Text, { style: [styles.thText, styles.colAmount] }, "Monto CLP"),
      ),
      ...(gastoRowsVisibles.length > 0
        ? gastoRowsVisibles.map((g, i) =>
            ce(View, { key: g.key, style: i % 2 === 0 ? styles.tableRow : styles.tableRowAlt },
              ce(Text, { style: [styles.tdText, styles.colDesc] }, g.label),
              ce(Text, { style: [styles.tdText, styles.colAmount] }, fmtCLP(g.value)),
            )
          )
        : [
            ce(View, { key: "sin-gastos", style: styles.tableRow },
              ce(Text, { style: [styles.tdText, styles.colDesc, { color: LGRAY }] }, "Sin gastos generales"),
            ),
          ]),
      ce(View, { style: styles.tableRowTotal },
        ce(Text, { style: [styles.tdTextBold, styles.colDesc] }, "Total gastos generales"),
        ce(Text, { style: [styles.tdTextBold, styles.colAmount] }, fmtCLP(result.gastosGeneralesTotal)),
      ),

      // ── RESUMEN ──
      ce(View, { style: styles.bottomRow },
        ce(View, { style: styles.resumeBox },
          ce(View, { style: styles.resumeHeader },
            ce(Text, { style: styles.resumeHeaderText }, "Resumen"),
          ),
          ce(View, { style: styles.resumeBody },
            ce(View, { style: styles.totalRow },
              ce(Text, { style: styles.totalLabel }, "Subtotal equipos"),
              ce(Text, { style: styles.totalValue }, fmtCLP(result.subtotalEquipos)),
            ),
            ce(View, { style: styles.totalRow },
              ce(Text, { style: styles.totalLabel }, "Gastos generales"),
              ce(Text, { style: styles.totalValue }, fmtCLP(result.gastosGeneralesTotal)),
            ),
            ce(View, { style: styles.totalRow },
              ce(Text, { style: styles.totalLabel }, "Subtotal"),
              ce(Text, { style: styles.totalValue }, fmtCLP(result.subtotal)),
            ),
            hasDesc
              ? ce(View, { style: styles.totalRow },
                  ce(Text, { style: styles.totalLabel }, `Descuento (${input.porcentajeDescuento}%)`),
                  ce(Text, { style: [styles.totalValue, { color: RED }] }, `−${fmtCLP(result.descuentoMonto)}`),
                )
              : null,
            ce(View, { style: styles.totalRow },
              ce(Text, { style: styles.totalLabel }, "Neto"),
              ce(Text, { style: styles.totalValue }, fmtCLP(result.neto)),
            ),
            ce(View, { style: styles.totalRow },
              ce(Text, { style: styles.totalLabel }, `IVA ${input.ivaPorcentaje}%`),
              ce(Text, { style: styles.totalValue }, fmtCLP(result.iva)),
            ),
            ce(View, { style: styles.grandRow },
              ce(Text, { style: styles.grandLabel }, "TOTAL CLP"),
              ce(Text, { style: styles.grandValue }, fmtCLP(result.total)),
            ),
          ),
        ),
      ),

      // ── NOTA LEGAL ──
      ce(View, { style: styles.legalNote },
        ce(Text, { style: styles.legalLabel }, "Importante"),
        ce(Text, { style: styles.legalText },
          "Este presupuesto es referencial y válido a la fecha de emisión. Los valores pueden variar " +
          "según disponibilidad, condiciones del servicio y fecha de contratación. No constituye factura " +
          "ni documento tributario.",
        ),
      ),

      // ── FOOTER ──
      ce(View, { style: styles.footer, fixed: true },
        ce(View, { style: styles.footerRow },
          ce(Text, { style: styles.footerLeft },
            company.razon_social + " · RUT " + company.rut +
            (company.telefono ? " · Tel: " + company.telefono : "") +
            (company.email ? " · " + company.email : ""),
          ),
          ce(Text, { style: styles.footerCenter }, "Presupuesto referencial"),
          ce(Text, { style: styles.footerRight },
            fecha.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" }),
          ),
        ),
      ),
    ),
  );
}
