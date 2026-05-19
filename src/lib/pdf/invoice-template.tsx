// NOTE: This file intentionally uses React.createElement instead of JSX.
// @react-pdf/reconciler uses react-reconciler v0.23 which does not recognize
// React 18.3's react.transitional.element (created by the new JSX transform
// in development mode). React.createElement always creates react.element,
// which the reconciler does recognize. Do not convert back to JSX.
import React from "react";
import {
  Document, Page, Text, View, StyleSheet, Font, Image,
} from "@react-pdf/renderer";
import path from "path";

const LOGO_URL = "https://ext.same-assets.com/2134444905/2150008532.png";

Font.register({
  family: "Inter",
  fonts: [
    { src: path.join(process.cwd(), "public", "fonts", "Inter-Regular.ttf"), fontWeight: 400, fontStyle: "normal" },
    { src: path.join(process.cwd(), "public", "fonts", "Inter-Regular.ttf"), fontWeight: 400, fontStyle: "italic" },
    { src: path.join(process.cwd(), "public", "fonts", "Inter-Bold.ttf"), fontWeight: 700, fontStyle: "normal" },
    { src: path.join(process.cwd(), "public", "fonts", "Inter-Bold.ttf"), fontWeight: 700, fontStyle: "italic" },
  ],
});

const BLUE = "#253158";
const RED = "#c6352e";
const GRAY = "#6b7280";
const LGRAY = "#9ca3af";
const BORDER = "#d1d5db";
const HEADDIV = "#454f73";

// Filas mínimas del cuerpo de la tabla: con pocos ítems se rellena con filas
// vacías para que el documento conserve el aspecto de una factura tradicional.
const MIN_FILAS = 6;

const styles = StyleSheet.create({
  page: { fontFamily: "Inter", fontSize: 10, color: "#1a1a1a", padding: 36, paddingBottom: 70 },

  // ── Encabezado: emisor izquierda + recuadro fiscal derecha ──
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  emisorCol: { flex: 1, paddingRight: 16 },
  emisorLogo: { width: 135, height: 44, objectFit: "contain", marginBottom: 6 },
  emisorName: { fontSize: 12.5, fontWeight: 700, color: BLUE, marginBottom: 2 },
  emisorLine: { fontSize: 8.5, color: GRAY, marginBottom: 1 },

  // Recuadro fiscal rojo (estilo factura administrativa)
  dteBox: { border: `2px solid ${RED}`, width: 200 },
  dteBoxTop: { padding: "7 10", alignItems: "center" },
  dteRut: { fontSize: 8.5, fontWeight: 700, color: BLUE, textAlign: "center" },
  dteTipo: { fontSize: 10.5, fontWeight: 700, color: RED, textAlign: "center", marginVertical: 3 },
  dteNumLabel: { fontSize: 8, color: LGRAY, textAlign: "center" },
  dteNum: { fontSize: 15, fontWeight: 700, color: BLUE, textAlign: "center" },
  dteFootWrap: { borderTop: `1px solid ${BORDER}`, padding: "4 8" },
  dteFootText: { fontSize: 7, color: LGRAY, textAlign: "center", lineHeight: 1.35 },

  // ── Caja datos cliente / documento ──
  infoBox: { flexDirection: "row", border: `1px solid ${BORDER}`, marginBottom: 10 },
  infoLeft: { flex: 1, padding: "8 10", borderRight: `1px solid ${BORDER}` },
  infoRight: { width: 212, padding: "8 10" },
  infoTitle: { fontSize: 7.5, fontWeight: 700, color: LGRAY, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 5 },
  infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 3 },
  infoLabel: { fontSize: 8.5, color: GRAY, width: 58 },
  infoLabelR: { fontSize: 8.5, color: GRAY, width: 78 },
  infoValue: { fontSize: 8.5, color: "#1a1a1a", fontWeight: 700, flex: 1 },
  infoClientName: { fontSize: 8.5, color: BLUE, fontWeight: 700, flex: 1 },
  badge: { fontSize: 7, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, textTransform: "uppercase", letterSpacing: 0.4, color: "#ffffff", fontWeight: 700 },

  // ── Nota tipo de cambio ──
  currencyNote: { backgroundColor: "#eff6ff", borderRadius: 3, padding: "5 8", marginBottom: 8, fontSize: 8.5, color: "#1d4ed8" },

  // ── Tabla de detalle (bordes completos) ──
  tableBox: { borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: BORDER, borderStyle: "solid" },
  tableHeadRow: { flexDirection: "row", backgroundColor: BLUE, borderBottom: `1px solid ${BORDER}` },
  tableRow: { flexDirection: "row", borderBottom: `1px solid ${BORDER}`, minHeight: 24 },
  thCell: { fontSize: 8, color: "#ffffff", fontWeight: 700, paddingVertical: 6, paddingHorizontal: 5 },
  tdCell: { fontSize: 9, color: "#374151", paddingVertical: 6, paddingHorizontal: 5 },
  tdCellBold: { fontSize: 9, color: "#1a1a1a", fontWeight: 700, paddingVertical: 6, paddingHorizontal: 5 },
  cellDiv: { borderRight: `1px solid ${BORDER}` },
  cellDivH: { borderRight: `1px solid ${HEADDIV}` },
  colNum: { width: 30, textAlign: "center" },
  colQty: { width: 54, textAlign: "center" },
  colCod: { width: 66, textAlign: "left" },
  colDesc: { flex: 1, textAlign: "left" },
  colPrice: { width: 80, textAlign: "right" },
  colTotal: { width: 84, textAlign: "right" },

  // ── Totales ──
  totalsArea: { flexDirection: "row", justifyContent: "flex-end", marginTop: 10 },
  totalsBox: { width: 238, border: `1px solid ${BORDER}` },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, paddingHorizontal: 10, borderBottom: `1px solid ${BORDER}` },
  totalLabel: { fontSize: 9, color: GRAY },
  totalValue: { fontSize: 9, color: "#1a1a1a", fontWeight: 700 },
  grandRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 7, paddingHorizontal: 10, backgroundColor: BLUE },
  grandLabel: { fontSize: 10.5, fontWeight: 700, color: "#ffffff" },
  grandValue: { fontSize: 12.5, fontWeight: 700, color: "#ffffff" },

  // ── ANULADA watermark ──
  watermarkWrap: { position: "absolute", top: 290, left: 0, right: 0, alignItems: "center" },
  watermarkText: { fontSize: 66, fontWeight: 700, color: "#fca5a5" },

  // ── Anulación box ──
  anulBox: { backgroundColor: "#fef2f2", border: `1px solid #fca5a5`, borderRadius: 3, padding: "7 10", marginTop: 10 },
  anulLabel: { fontSize: 8, color: "#dc2626", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 },
  anulText: { fontSize: 9, color: "#374151" },

  // ── Footer ──
  footer: { position: "absolute", bottom: 22, left: 36, right: 36, borderTop: `1px solid ${BORDER}`, paddingTop: 5 },
  footerLine: { fontSize: 7, color: GRAY, textAlign: "center", marginBottom: 1.5 },
  footerLegal: { fontSize: 7, color: LGRAY, textAlign: "center", fontStyle: "italic" },
});

function fmt(amount: number, moneda: string): string {
  if (moneda === "CLP") return `$${Math.round(amount).toLocaleString("es-CL")}`;
  if (moneda === "USD") return `USD ${amount.toFixed(2)}`;
  if (moneda === "UF") return `UF ${amount.toFixed(4)}`;
  return `${amount}`;
}

function badgeColor(estado: string): string {
  switch (estado) {
    case "PAGADA":  return "#15803d";
    case "ENVIADA": return "#1d4ed8";
    case "ANULADA": return "#dc2626";
    default:        return "#6b7280";
  }
}

function estadoLabel(estado: string): string {
  const map: Record<string, string> = {
    CREADA: "Creada", ENVIADA: "Enviada", PAGADA: "Pagada", ANULADA: "Anulada",
  };
  return map[estado] ?? estado;
}

function dash(value?: string | null): string {
  return value && value.trim() !== "" ? value : "—";
}

export interface InvoiceItem {
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  codigo_interno?: string | null;
}

export interface InvoiceData {
  numero_factura: string;
  fecha_emision: Date;
  estado: string;
  motivo_anulacion?: string | null;
  moneda: string;
  tipo_cambio: number;
  fecha_tipo_cambio: Date;
  subtotal: number;
  iva: number;
  total: number;
  ivaPercent: number;
  items: InvoiceItem[];
  client: {
    nombre: string;
    rut?: string | null;
    email?: string | null;
    direccion?: string | null;
    // Pendiente de migración futura:
    // giro?: string | null;
    // ciudad?: string | null;
    // comuna?: string | null;
  };
  company: {
    razon_social: string;
    rut: string;
    giro?: string | null;
    direccion?: string | null;
    email?: string | null;
    telefono?: string | null;
    logo_url?: string | null;
    // Pendiente de migración futura:
    // ciudad?: string | null;
    // sitio_web?: string | null;
  };
}

const ce = React.createElement;

function headerRow() {
  return ce(View, { style: styles.tableHeadRow, wrap: false },
    ce(Text, { style: [styles.thCell, styles.colNum, styles.cellDivH] }, "N°"),
    ce(Text, { style: [styles.thCell, styles.colQty, styles.cellDivH] }, "Cantidad"),
    ce(Text, { style: [styles.thCell, styles.colCod, styles.cellDivH] }, "Código"),
    ce(Text, { style: [styles.thCell, styles.colDesc, styles.cellDivH] }, "Descripción"),
    ce(Text, { style: [styles.thCell, styles.colPrice, styles.cellDivH] }, "Precio Unit."),
    ce(Text, { style: [styles.thCell, styles.colTotal] }, "Total"),
  );
}

function dataRow(item: InvoiceItem, index: number, moneda: string) {
  return ce(View, { key: `d${index}`, style: styles.tableRow, wrap: false },
    ce(Text, { style: [styles.tdCell, styles.colNum, styles.cellDiv] }, String(index + 1)),
    ce(Text, { style: [styles.tdCell, styles.colQty, styles.cellDiv] }, String(Number(item.cantidad))),
    ce(Text, { style: [styles.tdCell, styles.colCod, styles.cellDiv] }, dash(item.codigo_interno)),
    ce(Text, { style: [styles.tdCell, styles.colDesc, styles.cellDiv] }, item.descripcion),
    ce(Text, { style: [styles.tdCell, styles.colPrice, styles.cellDiv] }, fmt(Number(item.precio_unitario), moneda)),
    ce(Text, { style: [styles.tdCellBold, styles.colTotal] }, fmt(Number(item.subtotal), moneda)),
  );
}

function emptyRow(index: number) {
  return ce(View, { key: `e${index}`, style: styles.tableRow, wrap: false },
    ce(View, { style: [styles.colNum, styles.cellDiv] }),
    ce(View, { style: [styles.colQty, styles.cellDiv] }),
    ce(View, { style: [styles.colCod, styles.cellDiv] }),
    ce(View, { style: [styles.colDesc, styles.cellDiv] }),
    ce(View, { style: [styles.colPrice, styles.cellDiv] }),
    ce(View, { style: [styles.colTotal] }),
  );
}

export function InvoiceDocument({ invoice }: { invoice: InvoiceData }) {
  const isAnulada = invoice.estado === "ANULADA";

  const emptyRows: React.ReactElement[] = [];
  for (let k = invoice.items.length; k < MIN_FILAS; k++) {
    emptyRows.push(emptyRow(k));
  }

  return ce(Document, null,
    ce(Page, { size: "A4", style: styles.page },

      // ANULADA watermark — se renderiza primero, queda detrás del contenido
      isAnulada
        ? ce(View, { style: styles.watermarkWrap, fixed: true },
            ce(Text, { style: styles.watermarkText }, "ANULADA"),
          )
        : null,

      // ── ENCABEZADO: emisor izquierda + recuadro fiscal derecha ───────────
      ce(View, { style: styles.topRow },

        ce(View, { style: styles.emisorCol },
          ce(Image, { src: LOGO_URL, style: styles.emisorLogo }),
          ce(Text, { style: styles.emisorName }, invoice.company.razon_social),
          ce(Text, { style: styles.emisorLine }, `RUT: ${invoice.company.rut}`),
          invoice.company.giro
            ? ce(Text, { style: styles.emisorLine }, `Giro: ${invoice.company.giro}`)
            : null,
          invoice.company.direccion
            ? ce(Text, { style: styles.emisorLine }, invoice.company.direccion)
            : null,
          invoice.company.telefono
            ? ce(Text, { style: styles.emisorLine }, `Tel: ${invoice.company.telefono}`)
            : null,
          invoice.company.email
            ? ce(Text, { style: styles.emisorLine }, invoice.company.email)
            : null,
        ),

        // Recuadro fiscal rojo
        ce(View, { style: styles.dteBox },
          ce(View, { style: styles.dteBoxTop },
            ce(Text, { style: styles.dteRut }, `R.U.T.: ${invoice.company.rut}`),
            ce(Text, { style: styles.dteTipo }, "FACTURA ADMINISTRATIVA"),
            ce(Text, { style: styles.dteNumLabel }, "N°"),
            ce(Text, { style: styles.dteNum }, invoice.numero_factura),
          ),
          ce(View, { style: styles.dteFootWrap },
            ce(Text, { style: styles.dteFootText }, "Documento interno"),
            ce(Text, { style: styles.dteFootText }, "No constituye DTE válido ante el SII"),
          ),
        ),
      ),

      // ── CAJA RECEPTOR + DATOS DEL DOCUMENTO ──────────────────────────────
      ce(View, { style: styles.infoBox },

        ce(View, { style: styles.infoLeft },
          ce(Text, { style: styles.infoTitle }, "Datos del cliente"),
          ce(View, { style: styles.infoRow },
            ce(Text, { style: styles.infoLabel }, "Señor(es):"),
            ce(Text, { style: styles.infoClientName }, invoice.client.nombre),
          ),
          ce(View, { style: styles.infoRow },
            ce(Text, { style: styles.infoLabel }, "RUT:"),
            ce(Text, { style: styles.infoValue }, dash(invoice.client.rut)),
          ),
          ce(View, { style: styles.infoRow },
            ce(Text, { style: styles.infoLabel }, "Dirección:"),
            ce(Text, { style: styles.infoValue }, dash(invoice.client.direccion)),
          ),
          ce(View, { style: styles.infoRow },
            ce(Text, { style: styles.infoLabel }, "Email:"),
            ce(Text, { style: styles.infoValue }, dash(invoice.client.email)),
          ),
        ),

        ce(View, { style: styles.infoRight },
          ce(Text, { style: styles.infoTitle }, "Datos del documento"),
          ce(View, { style: styles.infoRow },
            ce(Text, { style: styles.infoLabelR }, "Fecha emisión:"),
            ce(Text, { style: styles.infoValue },
              new Date(invoice.fecha_emision).toLocaleDateString("es-CL"),
            ),
          ),
          ce(View, { style: styles.infoRow },
            ce(Text, { style: styles.infoLabelR }, "Moneda:"),
            ce(Text, { style: styles.infoValue }, invoice.moneda),
          ),
          ce(View, { style: styles.infoRow },
            ce(Text, { style: styles.infoLabelR }, "IVA:"),
            ce(Text, { style: styles.infoValue }, `${invoice.ivaPercent}%`),
          ),
          ce(View, { style: styles.infoRow },
            ce(Text, { style: styles.infoLabelR }, "Estado:"),
            ce(Text, { style: [styles.badge, { backgroundColor: badgeColor(invoice.estado) }] },
              estadoLabel(invoice.estado),
            ),
          ),
        ),
      ),

      // Nota de tipo de cambio si aplica
      invoice.moneda !== "CLP"
        ? ce(View, { style: styles.currencyNote },
            ce(Text, null,
              `Tipo de cambio al ${new Date(invoice.fecha_tipo_cambio).toLocaleDateString("es-CL")}: ` +
              `1 ${invoice.moneda} = $${Number(invoice.tipo_cambio).toLocaleString("es-CL")} CLP`,
            ),
          )
        : null,

      // ── TABLA DE DETALLE (bordes completos) ──────────────────────────────
      ce(View, { style: styles.tableBox },
        headerRow(),
        ...invoice.items.map((item, i) => dataRow(item, i, invoice.moneda)),
        ...emptyRows,
      ),

      // ── TOTALES ──────────────────────────────────────────────────────────
      ce(View, { style: styles.totalsArea },
        ce(View, { style: styles.totalsBox },
          ce(View, { style: styles.totalRow },
            ce(Text, { style: styles.totalLabel }, "Neto"),
            ce(Text, { style: styles.totalValue }, fmt(Number(invoice.subtotal), invoice.moneda)),
          ),
          ce(View, { style: styles.totalRow },
            ce(Text, { style: styles.totalLabel }, `IVA (${invoice.ivaPercent}%)`),
            ce(Text, { style: styles.totalValue }, fmt(Number(invoice.iva), invoice.moneda)),
          ),
          ce(View, { style: styles.grandRow },
            ce(Text, { style: styles.grandLabel }, `TOTAL ${invoice.moneda}`),
            ce(Text, { style: styles.grandValue }, fmt(Number(invoice.total), invoice.moneda)),
          ),
        ),
      ),

      // ── MOTIVO ANULACIÓN ─────────────────────────────────────────────────
      isAnulada && invoice.motivo_anulacion
        ? ce(View, { style: styles.anulBox },
            ce(Text, { style: styles.anulLabel }, "Motivo de anulación"),
            ce(Text, { style: styles.anulText }, invoice.motivo_anulacion),
          )
        : null,

      // ── PIE DE PÁGINA ────────────────────────────────────────────────────
      ce(View, { style: styles.footer, fixed: true },
        ce(Text, { style: styles.footerLine },
          `${invoice.company.razon_social} · RUT ${invoice.company.rut} · ` +
          "Documento generado por SOLTERRA AppWeb.",
        ),
        ce(Text, { style: styles.footerLegal },
          "No constituye DTE válido ante el SII mientras no exista integración tributaria electrónica.",
        ),
      ),
    ),
  );
}
