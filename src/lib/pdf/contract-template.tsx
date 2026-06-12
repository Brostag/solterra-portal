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
  // Tabla dentro de cláusula (Cláusula Cuarta — multa)
  clTablaTitulo: { fontSize: 8.5, fontWeight: 700, color: "#1a1a1a", marginTop: 4, marginBottom: 3 },
  clTabla: { borderTopWidth: 1, borderLeftWidth: 1, borderRightWidth: 1, borderColor: BORDER, borderStyle: "solid", marginBottom: 5, marginTop: 2 },
  clTablaHeadRow: { flexDirection: "row", backgroundColor: BLUE, borderBottom: `1px solid ${BORDER}` },
  clTablaRow: { flexDirection: "row", borderBottom: `1px solid ${BORDER}` },
  clThCell: { fontSize: 8, fontWeight: 700, color: "#ffffff", paddingVertical: 4, paddingHorizontal: 5 },
  clTdCell: { fontSize: 8.5, color: "#1a1a1a", paddingVertical: 4, paddingHorizontal: 5 },
  clCellDiv: { borderRight: `1px solid ${BORDER}` },
  clColPlazo: { width: "42%" },
  clColTarifa: { flex: 1 },
  // Lista de datos bancarios (Cláusula Quinta)
  bancoList: { marginTop: 3, marginBottom: 4, paddingLeft: 6 },
  bancoItem: { flexDirection: "row", marginBottom: 1.5 },
  bancoBullet: { fontSize: 8.5, color: BLUE, width: 10 },
  bancoLabel: { fontSize: 8.5, color: GRAY, width: 64 },
  bancoValue: { fontSize: 8.5, color: "#1a1a1a", fontWeight: 700, flex: 1 },
  // Condiciones Particulares (anexo) — estilo Word
  cpTitle: { fontSize: 12, fontWeight: 700, color: BLUE, textAlign: "center", textTransform: "uppercase", letterSpacing: 0.6, marginBottom: 2 },
  cpSub: { fontSize: 9, fontWeight: 700, color: GRAY, textAlign: "center", marginBottom: 10 },
  cpIntro: { fontSize: 8.5, color: "#1a1a1a", textAlign: "justify", marginTop: 6, marginBottom: 4 },
  fichaBox: { border: `1px solid ${BORDER}`, borderRadius: 3, padding: 8, marginTop: 8 },
  fichaTitulo: { fontSize: 9, fontWeight: 700, color: BLUE, marginBottom: 5, borderBottom: `1px solid ${BORDER}`, paddingBottom: 3 },
  fichaRow: { flexDirection: "row", marginBottom: 1.5 },
  fichaLabel: { fontSize: 8.5, color: GRAY, fontWeight: 700, width: 118 },
  fichaValue: { fontSize: 8.5, color: "#1a1a1a", flex: 1 },
  comBlock: { marginTop: 7, paddingTop: 5, borderTop: `1px solid ${BORDER}` },
  comLine: { fontSize: 8.5, color: "#1a1a1a", marginBottom: 2.5, lineHeight: 1.35 },
  // Anexo fotográfico
  fotoEquipoTitulo: { fontSize: 9, fontWeight: 700, color: BLUE, marginTop: 8, marginBottom: 2, borderBottom: `1px solid ${BORDER}`, paddingBottom: 3 },
  fotoGrid: { flexDirection: "row", flexWrap: "wrap" },
  fotoCell: { width: "50%", padding: 4 },
  fotoFrame: { border: `1px solid ${BORDER}`, borderRadius: 3, padding: 4 },
  fotoImg: { width: "100%", height: 150, objectFit: "contain", backgroundColor: "#f6f7f9" },
  fotoMissing: { width: "100%", height: 150, backgroundColor: "#f6f7f9", alignItems: "center", justifyContent: "center" },
  fotoCaptionBold: { fontSize: 8, fontWeight: 700, color: BLUE, marginTop: 3 },
  fotoCaption: { fontSize: 7.5, color: GRAY, marginTop: 1 },
  fotoNota: { fontSize: 7.5, color: LGRAY, textAlign: "center", paddingHorizontal: 6 },
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

export interface ContractFotoPDF {
  tipo_label: string;
  fecha: Date;
  observacion: string | null;
  /** Data URI (image/jpeg o image/png) listo para @react-pdf; null si no se pudo incluir. */
  src: string | null;
  /** Motivo visible cuando src es null (ej. formato WEBP no soportado por el PDF). */
  nota: string | null;
}

export interface ContractEquipoFotosPDF {
  descripcion: string;
  fotos: ContractFotoPDF[];
}

export interface ContractPDFData {
  numero_contrato: string;
  anexo_label: string;
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
  /** Anexo fotográfico opcional: si viene vacío o ausente, el PDF no cambia. */
  fotos_equipos?: ContractEquipoFotosPDF[];
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

// Ficha del equipo estilo Word: etiqueta de ancho fijo + ":" + valor (colon alineado).
function fichaRow(label: string, value: string) {
  return ce(View, { style: styles.fichaRow },
    ce(Text, { style: styles.fichaLabel }, label),
    ce(Text, { style: styles.fichaValue }, `:  ${value}`),
  );
}

function header(numero: string) {
  return ce(View, { style: styles.header, fixed: true },
    ce(Image, { style: styles.logo, src: LOGO_URL }),
    ce(View, { style: styles.headerRight },
      ce(Text, { style: styles.docNum }, `CONTRATO MARCO ${numero}`),
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
  // Solo equipos con fotos: si no hay ninguna, el documento queda igual que antes.
  const fotosEquipos = (data.fotos_equipos ?? []).filter((e) => e.fotos.length > 0);
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

  return ce(Document, { title: `Contrato Marco ${data.numero_contrato}`, author: "Solterra SpA" },
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
          cl.tabla
            ? ce(Text, { key: "tt", style: styles.clTablaTitulo }, cl.tabla.titulo)
            : null,
          cl.tabla
            ? ce(View, { key: "tb", style: styles.clTabla, wrap: false },
                ce(View, { style: styles.clTablaHeadRow },
                  ce(Text, { style: [styles.clThCell, styles.clColPlazo, styles.clCellDiv] }, cl.tabla.headers[0]),
                  ce(Text, { style: [styles.clThCell, styles.clColTarifa] }, cl.tabla.headers[1]),
                ),
                ...cl.tabla.filas.map((fila, r) =>
                  ce(View, { key: `r-${r}`, style: styles.clTablaRow },
                    ce(Text, { style: [styles.clTdCell, styles.clColPlazo, styles.clCellDiv] }, fila[0]),
                    ce(Text, { style: [styles.clTdCell, styles.clColTarifa] }, fila[1]),
                  ),
                ),
              )
            : null,
          cl.bancoDetalle
            ? ce(View, { key: "bd", style: styles.bancoList, wrap: false },
                ...cl.bancoDetalle.map((b, k) =>
                  ce(View, { key: `b-${k}`, style: styles.bancoItem },
                    ce(Text, { style: styles.bancoBullet }, "•"),
                    ce(Text, { style: styles.bancoLabel }, `${b.label}:`),
                    ce(Text, { style: styles.bancoValue }, b.valor),
                  ),
                ),
              )
            : null,
        ),
      ),
      firmas(repCliente, ciCliente, dash(data.cliente.nombre)),
    ),
    // ── Condiciones particulares / Anexo (página nueva) ──
    ce(Page, { size: "A4", style: styles.page },
      header(data.numero_contrato),
      ce(Text, { style: styles.cpTitle }, "CONDICIONES PARTICULARES"),
      ce(Text, { style: styles.cpSub },
        `Anexo ${data.anexo_label} / Contrato Marco ${data.numero_contrato}`),
      metaRow("Sres.:", dash(data.cliente.nombre)),
      metaRow("Rut.:", dash(data.cliente.rut)),
      metaRow("Fecha:", `${ciudad}, ${fmtFecha(data.fecha_anexo ?? data.fecha)}`),
      ce(Text, { style: styles.cpIntro },
        "Por la presente se informan los siguientes datos correspondientes a máquina industrial que será entregada en arriendo."),
      metaRow("Contrato Nro:", data.numero_contrato),
      metaRow("Cotización Solterra N°:", dash(data.numero_cotizacion)),
      data.lugar_operacion ? metaRow("Lugar de operación / entrega:", dash(data.lugar_operacion)) : null,
      data.forma_pago ? metaRow("Condición de pago:", dash(data.forma_pago)) : null,
      ...data.equipos.map((eq, i) =>
        ce(View, { key: `eq-${i}`, style: styles.fichaBox, wrap: false },
          ce(Text, { style: styles.fichaTitulo }, `Equipo ${i + 1}`),
          fichaRow("EQUIPO", dash(eq.descripcion)),
          fichaRow("MARCA", dash(eq.marca)),
          fichaRow("MODELO", dash(eq.modelo)),
          fichaRow("PATENTE", dash(eq.patente)),
          fichaRow("AÑO", dash(eq.anio)),
          fichaRow("NRO. CHASIS", dash(eq.chasis)),
          fichaRow("NRO. MOTOR", dash(eq.motor)),
          fichaRow("COLOR", dash(eq.color)),
          eq.horometro_inicial ? fichaRow("HORÓMETRO INICIAL", dash(eq.horometro_inicial)) : null,
          eq.mantenimiento_horas ? fichaRow("MANTENCIÓN CADA", dash(eq.mantenimiento_horas)) : null,
          ce(View, { style: styles.comBlock },
            ce(Text, { style: styles.comLine },
              `Valor Arriendo Neto por Hora ${fmtMoneda(eq.valor_hora, data.moneda)}` +
                (eq.horas_minimas_mensuales != null
                  ? ` Mínimo ${eq.horas_minimas_mensuales} hrs correspondientes a un mes.`
                  : ".")),
            eq.valor_mensual_estimado != null
              ? ce(Text, { style: styles.comLine },
                  `Valor mensual ${fmtMoneda(eq.valor_mensual_estimado, data.moneda)} más IVA.`)
              : null,
            eq.tarifa_hora_extra != null
              ? ce(Text, { style: styles.comLine },
                  `Tarifa hora extra ${fmtMoneda(eq.tarifa_hora_extra, data.moneda)}.`)
              : null,
          ),
        ),
      ),
      ce(Text, { style: styles.nota },
        "Los valores indicados son netos y no incluyen IVA. La Renta de Arrendamiento se rige por la Cláusula Tercera de las Condiciones Generales. Datos de pago: Titular SOLTERRA SPA · RUT 76.021.667-4 · Banco BCI · Cuenta N° 21643351."),
      firmas(repCliente, ciCliente, dash(data.cliente.nombre)),
    ),
    // ── Anexo fotográfico (página nueva, SOLO si el contrato tiene fotos) ──
    fotosEquipos.length > 0
      ? ce(Page, { size: "A4", style: styles.page },
          header(data.numero_contrato),
          ce(Text, { style: styles.cpTitle }, "ANEXO FOTOGRÁFICO"),
          ce(Text, { style: styles.cpSub },
            `Registro de respaldo de equipos / Contrato Marco ${data.numero_contrato}`),
          ce(Text, { style: styles.cpIntro },
            "Las siguientes fotografías forman parte del respaldo del estado de los equipos entregados en arriendo, registradas en el portal de Solterra SpA."),
          ...fotosEquipos.map((eq, i) =>
            ce(View, { key: `feq-${i}` },
              ce(Text, { style: styles.fotoEquipoTitulo }, dash(eq.descripcion)),
              ce(View, { style: styles.fotoGrid },
                ...eq.fotos.map((f, j) =>
                  ce(View, { key: `f-${j}`, style: styles.fotoCell, wrap: false },
                    ce(View, { style: styles.fotoFrame },
                      f.src
                        ? ce(Image, { style: styles.fotoImg, src: f.src })
                        : ce(View, { style: styles.fotoMissing },
                            ce(Text, { style: styles.fotoNota }, f.nota ?? "Imagen no disponible")),
                      ce(Text, { style: styles.fotoCaptionBold }, f.tipo_label),
                      ce(Text, { style: styles.fotoCaption },
                        fmtFecha(f.fecha) + (f.observacion ? ` — ${f.observacion}` : "")),
                    ),
                  ),
                ),
              ),
            ),
          ),
          ce(Text, { style: styles.nota },
            "Registro fotográfico de respaldo. Las imágenes corresponden al estado de los equipos al momento de su registro en el portal."),
        )
      : null,
  );
}
