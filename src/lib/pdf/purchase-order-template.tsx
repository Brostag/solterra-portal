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
// vacías para conservar el aspecto de documento formal.
const MIN_FILAS = 6;

const styles = StyleSheet.create({
  page: { fontFamily: "Inter", fontSize: 10, color: "#1a1a1a", padding: 36, paddingBottom: 70 },

  // ── Encabezado: emisor izquierda + recuadro OC derecha ──
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 },
  emisorCol: { flex: 1, paddingRight: 16 },
  emisorLogo: { width: 135, height: 44, objectFit: "contain", marginBottom: 6 },
  emisorName: { fontSize: 12.5, fontWeight: 700, color: BLUE, marginBottom: 2 },
  emisorLine: { fontSize: 8.5, color: GRAY, marginBottom: 1 },

  // Recuadro OC (azul corporativo)
  ocBox: { border: `2px solid ${BLUE}`, width: 200 },
  ocBoxTop: { padding: "7 10", alignItems: "center" },
  ocTipo: { fontSize: 11, fontWeight: 700, color: BLUE, textAlign: "center" },
  ocNumLabel: { fontSize: 8, color: LGRAY, textAlign: "center", marginTop: 4 },
  ocNum: { fontSize: 15, fontWeight: 700, color: BLUE, textAlign: "center" },
  ocFootWrap: { borderTop: `1px solid ${BORDER}`, padding: "5 9" },
  ocFootRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 1.5 },
  ocFootLabel: { fontSize: 7.5, color: LGRAY },
  ocFootValue: { fontSize: 7.5, color: "#1a1a1a", fontWeight: 700 },

  // ── Caja datos proveedor / orden ──
  infoBox: { flexDirection: "row", border: `1px solid ${BORDER}`, marginBottom: 10 },
  infoLeft: { flex: 1, padding: "8 10", borderRight: `1px solid ${BORDER}` },
  infoRight: { width: 220, padding: "8 10" },
  infoTitle: { fontSize: 7.5, fontWeight: 700, color: LGRAY, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 5 },
  infoRow: { flexDirection: "row", alignItems: "center", marginBottom: 3 },
  infoLabel: { fontSize: 8.5, color: GRAY, width: 58 },
  infoLabelR: { fontSize: 8.5, color: GRAY, width: 96 },
  infoValue: { fontSize: 8.5, color: "#1a1a1a", fontWeight: 700, flex: 1 },
  infoName: { fontSize: 8.5, color: BLUE, fontWeight: 700, flex: 1 },
  badge: { fontSize: 7, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 3, textTransform: "uppercase", letterSpacing: 0.4, color: "#ffffff", fontWeight: 700 },

  // ── Nota tipo de cambio ──
  currencyNote: { backgroundColor: "#eff6ff", borderRadius: 3, padding: "5 8", marginBottom: 8, fontSize: 8.5, color: "#1d4ed8" },

  // ── Tabla de ítems (bordes completos) ──
  tableBox: { borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: BORDER, borderStyle: "solid" },
  tableHeadRow: { flexDirection: "row", backgroundColor: BLUE, borderBottom: `1px solid ${BORDER}` },
  tableRow: { flexDirection: "row", borderBottom: `1px solid ${BORDER}`, minHeight: 24 },
  thCell: { fontSize: 8, color: "#ffffff", fontWeight: 700, paddingVertical: 6, paddingHorizontal: 5 },
  tdCell: { fontSize: 9, color: "#374151", paddingVertical: 6, paddingHorizontal: 5 },
  tdCellBold: { fontSize: 9, color: "#1a1a1a", fontWeight: 700, paddingVertical: 6, paddingHorizontal: 5 },
  cellDiv: { borderRight: `1px solid ${BORDER}` },
  cellDivH: { borderRight: `1px solid ${HEADDIV}` },
  colNum: { width: 30, textAlign: "center" },
  colQty: { width: 60, textAlign: "center" },
  colDesc: { flex: 1, textAlign: "left" },
  colValor: { width: 92, textAlign: "right" },
  colTotal: { width: 96, textAlign: "right" },

  // ── Condiciones + totales ──
  bottomRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginTop: 10 },
  condBox: { flex: 1, paddingRight: 14 },
  condLabel: { fontSize: 7.5, fontWeight: 700, color: LGRAY, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 4 },
  condText: { fontSize: 8.5, color: "#374151", lineHeight: 1.4 },

  totalsBox: { width: 238, border: `1px solid ${BORDER}` },
  totalRow: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 5, paddingHorizontal: 10, borderBottom: `1px solid ${BORDER}` },
  totalLabel: { fontSize: 9, color: GRAY },
  totalValue: { fontSize: 9, color: "#1a1a1a", fontWeight: 700 },
  grandRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 7, paddingHorizontal: 10, backgroundColor: BLUE },
  grandLabel: { fontSize: 10.5, fontWeight: 700, color: "#ffffff" },
  grandValue: { fontSize: 12.5, fontWeight: 700, color: "#ffffff" },

  // ── Observaciones ──
  obsBox: { marginTop: 10, padding: "7 10", borderRadius: 3, border: `1px solid ${BORDER}` },
  obsLabel: { fontSize: 7.5, color: LGRAY, textTransform: "uppercase", letterSpacing: 0.7, marginBottom: 3, fontWeight: 700 },
  obsText: { fontSize: 8.5, color: "#374151", lineHeight: 1.4 },

  // ── ANULADA watermark ──
  watermarkWrap: { position: "absolute", top: 290, left: 0, right: 0, alignItems: "center" },
  watermarkText: { fontSize: 66, fontWeight: 700, color: "#fca5a5" },

  // ── Anulación box ──
  anulBox: { backgroundColor: "#fef2f2", border: `1px solid #fca5a5`, borderRadius: 3, padding: "7 10", marginTop: 10 },
  anulLabel: { fontSize: 8, color: "#dc2626", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 3 },
  anulText: { fontSize: 9, color: "#374151" },

  // ── Footer ──
  footer: { position: "absolute", bottom: 22, left: 36, right: 36, borderTop: `1px solid ${BORDER}`, paddingTop: 5 },
  footerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footerLeft: { flex: 1, fontSize: 7, color: GRAY },
  footerCenter: { flex: 1, fontSize: 7.5, fontWeight: 700, color: BLUE, textAlign: "center" },
  footerRight: { flex: 1, fontSize: 7, color: LGRAY, textAlign: "right" },
});

function fmt(amount: number, moneda: string): string {
  if (moneda === "CLP") return `$${Math.round(amount).toLocaleString("es-CL")}`;
  if (moneda === "USD") return `USD ${amount.toFixed(2)}`;
  return `${amount}`;
}

function statusColor(estado: string): string {
  switch (estado) {
    case "BORRADOR":  return "#6b7280";
    case "EMITIDA":   return "#1d4ed8";
    case "ENVIADA":   return "#7c3aed";
    case "APROBADA":  return "#15803d";
    case "RECHAZADA": return "#c6352e";
    case "ANULADA":   return "#dc2626";
    default:          return "#6b7280";
  }
}

function estadoLabel(estado: string): string {
  const map: Record<string, string> = {
    BORRADOR: "Borrador", EMITIDA: "Emitida", ENVIADA: "Enviada",
    APROBADA: "Aprobada", RECHAZADA: "Rechazada", ANULADA: "Anulada",
  };
  return map[estado] ?? estado;
}

function dash(value?: string | null): string {
  return value && value.trim() !== "" ? value : "—";
}

export interface OCItem {
  descripcion: string;
  cantidad: number;
  valor_unitario: number;
  total: number;
}

export interface PurchaseOrderPDFData {
  numero: string;
  fecha_emision: Date;
  fecha_envio?: Date | null;
  estado: string;
  moneda: string;
  tipo_cambio?: number | null;
  condiciones_pago?: string | null;
  observaciones?: string | null;
  subtotal: number;
  descuento_pct: number;
  descuento_monto: number;
  neto: number;
  iva_monto: number;
  total: number;
  ivaPercent: number;
  motivo_anulacion?: string | null;
  items: OCItem[];
  proveedor: {
    nombre: string;
    rut?: string | null;
    giro?: string | null;
    direccion?: string | null;
    ciudad?: string | null;
    contacto?: string | null;
    email?: string | null;
    telefono?: string | null;
  };
  company: {
    razon_social: string;
    rut: string;
    giro?: string | null;
    direccion?: string | null;
    email?: string | null;
    telefono?: string | null;
    logo_url?: string | null;
  };
}

const ce = React.createElement;

function headerRow() {
  return ce(View, { style: styles.tableHeadRow, wrap: false },
    ce(Text, { style: [styles.thCell, styles.colNum, styles.cellDivH] }, "N°"),
    ce(Text, { style: [styles.thCell, styles.colQty, styles.cellDivH] }, "Cantidad"),
    ce(Text, { style: [styles.thCell, styles.colDesc, styles.cellDivH] }, "Detalle"),
    ce(Text, { style: [styles.thCell, styles.colValor, styles.cellDivH] }, "Valor Unit."),
    ce(Text, { style: [styles.thCell, styles.colTotal] }, "Total"),
  );
}

function dataRow(item: OCItem, index: number, moneda: string) {
  return ce(View, { key: `d${index}`, style: styles.tableRow, wrap: false },
    ce(Text, { style: [styles.tdCell, styles.colNum, styles.cellDiv] }, String(index + 1)),
    ce(Text, { style: [styles.tdCell, styles.colQty, styles.cellDiv] }, String(Number(item.cantidad))),
    ce(Text, { style: [styles.tdCell, styles.colDesc, styles.cellDiv] }, item.descripcion),
    ce(Text, { style: [styles.tdCell, styles.colValor, styles.cellDiv] }, fmt(Number(item.valor_unitario), moneda)),
    ce(Text, { style: [styles.tdCellBold, styles.colTotal] }, fmt(Number(item.total), moneda)),
  );
}

function emptyRow(index: number) {
  return ce(View, { key: `e${index}`, style: styles.tableRow, wrap: false },
    ce(View, { style: [styles.colNum, styles.cellDiv] }),
    ce(View, { style: [styles.colQty, styles.cellDiv] }),
    ce(View, { style: [styles.colDesc, styles.cellDiv] }),
    ce(View, { style: [styles.colValor, styles.cellDiv] }),
    ce(View, { style: [styles.colTotal] }),
  );
}

export function PurchaseOrderDocument({ oc }: { oc: PurchaseOrderPDFData }) {
  const isAnulada = oc.estado === "ANULADA";
  const hasDesc = oc.descuento_pct > 0;

  const emptyRows: React.ReactElement[] = [];
  for (let k = oc.items.length; k < MIN_FILAS; k++) {
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

      // ── ENCABEZADO: emisor izquierda + recuadro OC derecha ───────────────
      ce(View, { style: styles.topRow },

        ce(View, { style: styles.emisorCol },
          ce(Image, { src: LOGO_URL, style: styles.emisorLogo }),
          ce(Text, { style: styles.emisorName }, oc.company.razon_social),
          ce(Text, { style: styles.emisorLine }, `RUT: ${oc.company.rut}`),
          oc.company.giro
            ? ce(Text, { style: styles.emisorLine }, `Giro: ${oc.company.giro}`)
            : null,
          oc.company.direccion
            ? ce(Text, { style: styles.emisorLine }, oc.company.direccion)
            : null,
          oc.company.telefono
            ? ce(Text, { style: styles.emisorLine }, `Tel: ${oc.company.telefono}`)
            : null,
          oc.company.email
            ? ce(Text, { style: styles.emisorLine }, oc.company.email)
            : null,
        ),

        // Recuadro OC
        ce(View, { style: styles.ocBox },
          ce(View, { style: styles.ocBoxTop },
            ce(Text, { style: styles.ocTipo }, "ORDEN DE COMPRA"),
            ce(Text, { style: styles.ocNumLabel }, "N°"),
            ce(Text, { style: styles.ocNum }, oc.numero),
          ),
          ce(View, { style: styles.ocFootWrap },
            ce(View, { style: styles.ocFootRow },
              ce(Text, { style: styles.ocFootLabel }, "Emisión"),
              ce(Text, { style: styles.ocFootValue },
                new Date(oc.fecha_emision).toLocaleDateString("es-CL"),
              ),
            ),
            ce(View, { style: styles.ocFootRow },
              ce(Text, { style: styles.ocFootLabel }, "Estado"),
              ce(Text, { style: [styles.ocFootValue, { color: statusColor(oc.estado) }] },
                estadoLabel(oc.estado),
              ),
            ),
          ),
        ),
      ),

      // ── CAJA PROVEEDOR + DATOS DE LA ORDEN ───────────────────────────────
      ce(View, { style: styles.infoBox },

        ce(View, { style: styles.infoLeft },
          ce(Text, { style: styles.infoTitle }, "Datos del proveedor"),
          ce(View, { style: styles.infoRow },
            ce(Text, { style: styles.infoLabel }, "Señor(es):"),
            ce(Text, { style: styles.infoName }, oc.proveedor.nombre),
          ),
          ce(View, { style: styles.infoRow },
            ce(Text, { style: styles.infoLabel }, "RUT:"),
            ce(Text, { style: styles.infoValue }, dash(oc.proveedor.rut)),
          ),
          ce(View, { style: styles.infoRow },
            ce(Text, { style: styles.infoLabel }, "Giro:"),
            ce(Text, { style: styles.infoValue }, dash(oc.proveedor.giro)),
          ),
          ce(View, { style: styles.infoRow },
            ce(Text, { style: styles.infoLabel }, "Dirección:"),
            ce(Text, { style: styles.infoValue }, dash(oc.proveedor.direccion)),
          ),
          ce(View, { style: styles.infoRow },
            ce(Text, { style: styles.infoLabel }, "Ciudad:"),
            ce(Text, { style: styles.infoValue }, dash(oc.proveedor.ciudad)),
          ),
          ce(View, { style: styles.infoRow },
            ce(Text, { style: styles.infoLabel }, "Fono:"),
            ce(Text, { style: styles.infoValue }, dash(oc.proveedor.telefono)),
          ),
          ce(View, { style: styles.infoRow },
            ce(Text, { style: styles.infoLabel }, "E-mail:"),
            ce(Text, { style: styles.infoValue }, dash(oc.proveedor.email)),
          ),
          ce(View, { style: styles.infoRow },
            ce(Text, { style: styles.infoLabel }, "Contacto:"),
            ce(Text, { style: styles.infoValue }, dash(oc.proveedor.contacto)),
          ),
        ),

        ce(View, { style: styles.infoRight },
          ce(Text, { style: styles.infoTitle }, "Datos de la orden"),
          ce(View, { style: styles.infoRow },
            ce(Text, { style: styles.infoLabelR }, "Fecha emisión:"),
            ce(Text, { style: styles.infoValue },
              new Date(oc.fecha_emision).toLocaleDateString("es-CL"),
            ),
          ),
          ce(View, { style: styles.infoRow },
            ce(Text, { style: styles.infoLabelR }, "Moneda:"),
            ce(Text, { style: styles.infoValue }, oc.moneda),
          ),
          ce(View, { style: styles.infoRow },
            ce(Text, { style: styles.infoLabelR }, "IVA:"),
            ce(Text, { style: styles.infoValue }, `${oc.ivaPercent}%`),
          ),
          ce(View, { style: styles.infoRow },
            ce(Text, { style: styles.infoLabelR }, "Condición de pago:"),
            ce(Text, { style: styles.infoValue }, dash(oc.condiciones_pago)),
          ),
          ce(View, { style: styles.infoRow },
            ce(Text, { style: styles.infoLabelR }, "Estado:"),
            ce(Text, { style: [styles.badge, { backgroundColor: statusColor(oc.estado) }] },
              estadoLabel(oc.estado),
            ),
          ),
        ),
      ),

      // Nota de tipo de cambio si aplica
      oc.moneda !== "CLP" && oc.tipo_cambio
        ? ce(View, { style: styles.currencyNote },
            ce(Text, null,
              `Tipo de cambio: 1 ${oc.moneda} = ` +
              `$${Number(oc.tipo_cambio).toLocaleString("es-CL")} CLP`,
            ),
          )
        : null,

      // ── TABLA DE ÍTEMS (bordes completos) ────────────────────────────────
      ce(View, { style: styles.tableBox },
        headerRow(),
        ...oc.items.map((item, i) => dataRow(item, i, oc.moneda)),
        ...emptyRows,
      ),

      // ── CONDICIONES DE PAGO + RESUMEN ────────────────────────────────────
      ce(View, { style: styles.bottomRow },

        ce(View, { style: styles.condBox },
          oc.condiciones_pago
            ? ce(View, null,
                ce(Text, { style: styles.condLabel }, "Condiciones de pago"),
                ce(Text, { style: styles.condText }, oc.condiciones_pago),
              )
            : null,
        ),

        ce(View, { style: styles.totalsBox },
          ce(View, { style: styles.totalRow },
            ce(Text, { style: styles.totalLabel }, "Subtotal"),
            ce(Text, { style: styles.totalValue }, fmt(Number(oc.subtotal), oc.moneda)),
          ),
          hasDesc
            ? ce(View, { style: styles.totalRow },
                ce(Text, { style: styles.totalLabel }, `Descuento (${oc.descuento_pct}%)`),
                ce(Text, { style: [styles.totalValue, { color: RED }] },
                  `−${fmt(Number(oc.descuento_monto), oc.moneda)}`,
                ),
              )
            : null,
          ce(View, { style: styles.totalRow },
            ce(Text, { style: styles.totalLabel }, "Neto"),
            ce(Text, { style: styles.totalValue }, fmt(Number(oc.neto), oc.moneda)),
          ),
          ce(View, { style: styles.totalRow },
            ce(Text, { style: styles.totalLabel }, `IVA (${oc.ivaPercent}%)`),
            ce(Text, { style: styles.totalValue }, fmt(Number(oc.iva_monto), oc.moneda)),
          ),
          ce(View, { style: styles.grandRow },
            ce(Text, { style: styles.grandLabel }, `TOTAL ${oc.moneda}`),
            ce(Text, { style: styles.grandValue }, fmt(Number(oc.total), oc.moneda)),
          ),
        ),
      ),

      // ── OBSERVACIONES ────────────────────────────────────────────────────
      oc.observaciones
        ? ce(View, { style: styles.obsBox },
            ce(Text, { style: styles.obsLabel }, "Observaciones"),
            ce(Text, { style: styles.obsText }, oc.observaciones),
          )
        : null,

      // ── MOTIVO ANULACIÓN ─────────────────────────────────────────────────
      isAnulada && oc.motivo_anulacion
        ? ce(View, { style: styles.anulBox },
            ce(Text, { style: styles.anulLabel }, "Motivo de anulación"),
            ce(Text, { style: styles.anulText }, oc.motivo_anulacion),
          )
        : null,

      // ── PIE DE PÁGINA ────────────────────────────────────────────────────
      ce(View, { style: styles.footer, fixed: true },
        ce(View, { style: styles.footerRow },
          ce(Text, { style: styles.footerLeft },
            oc.company.razon_social + " · RUT " + oc.company.rut +
            (oc.company.telefono ? " · Tel: " + oc.company.telefono : "") +
            (oc.company.email ? " · " + oc.company.email : ""),
          ),
          ce(Text, { style: styles.footerCenter }, "www.solterra.cl"),
          ce(Text, { style: styles.footerRight }, oc.numero),
        ),
      ),
    ),
  );
}
