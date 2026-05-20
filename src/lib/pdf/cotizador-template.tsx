// NOTE: same convention as invoice/purchase-order templates.
// @react-pdf/reconciler v0.23 no reconoce react.transitional.element
// (creado por el JSX transform de React 18.3 en dev). React.createElement
// siempre crea react.element. NO convertir a JSX.
import React from "react";
import {
  Document, Page, Text, View, StyleSheet, Font, Image,
} from "@react-pdf/renderer";
import path from "path";
import type { CotizadorInput, CotizadorResult, CotizadorItemResult } from "@/lib/cotizador";

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
const HEADDIV = "#454f73";

// Filas mínimas del cuerpo de la tabla de equipos: con pocos equipos se
// rellena con filas vacías para conservar el aspecto de documento formal.
const MIN_FILAS = 5;

const styles = StyleSheet.create({
  page: { fontFamily: "Inter", fontSize: 10, color: "#1a1a1a", padding: 36, paddingBottom: 70 },

  // ── Encabezado ──
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  emisorCol: { flex: 1, paddingRight: 16 },
  emisorLogo: { width: 135, height: 44, objectFit: "contain", marginBottom: 6 },
  emisorName: { fontSize: 12.5, fontWeight: 700, color: BLUE, marginBottom: 2 },
  emisorLine: { fontSize: 8.5, color: GRAY, marginBottom: 1 },

  // Recuadro tipo documento (azul corporativo)
  docBox: { border: `2px solid ${BLUE}`, width: 200 },
  docBoxTop: { padding: "7 10", alignItems: "center" },
  docTipo: { fontSize: 11, fontWeight: 700, color: BLUE, textAlign: "center" },
  docSub: { fontSize: 8, color: LGRAY, textAlign: "center", marginTop: 3 },
  docFootWrap: { borderTop: `1px solid ${BORDER}`, padding: "5 9" },
  docFootRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  docFootLabel: { fontSize: 7.5, color: LGRAY },
  docFootValue: { fontSize: 7.5, color: "#1a1a1a", fontWeight: 700 },

  // ── Caja datos presupuesto / condiciones ──
  infoBox: { flexDirection: "row", border: `1px solid ${BORDER}`, marginBottom: 10 },
  infoLeft: { flex: 1, padding: "8 10", borderRight: `1px solid ${BORDER}` },
  infoRight: { width: 230, padding: "8 10" },
  infoTitle: { fontSize: 7.5, fontWeight: 700, color: LGRAY, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 5 },
  infoRow: { flexDirection: "row", alignItems: "flex-start", marginBottom: 3 },
  infoLabel: { fontSize: 8.5, color: GRAY, width: 76 },
  infoLabelR: { fontSize: 8.5, color: GRAY, width: 88 },
  infoValue: { fontSize: 8.5, color: "#1a1a1a", fontWeight: 700, flex: 1 },

  // ── Títulos de sección ──
  sectionTitle: { fontSize: 8, fontWeight: 700, color: BLUE, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 5, marginTop: 4 },
  sectionTitleGap: { fontSize: 8, fontWeight: 700, color: BLUE, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 5, marginTop: 12 },

  // ── Tablas (bordes completos) ──
  tableBox: { borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: BORDER, borderStyle: "solid" },
  tableHeadRow: { flexDirection: "row", backgroundColor: BLUE, borderBottom: `1px solid ${BORDER}` },
  tableRow: { flexDirection: "row", borderBottom: `1px solid ${BORDER}`, minHeight: 24 },
  thCell: { fontSize: 8, color: "#ffffff", fontWeight: 700, paddingVertical: 6, paddingHorizontal: 5 },
  tdCell: { fontSize: 9, color: "#374151", paddingVertical: 6, paddingHorizontal: 5 },
  tdCellBold: { fontSize: 9, color: "#1a1a1a", fontWeight: 700, paddingVertical: 6, paddingHorizontal: 5 },
  tdCellMuted: { fontSize: 9, color: LGRAY, paddingVertical: 6, paddingHorizontal: 5 },
  cellDiv: { borderRight: `1px solid ${BORDER}` },
  cellDivH: { borderRight: `1px solid ${HEADDIV}` },

  // Columnas tabla equipos
  colNum: { width: 26, textAlign: "center" },
  colEquipo: { flex: 1, textAlign: "left" },
  colTipo: { width: 44, textAlign: "center" },
  colVHora: { width: 68, textAlign: "right" },
  colHMin: { width: 42, textAlign: "right" },
  colCant: { width: 54, textAlign: "right" },
  colSub: { width: 86, textAlign: "right" },

  // Columnas tabla gastos
  colGasto: { flex: 1, textAlign: "left" },
  colMonto: { width: 130, textAlign: "right" },

  // ── Resumen / totales ──
  totalsArea: { flexDirection: "row", justifyContent: "flex-end", marginTop: 10 },
  totalsBox: { width: 240, border: `1px solid ${BORDER}` },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, paddingHorizontal: 10, borderBottom: `1px solid ${BORDER}` },
  totalLabel: { fontSize: 9, color: GRAY },
  totalValue: { fontSize: 9, color: "#1a1a1a", fontWeight: 700 },
  grandRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 7, paddingHorizontal: 10, backgroundColor: BLUE },
  grandLabel: { fontSize: 10.5, fontWeight: 700, color: "#ffffff" },
  grandValue: { fontSize: 12.5, fontWeight: 700, color: "#ffffff" },

  // ── Nota legal ──
  legalNote: { marginTop: 10, padding: "7 10", borderRadius: 3, backgroundColor: "#fffbeb", border: `1px solid #fcd34d` },
  legalLabel: { fontSize: 8, fontWeight: 700, color: "#92400e", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 3 },
  legalText: { fontSize: 9, color: "#374151", lineHeight: 1.4 },

  // ── Footer ──
  footer: { position: "absolute", bottom: 22, left: 36, right: 36, borderTop: `1px solid ${BORDER}`, paddingTop: 5 },
  footerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footerLeft: { flex: 1, fontSize: 7, color: LGRAY },
  footerCenter: { flex: 1, fontSize: 7.5, fontWeight: 700, color: BLUE, textAlign: "center" },
  footerRight: { flex: 1, fontSize: 7, color: LGRAY, textAlign: "right" },
});

function fmtCLP(n: number): string {
  return `$${Math.round(n).toLocaleString("es-CL")}`;
}

function tipoCotizacionLabel(items: CotizadorItemResult[]): string {
  const tipos = new Set(items.map((it) => it.tipo));
  if (tipos.size === 0) return "—";
  if (tipos.size > 1) return "Mixto";
  return tipos.has("horas") ? "Por horas" : "Por días";
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

function headerRowEquipos() {
  return ce(View, { style: styles.tableHeadRow, wrap: false },
    ce(Text, { style: [styles.thCell, styles.colNum, styles.cellDivH] }, "N°"),
    ce(Text, { style: [styles.thCell, styles.colEquipo, styles.cellDivH] }, "Equipo / Servicio"),
    ce(Text, { style: [styles.thCell, styles.colTipo, styles.cellDivH] }, "Tipo"),
    ce(Text, { style: [styles.thCell, styles.colVHora, styles.cellDivH] }, "Valor hora"),
    ce(Text, { style: [styles.thCell, styles.colHMin, styles.cellDivH] }, "H. mín."),
    ce(Text, { style: [styles.thCell, styles.colCant, styles.cellDivH] }, "Cantidad"),
    ce(Text, { style: [styles.thCell, styles.colSub] }, "Subtotal"),
  );
}

function dataRowEquipo(it: CotizadorItemResult, index: number) {
  const tipoLabel = it.tipo === "horas" ? "Horas" : "Días";
  const cantUnit  = it.tipo === "horas" ? "h" : "d";
  const horasMin  = it.tipo === "dias" ? `${it.horasMinimasDiarias} h` : "—";
  return ce(View, { key: it.id, style: styles.tableRow, wrap: false },
    ce(Text, { style: [styles.tdCell, styles.colNum, styles.cellDiv] }, String(index + 1)),
    ce(Text, { style: [styles.tdCell, styles.colEquipo, styles.cellDiv] }, it.equipo),
    ce(Text, { style: [styles.tdCell, styles.colTipo, styles.cellDiv] }, tipoLabel),
    ce(Text, { style: [styles.tdCell, styles.colVHora, styles.cellDiv] }, fmtCLP(it.valorHora)),
    ce(Text, { style: [styles.tdCell, styles.colHMin, styles.cellDiv] }, horasMin),
    ce(Text, { style: [styles.tdCell, styles.colCant, styles.cellDiv] }, `${it.cantidad} ${cantUnit}`),
    ce(Text, { style: [styles.tdCellBold, styles.colSub] }, fmtCLP(it.subtotal)),
  );
}

function emptyRowEquipo(index: number) {
  return ce(View, { key: `e${index}`, style: styles.tableRow, wrap: false },
    ce(View, { style: [styles.colNum, styles.cellDiv] }),
    ce(View, { style: [styles.colEquipo, styles.cellDiv] }),
    ce(View, { style: [styles.colTipo, styles.cellDiv] }),
    ce(View, { style: [styles.colVHora, styles.cellDiv] }),
    ce(View, { style: [styles.colHMin, styles.cellDiv] }),
    ce(View, { style: [styles.colCant, styles.cellDiv] }),
    ce(View, { style: [styles.colSub] }),
  );
}

function headerRowGastos() {
  return ce(View, { style: styles.tableHeadRow, wrap: false },
    ce(Text, { style: [styles.thCell, styles.colGasto, styles.cellDivH] }, "Concepto"),
    ce(Text, { style: [styles.thCell, styles.colMonto] }, "Monto CLP"),
  );
}

function dataRowGasto(label: string, value: number, key: string) {
  return ce(View, { key, style: styles.tableRow, wrap: false },
    ce(Text, { style: [styles.tdCell, styles.colGasto, styles.cellDiv] }, label),
    ce(Text, { style: [styles.tdCellBold, styles.colMonto] }, fmtCLP(value)),
  );
}

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

  const fechaStr = fecha.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit", year: "numeric" });

  const emptyRows: React.ReactElement[] = [];
  for (let k = result.items.length; k < MIN_FILAS; k++) {
    emptyRows.push(emptyRowEquipo(k));
  }

  return ce(Document, null,
    ce(Page, { size: "A4", style: styles.page },

      // ── ENCABEZADO ───────────────────────────────────────────────────────
      ce(View, { style: styles.topRow },
        ce(View, { style: styles.emisorCol },
          ce(Image, { src: LOGO_URL, style: styles.emisorLogo }),
          ce(Text, { style: styles.emisorName }, company.razon_social),
          ce(Text, { style: styles.emisorLine }, `RUT: ${company.rut}`),
          company.giro      ? ce(Text, { style: styles.emisorLine }, `Giro: ${company.giro}`) : null,
          company.direccion ? ce(Text, { style: styles.emisorLine }, company.direccion) : null,
          company.telefono  ? ce(Text, { style: styles.emisorLine }, `Tel: ${company.telefono}`) : null,
          company.email     ? ce(Text, { style: styles.emisorLine }, company.email) : null,
        ),

        ce(View, { style: styles.docBox },
          ce(View, { style: styles.docBoxTop },
            ce(Text, { style: styles.docTipo }, "PRESUPUESTO"),
            ce(Text, { style: styles.docTipo }, "DE ARRIENDO"),
            ce(Text, { style: styles.docSub }, "Documento referencial"),
          ),
          ce(View, { style: styles.docFootWrap },
            ce(View, { style: styles.docFootRow },
              ce(Text, { style: styles.docFootLabel }, "Emisión"),
              ce(Text, { style: styles.docFootValue }, fechaStr),
            ),
          ),
        ),
      ),

      // ── CAJA DATOS DEL PRESUPUESTO / CONDICIONES ─────────────────────────
      ce(View, { style: styles.infoBox },

        ce(View, { style: styles.infoLeft },
          ce(Text, { style: styles.infoTitle }, "Datos del presupuesto"),
          ce(View, { style: styles.infoRow },
            ce(Text, { style: styles.infoLabel }, "Equipo(s):"),
            ce(Text, { style: styles.infoValue },
              `${result.items.length} ${result.items.length === 1 ? "equipo" : "equipos"}`,
            ),
          ),
          ce(View, { style: styles.infoRow },
            ce(Text, { style: styles.infoLabel }, "Tipo cotización:"),
            ce(Text, { style: styles.infoValue }, tipoCotizacionLabel(result.items)),
          ),
          ce(View, { style: styles.infoRow },
            ce(Text, { style: styles.infoLabel }, "Moneda:"),
            ce(Text, { style: styles.infoValue }, "CLP"),
          ),
          ce(View, { style: styles.infoRow },
            ce(Text, { style: styles.infoLabel }, "Fecha emisión:"),
            ce(Text, { style: styles.infoValue }, fechaStr),
          ),
        ),

        ce(View, { style: styles.infoRight },
          ce(Text, { style: styles.infoTitle }, "Condiciones"),
          ce(View, { style: styles.infoRow },
            ce(Text, { style: styles.infoLabelR }, "IVA:"),
            ce(Text, { style: styles.infoValue }, `${input.ivaPorcentaje}%`),
          ),
          ce(View, { style: styles.infoRow },
            ce(Text, { style: styles.infoLabelR }, "Descuento:"),
            ce(Text, { style: styles.infoValue }, `${input.porcentajeDescuento}%`),
          ),
          ce(View, { style: styles.infoRow },
            ce(Text, { style: styles.infoLabelR }, "Gastos generales:"),
            ce(Text, { style: styles.infoValue }, fmtCLP(result.gastosGeneralesTotal)),
          ),
          ce(View, { style: styles.infoRow },
            ce(Text, { style: styles.infoLabelR }, "Validez:"),
            ce(Text, { style: styles.infoValue }, "Referencial a la fecha de emisión"),
          ),
        ),
      ),

      // ── TABLA DE EQUIPOS / SERVICIOS ─────────────────────────────────────
      ce(Text, { style: styles.sectionTitle }, "Equipos y servicios"),
      ce(View, { style: styles.tableBox },
        headerRowEquipos(),
        ...result.items.map((it, i) => dataRowEquipo(it, i)),
        ...emptyRows,
      ),

      // ── GASTOS GENERALES ─────────────────────────────────────────────────
      ce(Text, { style: styles.sectionTitleGap }, "Gastos generales"),
      ce(View, { style: styles.tableBox },
        headerRowGastos(),
        ...(gastoRowsVisibles.length > 0
          ? gastoRowsVisibles.map((g) => dataRowGasto(g.label, g.value, g.key))
          : [
              ce(View, { key: "sin-gastos", style: styles.tableRow },
                ce(Text, { style: [styles.tdCellMuted, { flex: 1 }] }, "Sin gastos generales"),
              ),
            ]),
      ),

      // ── RESUMEN ──────────────────────────────────────────────────────────
      ce(View, { style: styles.totalsArea },
        ce(View, { style: styles.totalsBox },
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
            ce(Text, { style: styles.totalLabel }, `IVA (${input.ivaPorcentaje}%)`),
            ce(Text, { style: styles.totalValue }, fmtCLP(result.iva)),
          ),
          ce(View, { style: styles.grandRow },
            ce(Text, { style: styles.grandLabel }, "TOTAL CLP"),
            ce(Text, { style: styles.grandValue }, fmtCLP(result.total)),
          ),
        ),
      ),

      // ── NOTA LEGAL ───────────────────────────────────────────────────────
      ce(View, { style: styles.legalNote },
        ce(Text, { style: styles.legalLabel }, "Importante"),
        ce(Text, { style: styles.legalText },
          "Este presupuesto es referencial y válido a la fecha de emisión. Los valores pueden variar " +
          "según disponibilidad, condiciones del servicio y fecha de contratación. No constituye factura " +
          "ni documento tributario.",
        ),
      ),

      // ── FOOTER ───────────────────────────────────────────────────────────
      ce(View, { style: styles.footer, fixed: true },
        ce(View, { style: styles.footerRow },
          ce(Text, { style: styles.footerLeft },
            company.razon_social + " · RUT " + company.rut +
            (company.telefono ? " · Tel: " + company.telefono : "") +
            (company.email ? " · " + company.email : ""),
          ),
          ce(Text, { style: styles.footerCenter }, "Presupuesto referencial"),
          ce(Text, { style: styles.footerRight }, fechaStr),
        ),
      ),
    ),
  );
}
