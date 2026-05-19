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
  page: { fontFamily: "Inter", fontSize: 10, color: "#1a1a1a", padding: 40 },

  // Encabezado
  topRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 },
  emisorLogo: { width: 150, height: 50, objectFit: "contain", marginBottom: 8 },
  emisorName: { fontSize: 13, fontWeight: 700, color: BLUE, marginBottom: 2 },
  emisorLine: { fontSize: 9, color: GRAY, marginBottom: 1 },

  // Recuadro OC
  ocBox: { border: `2px solid ${BLUE}`, borderRadius: 3, padding: "10 12", width: 185, alignItems: "center" },
  ocTipo: { fontSize: 11, fontWeight: 700, color: BLUE, textAlign: "center", marginBottom: 5 },
  ocNumLabel: { fontSize: 8, color: LGRAY, textAlign: "center", marginBottom: 1 },
  ocNum: { fontSize: 16, fontWeight: 700, color: BLUE, textAlign: "center", marginBottom: 6 },
  ocDate: { fontSize: 8, color: LGRAY, textAlign: "center", borderTop: `1px solid ${BORDER}`, paddingTop: 5, marginBottom: 4 },
  ocStatus: { fontSize: 9, fontWeight: 700, textAlign: "center", marginTop: 2 },

  divider: { borderBottom: `1px solid ${BORDER}`, marginVertical: 10 },

  // Sección proveedor con header azul
  twoCol: { flexDirection: "row", justifyContent: "space-between", marginBottom: 12 },
  colHalf: { width: "54%" },
  colRight: { width: "42%" },

  proveedorBox: { border: `1px solid ${BORDER}`, borderRadius: 3, overflow: "hidden", marginBottom: 12 },
  proveedorHeader: { backgroundColor: BLUE, paddingVertical: 4, paddingHorizontal: 8 },
  proveedorHeaderText: { fontSize: 8, color: "#ffffff", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 },
  proveedorBody: { padding: "6 8" },
  labelRow: { flexDirection: "row", marginBottom: 3 },
  labelText: { fontSize: 9, color: LGRAY, width: 62 },
  valueText: { fontSize: 9, color: "#1a1a1a", flex: 1, fontWeight: 700 },
  valueTextNormal: { fontSize: 9, color: "#374151", flex: 1 },

  // Datos de la orden (derecha)
  sectionLabel: { fontSize: 8, color: LGRAY, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 6, fontWeight: 700 },
  metaBox: { border: `1px solid ${BORDER}`, borderRadius: 3, overflow: "hidden" },
  metaHeader: { backgroundColor: BLUE, paddingVertical: 4, paddingHorizontal: 8 },
  metaHeaderText: { fontSize: 8, color: "#ffffff", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 },
  metaBody: { padding: "6 8" },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 3 },
  metaLabel: { fontSize: 9, color: LGRAY },
  metaValue: { fontSize: 9, color: "#1a1a1a" },

  currencyNote: { backgroundColor: "#eff6ff", borderRadius: 3, padding: "5 8", marginBottom: 10, fontSize: 9, color: "#1d4ed8" },

  // Tabla
  tableHeader: { flexDirection: "row", backgroundColor: BLUE, paddingVertical: 6, paddingHorizontal: 6 },
  tableRow: { flexDirection: "row", borderBottom: `1px solid #f3f4f6`, paddingVertical: 6, paddingHorizontal: 6 },
  tableRowAlt: { flexDirection: "row", borderBottom: `1px solid #f3f4f6`, paddingVertical: 6, paddingHorizontal: 6, backgroundColor: "#f9fafb" },
  colQtyH: { width: 44, textAlign: "center" },
  colDesc: { flex: 1 },
  colValor: { width: 78, textAlign: "right" },
  colTotal: { width: 78, textAlign: "right" },
  thText: { fontSize: 8, color: "#ffffff", fontWeight: 700 },
  tdText: { fontSize: 9, color: "#374151" },

  // Condiciones + totales fila
  bottomRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 14 },
  condBox: { width: "48%", fontSize: 9, color: GRAY },
  condLabel: { fontSize: 8, color: LGRAY, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4, fontWeight: 700 },
  condText: { fontSize: 9, color: "#374151", marginBottom: 2 },

  // Resumen (totales)
  resumeBox: { width: "46%", border: `1px solid ${BORDER}`, borderRadius: 3, overflow: "hidden" },
  resumeHeader: { backgroundColor: BLUE, paddingVertical: 4, paddingHorizontal: 8 },
  resumeHeaderText: { fontSize: 8, color: "#ffffff", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.8 },
  resumeBody: { padding: "6 8" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 4 },
  totalLabel: { fontSize: 9, color: GRAY },
  totalValue: { fontSize: 9, color: "#1a1a1a" },
  grandRow: { flexDirection: "row", justifyContent: "space-between", backgroundColor: BLUE, padding: "6 8", marginHorizontal: -8, marginBottom: -6, borderRadius: 0 },
  grandLabel: { fontSize: 10, fontWeight: 700, color: "#ffffff" },
  grandValue: { fontSize: 10, fontWeight: 700, color: "#ffffff" },

  obsBox: { marginTop: 12, padding: "8 10", borderRadius: 3, border: `1px solid ${BORDER}` },
  obsLabel: { fontSize: 8, color: LGRAY, textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 4, fontWeight: 700 },
  obsText: { fontSize: 9, color: "#374151", lineHeight: 1.5 },

  watermarkWrap: { position: "absolute", top: 260, left: 0, right: 0, alignItems: "center" },
  watermarkText: { fontSize: 68, fontWeight: 700, color: "#fca5a5" },

  anulBox: { backgroundColor: "#fef2f2", border: `1px solid #fca5a5`, borderRadius: 3, padding: "8 10", marginTop: 10 },
  anulLabel: { fontSize: 8, color: "#dc2626", fontWeight: 700, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 4 },
  anulText: { fontSize: 9, color: "#374151" },

  // Footer 3 columnas
  footer: { position: "absolute", bottom: 24, left: 40, right: 40, borderTop: `1px solid ${BORDER}`, paddingTop: 6 },
  footerRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  footerLeft: { flex: 1, fontSize: 7, color: LGRAY },
  footerCenter: { flex: 1, fontSize: 8, fontWeight: 700, color: BLUE, textAlign: "center" },
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

export function PurchaseOrderDocument({ oc }: { oc: PurchaseOrderPDFData }) {
  const isAnulada = oc.estado === "ANULADA";
  const hasDesc = oc.descuento_pct > 0;

  return ce(Document, null,
    ce(Page, { size: "A4", style: styles.page },

      // Watermark ANULADA
      isAnulada
        ? ce(View, { style: styles.watermarkWrap, fixed: true },
            ce(Text, { style: styles.watermarkText }, "ANULADA"),
          )
        : null,

      // ── ENCABEZADO ──────────────────────────────────────────────────────
      ce(View, { style: styles.topRow },

        ce(View, { style: { flex: 1, paddingRight: 14 } },
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

        // Recuadro OC con estado integrado
        ce(View, { style: styles.ocBox },
          ce(Text, { style: styles.ocTipo }, "ORDEN DE COMPRA"),
          ce(Text, { style: styles.ocNumLabel }, "N°"),
          ce(Text, { style: styles.ocNum }, oc.numero),
          ce(Text, { style: styles.ocDate },
            `Emisión: ${new Date(oc.fecha_emision).toLocaleDateString("es-CL")}` +
            (oc.fecha_envio ? `\nEnvío: ${new Date(oc.fecha_envio).toLocaleDateString("es-CL")}` : ""),
          ),
          ce(Text, { style: [styles.ocStatus, { color: statusColor(oc.estado) }] },
            `● ${estadoLabel(oc.estado)}`,
          ),
        ),
      ),

      ce(View, { style: styles.divider }),

      // ── PROVEEDOR + DATOS DOC ────────────────────────────────────────────
      ce(View, { style: styles.twoCol },

        // Proveedor con header azul y etiquetas
        ce(View, { style: [styles.proveedorBox, styles.colHalf] },
          ce(View, { style: styles.proveedorHeader },
            ce(Text, { style: styles.proveedorHeaderText }, "Datos del Proveedor"),
          ),
          ce(View, { style: styles.proveedorBody },
            ce(View, { style: styles.labelRow },
              ce(Text, { style: styles.labelText }, "Señor(es):"),
              ce(Text, { style: styles.valueText }, oc.proveedor.nombre),
            ),
            oc.proveedor.rut
              ? ce(View, { style: styles.labelRow },
                  ce(Text, { style: styles.labelText }, "RUT:"),
                  ce(Text, { style: styles.valueTextNormal }, oc.proveedor.rut),
                )
              : null,
            oc.proveedor.giro
              ? ce(View, { style: styles.labelRow },
                  ce(Text, { style: styles.labelText }, "Giro:"),
                  ce(Text, { style: styles.valueTextNormal }, oc.proveedor.giro),
                )
              : null,
            oc.proveedor.direccion
              ? ce(View, { style: styles.labelRow },
                  ce(Text, { style: styles.labelText }, "Dirección:"),
                  ce(Text, { style: styles.valueTextNormal }, oc.proveedor.direccion),
                )
              : null,
            oc.proveedor.ciudad
              ? ce(View, { style: styles.labelRow },
                  ce(Text, { style: styles.labelText }, "Ciudad:"),
                  ce(Text, { style: styles.valueTextNormal }, oc.proveedor.ciudad),
                )
              : null,
            oc.proveedor.telefono
              ? ce(View, { style: styles.labelRow },
                  ce(Text, { style: styles.labelText }, "Fono:"),
                  ce(Text, { style: styles.valueTextNormal }, oc.proveedor.telefono),
                )
              : null,
            oc.proveedor.email
              ? ce(View, { style: styles.labelRow },
                  ce(Text, { style: styles.labelText }, "E-mail:"),
                  ce(Text, { style: styles.valueTextNormal }, oc.proveedor.email),
                )
              : null,
            oc.proveedor.contacto
              ? ce(View, { style: styles.labelRow },
                  ce(Text, { style: styles.labelText }, "Contacto:"),
                  ce(Text, { style: styles.valueTextNormal }, oc.proveedor.contacto),
                )
              : null,
          ),
        ),

        // Datos de la orden con header azul
        ce(View, { style: [styles.metaBox, styles.colRight] },
          ce(View, { style: styles.metaHeader },
            ce(Text, { style: styles.metaHeaderText }, "Datos de la Orden"),
          ),
          ce(View, { style: styles.metaBody },
            ce(View, { style: styles.metaRow },
              ce(Text, { style: styles.metaLabel }, "Moneda"),
              ce(Text, { style: styles.metaValue }, oc.moneda),
            ),
            ce(View, { style: styles.metaRow },
              ce(Text, { style: styles.metaLabel }, "IVA"),
              ce(Text, { style: styles.metaValue }, `${oc.ivaPercent}%`),
            ),
            oc.condiciones_pago
              ? ce(View, { style: styles.metaRow },
                  ce(Text, { style: styles.metaLabel }, "Cond. pago"),
                  ce(Text, { style: styles.metaValue }, oc.condiciones_pago),
                )
              : null,
            oc.moneda !== "CLP" && oc.tipo_cambio
              ? ce(View, { style: styles.metaRow },
                  ce(Text, { style: styles.metaLabel }, "Tipo cambio"),
                  ce(Text, { style: styles.metaValue }, `$${Number(oc.tipo_cambio).toLocaleString("es-CL")}`),
                )
              : null,
          ),
        ),
      ),

      // ── TABLA DE ÍTEMS ───────────────────────────────────────────────────
      ce(View, { style: styles.tableHeader },
        ce(Text, { style: [styles.thText, styles.colQtyH] }, "Cantidad"),
        ce(Text, { style: [styles.thText, styles.colDesc] }, "Detalle"),
        ce(Text, { style: [styles.thText, styles.colValor] }, "Valor Unit."),
        ce(Text, { style: [styles.thText, styles.colTotal] }, "Total"),
      ),

      ...oc.items.map((item, i) =>
        ce(View, { key: i, style: i % 2 === 0 ? styles.tableRow : styles.tableRowAlt },
          ce(Text, { style: [styles.tdText, styles.colQtyH] }, String(Number(item.cantidad))),
          ce(Text, { style: [styles.tdText, styles.colDesc] }, item.descripcion),
          ce(Text, { style: [styles.tdText, styles.colValor] }, fmt(Number(item.valor_unitario), oc.moneda)),
          ce(Text, { style: [styles.tdText, styles.colTotal] }, fmt(Number(item.total), oc.moneda)),
        )
      ),

      // ── CONDICIONES + RESUMEN ────────────────────────────────────────────
      ce(View, { style: styles.bottomRow },

        // Condiciones izquierda
        ce(View, { style: styles.condBox },
          oc.condiciones_pago
            ? ce(View, { style: { marginBottom: 8 } },
                ce(Text, { style: styles.condLabel }, "Condiciones de pago"),
                ce(Text, { style: styles.condText }, oc.condiciones_pago),
              )
            : null,
        ),

        // Resumen derecho con header azul
        ce(View, { style: styles.resumeBox },
          ce(View, { style: styles.resumeHeader },
            ce(Text, { style: styles.resumeHeaderText }, "Resumen"),
          ),
          ce(View, { style: styles.resumeBody },
            ce(View, { style: styles.totalRow },
              ce(Text, { style: styles.totalLabel }, "Total"),
              ce(Text, { style: styles.totalValue }, fmt(Number(oc.subtotal), oc.moneda)),
            ),
            hasDesc
              ? ce(View, { style: styles.totalRow },
                  ce(Text, { style: styles.totalLabel }, `% Dcto. (${oc.descuento_pct}%)`),
                  ce(Text, { style: [styles.totalValue, { color: RED }] }, `−${fmt(Number(oc.descuento_monto), oc.moneda)}`),
                )
              : null,
            ce(View, { style: styles.totalRow },
              ce(Text, { style: styles.totalLabel }, "Neto"),
              ce(Text, { style: styles.totalValue }, fmt(Number(oc.neto), oc.moneda)),
            ),
            ce(View, { style: styles.totalRow },
              ce(Text, { style: styles.totalLabel }, `IVA ${oc.ivaPercent}%`),
              ce(Text, { style: styles.totalValue }, fmt(Number(oc.iva_monto), oc.moneda)),
            ),
            ce(View, { style: styles.grandRow },
              ce(Text, { style: styles.grandLabel }, `TOTAL ${oc.moneda}`),
              ce(Text, { style: styles.grandValue }, fmt(Number(oc.total), oc.moneda)),
            ),
          ),
        ),
      ),

      // Observaciones
      oc.observaciones
        ? ce(View, { style: styles.obsBox },
            ce(Text, { style: styles.obsLabel }, "Observaciones"),
            ce(Text, { style: styles.obsText }, oc.observaciones),
          )
        : null,

      // Motivo anulación
      isAnulada && oc.motivo_anulacion
        ? ce(View, { style: styles.anulBox },
            ce(Text, { style: styles.anulLabel }, "Motivo de anulación"),
            ce(Text, { style: styles.anulText }, oc.motivo_anulacion),
          )
        : null,

      // ── PIE DE PÁGINA 3 COLUMNAS ─────────────────────────────────────────
      ce(View, { style: styles.footer, fixed: true },
        ce(View, { style: styles.footerRow },
          ce(Text, { style: styles.footerLeft },
            oc.company.razon_social + " · RUT " + oc.company.rut +
            (oc.company.telefono ? " · Tel: " + oc.company.telefono : "") +
            (oc.company.email ? " · " + oc.company.email : ""),
          ),
          ce(Text, { style: styles.footerCenter }, "www.solterra.cl"),
          ce(Text, { style: styles.footerRight },
            oc.numero,
          ),
        ),
      ),
    ),
  );
}


