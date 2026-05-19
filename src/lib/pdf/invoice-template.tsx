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

const styles = StyleSheet.create({
  page: { fontFamily: "Inter", fontSize: 10, color: "#1a1a1a", padding: 40, paddingBottom: 72 },

  // ── Encabezado: emisor izquierda + recuadro fiscal derecha ──
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 },
  emisorCol: { flex: 1, paddingRight: 16 },
  emisorLogo: { width: 150, height: 50, objectFit: "contain", marginBottom: 8 },
  emisorName: { fontSize: 13, fontWeight: 700, color: BLUE, marginBottom: 3 },
  emisorLine: { fontSize: 9, color: GRAY, marginBottom: 1.5 },

  // Recuadro fiscal rojo (estilo factura chilena)
  dteBox: { border: `2px solid ${RED}`, borderRadius: 4, width: 192 },
  dteBoxInner: { padding: "9 12", alignItems: "center" },
  dteRut: { fontSize: 9, fontWeight: 700, color: BLUE, textAlign: "center", marginBottom: 4 },
  dteTipo: { fontSize: 11, fontWeight: 700, color: RED, textAlign: "center", marginBottom: 6 },
  dteNumLabel: { fontSize: 8, color: LGRAY, textAlign: "center", marginBottom: 1 },
  dteNum: { fontSize: 17, fontWeight: 700, color: BLUE, textAlign: "center" },
  dteAdmin: { fontSize: 7, color: LGRAY, textAlign: "center", borderTop: `1px solid ${BORDER}`, padding: "5 8", lineHeight: 1.4 },

  divider: { borderBottom: `1px solid ${BORDER}`, marginBottom: 12 },

  // ── Caja cliente / documento ──
  infoBox: { flexDirection: "row", border: `1px solid ${BORDER}`, borderRadius: 4, marginBottom: 12 },
  infoLeft: { flex: 1, padding: "9 11", borderRight: `1px solid ${BORDER}` },
  infoRight: { width: 215, padding: "9 11" },
  sectionLabel: { fontSize: 7.5, color: LGRAY, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 5, fontWeight: 700 },
  clientName: { fontSize: 11, fontWeight: 700, color: BLUE, marginBottom: 2 },
  clientLine: { fontSize: 9, color: GRAY, marginBottom: 1.5 },
  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  metaLabel: { fontSize: 9, color: LGRAY },
  metaValue: { fontSize: 9, color: "#1a1a1a", fontWeight: 700 },
  badge: { fontSize: 7.5, paddingHorizontal: 7, paddingVertical: 2, borderRadius: 3, textTransform: "uppercase", letterSpacing: 0.5, color: "#ffffff", fontWeight: 700 },

  // ── Nota tipo de cambio ──
  currencyNote: { backgroundColor: "#eff6ff", borderRadius: 3, padding: "5 8", marginBottom: 10, fontSize: 9, color: "#1d4ed8" },

  // ── Tabla de detalle ──
  tableHeader: { flexDirection: "row", backgroundColor: BLUE, paddingVertical: 6, paddingHorizontal: 6 },
  tableRow: { flexDirection: "row", borderBottom: `1px solid #eef0f2`, paddingVertical: 6, paddingHorizontal: 6 },
  tableRowAlt: { flexDirection: "row", borderBottom: `1px solid #eef0f2`, paddingVertical: 6, paddingHorizontal: 6, backgroundColor: "#f9fafb" },
  colNum: { width: 26, textAlign: "center" },
  colCod: { width: 62, textAlign: "left" },
  colQty: { width: 46, textAlign: "right" },
  colDesc: { flex: 1, paddingHorizontal: 4 },
  colPrice: { width: 80, textAlign: "right" },
  colTotal: { width: 82, textAlign: "right" },
  thText: { fontSize: 8, color: "#ffffff", fontWeight: 700 },
  tdText: { fontSize: 9, color: "#374151" },
  tdTextBold: { fontSize: 9, color: "#1a1a1a", fontWeight: 700 },

  // ── Totales ──
  totalsArea: { flexDirection: "row", justifyContent: "flex-end", marginTop: 12 },
  totalsBox: { width: 240, border: `1px solid ${BORDER}`, borderRadius: 4, overflow: "hidden" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", padding: "5 11" },
  totalLabel: { fontSize: 9, color: GRAY },
  totalValue: { fontSize: 9, color: "#1a1a1a", fontWeight: 700 },
  grandRow: { flexDirection: "row", justifyContent: "space-between", padding: "7 11", backgroundColor: BLUE },
  grandLabel: { fontSize: 11, fontWeight: 700, color: "#ffffff" },
  grandValue: { fontSize: 11, fontWeight: 700, color: "#ffffff" },

  // ── ANULADA watermark ──
  watermarkWrap: { position: "absolute", top: 280, left: 0, right: 0, alignItems: "center" },
  watermarkText: { fontSize: 68, fontWeight: 700, color: "#fca5a5" },

  // ── Anulación box ──
  anulBox: { backgroundColor: "#fef2f2", border: `1px solid #fca5a5`, borderRadius: 3, padding: "8 10", marginTop: 12 },
  anulLabel: { fontSize: 8, color: "#dc2626", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  anulText: { fontSize: 9, color: "#374151" },

  // ── Footer ──
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, borderTop: `1px solid ${BORDER}`, paddingTop: 6 },
  footerLine: { fontSize: 7, color: LGRAY, textAlign: "center", marginBottom: 2 },
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

export function InvoiceDocument({ invoice }: { invoice: InvoiceData }) {
  const isAnulada = invoice.estado === "ANULADA";
  const hasCod = invoice.items.some((i) => i.codigo_interno);

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
          ce(View, { style: styles.dteBoxInner },
            ce(Text, { style: styles.dteRut }, `RUT: ${invoice.company.rut}`),
            ce(Text, { style: styles.dteTipo }, "FACTURA ADMINISTRATIVA"),
            ce(Text, { style: styles.dteNumLabel }, "N°"),
            ce(Text, { style: styles.dteNum }, invoice.numero_factura),
          ),
          ce(Text, { style: styles.dteAdmin },
            "Documento administrativo interno. No constituye DTE válido ante el SII.",
          ),
        ),
      ),

      ce(View, { style: styles.divider }),

      // ── CAJA RECEPTOR + DATOS DEL DOCUMENTO ──────────────────────────────
      ce(View, { style: styles.infoBox },

        ce(View, { style: styles.infoLeft },
          ce(Text, { style: styles.sectionLabel }, "Señor(es) / Razón Social"),
          ce(Text, { style: styles.clientName }, invoice.client.nombre),
          invoice.client.rut
            ? ce(Text, { style: styles.clientLine }, `RUT: ${invoice.client.rut}`)
            : null,
          invoice.client.direccion
            ? ce(Text, { style: styles.clientLine }, invoice.client.direccion)
            : null,
          invoice.client.email
            ? ce(Text, { style: styles.clientLine }, invoice.client.email)
            : null,
        ),

        ce(View, { style: styles.infoRight },
          ce(Text, { style: styles.sectionLabel }, "Datos del documento"),
          ce(View, { style: styles.metaRow },
            ce(Text, { style: styles.metaLabel }, "Fecha emisión"),
            ce(Text, { style: styles.metaValue },
              new Date(invoice.fecha_emision).toLocaleDateString("es-CL"),
            ),
          ),
          ce(View, { style: styles.metaRow },
            ce(Text, { style: styles.metaLabel }, "Moneda"),
            ce(Text, { style: styles.metaValue }, invoice.moneda),
          ),
          ce(View, { style: styles.metaRow },
            ce(Text, { style: styles.metaLabel }, "IVA"),
            ce(Text, { style: styles.metaValue }, `${invoice.ivaPercent}%`),
          ),
          ce(View, { style: styles.metaRow },
            ce(Text, { style: styles.metaLabel }, "Estado"),
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

      // ── TABLA DE DETALLE ─────────────────────────────────────────────────
      ce(View, { style: styles.tableHeader },
        ce(Text, { style: [styles.thText, styles.colNum] }, "N°"),
        hasCod ? ce(Text, { style: [styles.thText, styles.colCod] }, "Código") : null,
        ce(Text, { style: [styles.thText, styles.colQty] }, "Cantidad"),
        ce(Text, { style: [styles.thText, styles.colDesc] }, "Descripción"),
        ce(Text, { style: [styles.thText, styles.colPrice] }, "Precio Unit."),
        ce(Text, { style: [styles.thText, styles.colTotal] }, "Total"),
      ),

      ...invoice.items.map((item, i) =>
        ce(View, { key: i, style: i % 2 === 0 ? styles.tableRow : styles.tableRowAlt },
          ce(Text, { style: [styles.tdText, styles.colNum] }, String(i + 1)),
          hasCod
            ? ce(Text, { style: [styles.tdText, styles.colCod] }, item.codigo_interno ?? "—")
            : null,
          ce(Text, { style: [styles.tdText, styles.colQty] }, String(Number(item.cantidad))),
          ce(Text, { style: [styles.tdText, styles.colDesc] }, item.descripcion),
          ce(Text, { style: [styles.tdText, styles.colPrice] }, fmt(Number(item.precio_unitario), invoice.moneda)),
          ce(Text, { style: [styles.tdTextBold, styles.colTotal] }, fmt(Number(item.subtotal), invoice.moneda)),
        )
      ),

      // ── TOTALES ──────────────────────────────────────────────────────────
      ce(View, { style: styles.totalsArea },
        ce(View, { style: styles.totalsBox },
          ce(View, { style: styles.totalRow },
            ce(Text, { style: styles.totalLabel }, "Monto neto"),
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
          invoice.company.razon_social +
          ` · RUT ${invoice.company.rut}` +
          (invoice.company.giro ? ` · ${invoice.company.giro}` : "") +
          (invoice.company.direccion ? ` · ${invoice.company.direccion}` : "") +
          (invoice.company.telefono ? ` · Tel: ${invoice.company.telefono}` : "") +
          (invoice.company.email ? ` · ${invoice.company.email}` : ""),
        ),
        ce(Text, { style: styles.footerLegal },
          "Documento generado por SOLTERRA AppWeb. " +
          "No constituye DTE válido ante el SII mientras no exista integración tributaria electrónica.",
        ),
      ),
    ),
  );
}
