"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createContract, type CreateContractInput } from "../actions";
import { updateCompanyRepresentante } from "../../empresas/actions";
import { getQuotationForContract } from "../../cotizaciones/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Camera, ImagePlus, X, AlertTriangle, Loader2 } from "lucide-react";
import { createPortal } from "react-dom";
import Stepper from "@/components/portal/Stepper";

// Pasos del asistente de creación (presentación pura, mismo payload).
const WIZARD_STEPS = ["Datos del contrato", "Condiciones particulares", "Equipos arrendados"];

type Moneda = "CLP" | "UF" | "USD";

// Tipos de foto del respaldo — mismos valores que valida el endpoint
// /api/contratos/equipos/[equipmentId]/fotos y que usa el detalle.
const TIPOS_FOTO: { value: string; label: string }[] = [
  { value: "FRONTAL",           label: "Frontal" },
  { value: "LATERAL_DERECHO",   label: "Lateral derecho" },
  { value: "LATERAL_IZQUIERDO", label: "Lateral izquierdo" },
  { value: "TRASERA",           label: "Trasera" },
  { value: "CABINA",            label: "Cabina" },
  { value: "HOROMETRO",         label: "Horómetro" },
  { value: "RODADO",            label: "Rodado" },
  { value: "DANIOS",            label: "Daños" },
  { value: "OTRO",              label: "Otro" },
];

const FOTO_MAX_SIZE = 5 * 1024 * 1024; // 5 MB — mismo límite del endpoint
const FOTO_MIME = new Set(["image/jpeg", "image/png", "image/webp"]);

// Vigencias típicas del contrato marco. El texto elegido viaja tal cual al PDF
// (vigencia_contrato es string libre); "Otra" revela el input manual.
const VIGENCIAS = ["1 año", "2 años", "3 años", "4 años", "5 años"];
const VIGENCIA_OTRA = "__otra__";
const VIGENCIA_NINGUNA = "__ninguna__";

interface FotoNueva {
  file: File;
  tipo: string;
  preview: string;
}

// Acepta "1,19" o "1.19" o "45000": coma o punto valen como separador decimal.
function parseNum(s: string): number {
  const n = parseFloat(String(s).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
}

// Formato de monto según la moneda del contrato (no convierte entre monedas).
function fmtMonto(n: number, moneda: Moneda): string {
  if (moneda === "CLP") return `$${Math.round(n).toLocaleString("es-CL")}`;
  return `${moneda} ${n.toLocaleString("es-CL", { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

// Parsea "YYYY-MM-DD" como fecha LOCAL. Evita el bug off-by-one de
// new Date("YYYY-MM-DD"), que interpreta el string en UTC.
function parseFechaLocal(s: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

// Diferencia de calendario entre dos fechas (inicio ≤ fin) en años/meses/días.
// Cuando los días no alcanzan, toma prestado el largo del mes de INICIO (el mes
// del día que se resta), no el mes previo al de fin: así un inicio a fin de mes
// (ej: 31-ene → 01-mar) nunca produce un día negativo.
function desgloseSpan(inicio: Date, fin: Date): { anios: number; meses: number; dias: number } {
  let anios = fin.getFullYear() - inicio.getFullYear();
  let meses = fin.getMonth() - inicio.getMonth();
  let dias = fin.getDate() - inicio.getDate();
  if (dias < 0) {
    meses -= 1;
    // Días del mes de inicio (día 0 del mes siguiente = último día del mes de
    // inicio). Es el mínimo que garantiza dias >= 0 al bajar un mes.
    dias += new Date(inicio.getFullYear(), inicio.getMonth() + 1, 0).getDate();
  }
  if (meses < 0) {
    anios -= 1;
    meses += 12;
  }
  return { anios, meses, dias };
}

// Humaniza el desglose en es-CL con singular/plural y unión natural.
function textoSpan({ anios, meses, dias }: { anios: number; meses: number; dias: number }): string {
  const partes: string[] = [];
  if (anios > 0) partes.push(`${anios} ${anios === 1 ? "año" : "años"}`);
  if (meses > 0) partes.push(`${meses} ${meses === 1 ? "mes" : "meses"}`);
  if (dias > 0) partes.push(`${dias} ${dias === 1 ? "día" : "días"}`);
  if (partes.length === 0) return "0 días";
  if (partes.length === 1) return partes[0];
  if (partes.length === 2) return `${partes[0]} y ${partes[1]}`;
  return `${partes[0]}, ${partes[1]} y ${partes[2]}`;
}

// Meses completos del desglose (los días sueltos no suman al entero de meses).
function mesesCompletos({ anios, meses }: { anios: number; meses: number }): number {
  return anios * 12 + meses;
}

interface Equipo {
  descripcion: string;
  marca: string;
  modelo: string;
  patente: string;
  anio: string;
  chasis: string;
  motor: string;
  color: string;
  valor_hora: string;
  horas_minimas_mensuales: string;
  tarifa_hora_extra: string;
  horometro_inicial: string;
  mantenimiento_horas: string;
  observaciones: string;
  // Fotos de respaldo adjuntadas en el formulario; se suben tras crear.
  fotos: FotoNueva[];
}

function emptyEquipo(): Equipo {
  return {
    descripcion: "", marca: "", modelo: "", patente: "", anio: "",
    chasis: "", motor: "", color: "", valor_hora: "",
    horas_minimas_mensuales: "", tarifa_hora_extra: "",
    horometro_inicial: "", mantenimiento_horas: "", observaciones: "",
    fotos: [],
  };
}

interface Props {
  clients: {
    id: string;
    nombre: string;
    rut: string | null;
    representante_legal: string | null;
    rut_representante: string | null;
  }[];
  cotizaciones: { id: string; numero: string; cliente: string | null; fecha: string }[];
}

export default function NuevoContratoForm({ clients, cotizaciones }: Props) {
  const router = useRouter();
  const [clientId, setClientId] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaTermino, setFechaTermino] = useState("");
  const [duracionMeses, setDuracionMeses] = useState("");
  const [lugarOperacion, setLugarOperacion] = useState("");
  const [formaPago, setFormaPago] = useState("");
  const [observaciones, setObservaciones] = useState("");
  // Datos del contrato / celebración
  const [ciudadCelebracion, setCiudadCelebracion] = useState("Calama");
  const [vigenciaContrato, setVigenciaContrato] = useState("");
  // Selector de vigencia (presentación: el payload sigue siendo
  // vigenciaContrato string y duracionMeses string→int).
  const [vigenciaSel, setVigenciaSel] = useState("");
  const [moneda, setMoneda] = useState<Moneda>("CLP");
  // Representante del cliente
  const [representanteCliente, setRepresentanteCliente] = useState("");
  const [rutRepresentante, setRutRepresentante] = useState("");
  // Condiciones particulares / anexo
  const [numeroAnexo, setNumeroAnexo] = useState("");
  const [fechaAnexo, setFechaAnexo] = useState("");
  const [numeroCotizacion, setNumeroCotizacion] = useState("");
  // Selector de cotización: id de la cotización elegida, "__ninguna__" o "__manual__".
  const [cotizacionSel, setCotizacionSel] = useState("");
  const [correoNotificaciones, setCorreoNotificaciones] = useState("");
  const [equipos, setEquipos] = useState<Equipo[]>([emptyEquipo()]);
  const [loading, setLoading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<string | null>(null);
  // Si el contrato se creó pero alguna foto falló, se ofrece ir al detalle
  // en vez de permitir un segundo submit (evita contratos duplicados).
  const [createdId, setCreatedId] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  // Paso visible del asistente (presentación pura: no afecta el payload).
  const [step, setStep] = useState(1);
  // Diálogo: representante ingresado distinto al guardado en la empresa.
  const [confirmRepOpen, setConfirmRepOpen] = useState(false);
  // Auto-relleno desde la cotización asociada.
  const [autofillLoading, setAutofillLoading] = useState(false);
  // Hint ámbar: la cotización pertenece a un cliente distinto al ya elegido.
  const [clienteMismatchHint, setClienteMismatchHint] = useState<string | null>(null);
  // Equipos derivados de la cotización pendientes de confirmar reemplazo cuando
  // el formulario ya tiene equipos con datos escritos (null = sin pendiente).
  const [equiposPendientes, setEquiposPendientes] = useState<Equipo[] | null>(null);

  const selectedClient = clients.find((c) => c.id === clientId);

  // Escape cierra el diálogo del representante, salvo mientras se procesa
  // (loading): así no se puede abortar a mitad de la creación. Mismo criterio
  // que ConfirmDialog.
  useEffect(() => {
    if (!confirmRepOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !loading) setConfirmRepOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [confirmRepOpen, loading]);

  // Bloquea el scroll del body mientras el diálogo está abierto (mismo
  // comportamiento que ConfirmDialog).
  useEffect(() => {
    if (!confirmRepOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [confirmRepOpen]);

  // Escape cierra el diálogo de reemplazo de equipos manteniendo los actuales.
  useEffect(() => {
    if (!equiposPendientes) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setEquiposPendientes(null);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [equiposPendientes]);

  // Bloquea el scroll del body mientras el diálogo de equipos está abierto.
  useEffect(() => {
    if (!equiposPendientes) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [equiposPendientes]);

  // Desglose de las fechas para el helper de la duración (solo display).
  // null si faltan fechas o el rango es inválido (fin ≤ inicio).
  const spanFechas = useMemo(() => {
    const ini = parseFechaLocal(fechaInicio);
    const fin = parseFechaLocal(fechaTermino);
    if (!ini || !fin || fin <= ini) return null;
    return desgloseSpan(ini, fin);
  }, [fechaInicio, fechaTermino]);

  // Las fechas mandan: al tener inicio y término válidos, deriva la duración
  // en meses y (si corresponde) sincroniza el texto de vigencia. Si el rango
  // está incompleto o invertido en modo auto, limpia los derivados para no
  // dejar duración/vigencia fantasma en el payload (ej: borrar la fecha de
  // término tras haber elegido un plazo).
  function sincronizarDesdeFechas(
    inicioStr: string,
    finStr: string,
    { pisarVigencia }: { pisarVigencia: boolean },
  ) {
    const ini = parseFechaLocal(inicioStr);
    const fin = parseFechaLocal(finStr);
    if (!ini || !fin || fin <= ini) {
      // Solo el modo auto (las fechas mandan) puede tocar estos derivados; en
      // modo manual el usuario los define aparte y no se pisan.
      if (pisarVigencia) {
        setDuracionMeses("");
        setVigenciaContrato("");
      }
      return;
    }
    const span = desgloseSpan(ini, fin);
    const meses = mesesCompletos(span);
    setDuracionMeses(meses > 0 ? String(meses) : "");
    if (pisarVigencia) setVigenciaContrato(textoSpan(span));
  }

  // Cambio de cliente: los campos de representante pertenecen al cliente
  // elegido, así que se prellenan (sobrescriben) desde su ficha de empresa.
  function handleClientChange(v: string | null) {
    const id = v ?? "";
    setClientId(id);
    const c = clients.find((cl) => cl.id === id);
    setRepresentanteCliente(c?.representante_legal ?? "");
    setRutRepresentante(c?.rut_representante ?? "");
  }

  // Aplica una fecha de inicio replicando EXACTAMENTE el onChange manual del
  // input: en modo auto vuelve a "las fechas mandan" (limpia el plazo elegido)
  // y sincroniza vigencia/duración; en modo manual no pisa la vigencia. La usan
  // el input y el auto-relleno desde la cotización.
  function aplicarFechaInicio(val: string) {
    setFechaInicio(val);
    const manual = vigenciaSel === VIGENCIA_OTRA || vigenciaSel === VIGENCIA_NINGUNA;
    if (!manual && vigenciaSel !== "") setVigenciaSel("");
    sincronizarDesdeFechas(val, fechaTermino, { pisarVigencia: !manual });
  }

  function aplicarFechaTermino(val: string) {
    setFechaTermino(val);
    const manual = vigenciaSel === VIGENCIA_OTRA || vigenciaSel === VIGENCIA_NINGUNA;
    if (!manual && vigenciaSel !== "") setVigenciaSel("");
    sincronizarDesdeFechas(fechaInicio, val, { pisarVigencia: !manual });
  }

  // ¿La lista de equipos está prístina? Un solo equipo, todos sus campos string
  // vacíos y sin fotos: se puede reemplazar sin preguntar. Cualquier dato escrito
  // (o más de un equipo, o fotos) exige confirmación.
  function equiposPristinos(list: Equipo[]): boolean {
    if (list.length !== 1) return false;
    const eq = list[0];
    if (eq.fotos.length > 0) return false;
    return (Object.keys(eq) as (keyof Equipo)[]).every((k) => {
      if (k === "fotos") return true;
      return String(eq[k]).trim() === "";
    });
  }

  // Mapea los ítems de la cotización a equipos del contrato. Convención aprobada:
  // horas mínimas mensuales = diarias × 30 (editable); 0 → "". Resto de campos
  // parte de emptyEquipo (vacíos).
  function mapCotizacionAEquipos(
    items: { descripcion: string; valorHora: number; horasMinimasDiarias: number }[],
  ): Equipo[] {
    return items.map((it) => ({
      ...emptyEquipo(),
      descripcion: it.descripcion,
      valor_hora: String(it.valorHora),
      horas_minimas_mensuales: it.horasMinimasDiarias > 0 ? String(it.horasMinimasDiarias * 30) : "",
    }));
  }

  // Selección de una cotización real (id): además de fijar el N° de cotización,
  // trae sus datos y auto-rellena cliente, fechas y equipos. Error no bloqueante
  // (el N° ya quedó puesto; el resto es una comodidad).
  async function autofillDesdeCotizacion(id: string) {
    setClienteMismatchHint(null);
    setAutofillLoading(true);
    try {
      const q = await getQuotationForContract(id);
      if (!q) return;

      // a. Cliente: si está vacío y la cotización trae una empresa que existe en
      // la lista, se elige (reusando handleClientChange → prefill representante).
      // Si ya hay un cliente distinto, no se pisa: solo se avisa.
      if (!clientId) {
        if (q.companyId && clients.some((c) => c.id === q.companyId)) {
          handleClientChange(q.companyId);
        }
      } else if (q.companyId && q.companyId !== clientId) {
        setClienteMismatchHint(
          `Ojo: esta cotización pertenece a ${q.clienteNombre ?? "otro cliente"}.`,
        );
      }

      // b. Fechas: si la cotización trae inicio y/o término, se aplican en una
      // sola pasada. NO se encadenan aplicarFechaInicio + aplicarFechaTermino:
      // ambos leen el OTRO campo desde el estado de este render (aún stale, los
      // setState no re-renderizan entre llamadas), así que en un formulario nuevo
      // la sincronización de vigencia/duración quedaba en blanco. Aquí se setean
      // ambas fechas y se sincroniza UNA vez con los strings crudos de la
      // cotización (no el estado), replicando el efecto de los handlers manuales
      // (en modo auto se vuelve a "las fechas mandan" limpiando el plazo elegido;
      // en modo manual la vigencia no se pisa).
      if (q.fechaInicio || q.fechaTermino) {
        const nuevoInicio = q.fechaInicio ?? fechaInicio;
        const nuevoTermino = q.fechaTermino ?? fechaTermino;
        if (q.fechaInicio) setFechaInicio(q.fechaInicio);
        if (q.fechaTermino) setFechaTermino(q.fechaTermino);
        const manual = vigenciaSel === VIGENCIA_OTRA || vigenciaSel === VIGENCIA_NINGUNA;
        if (!manual && vigenciaSel !== "") setVigenciaSel("");
        sincronizarDesdeFechas(nuevoInicio, nuevoTermino, { pisarVigencia: !manual });
      }

      // c. Equipos: reemplazo directo si están prístinos; si hay datos escritos,
      // se abre el diálogo de confirmación (el resto del autofill ya se aplicó).
      if (q.items.length > 0) {
        const nuevos = mapCotizacionAEquipos(q.items);
        if (equiposPristinos(equipos)) {
          setEquipos(nuevos);
        } else {
          setEquiposPendientes(nuevos);
        }
      }
    } catch {
      // No bloqueante: el N° de cotización ya quedó asignado.
    } finally {
      setAutofillLoading(false);
    }
  }

  // Confirmación del diálogo de reemplazo de equipos.
  function confirmarReemplazoEquipos(reemplazar: boolean) {
    if (reemplazar && equiposPendientes) setEquipos(equiposPendientes);
    setEquiposPendientes(null);
  }

  function addEquipo() { setEquipos([...equipos, emptyEquipo()]); }
  function removeEquipo(idx: number) { setEquipos(equipos.filter((_, i) => i !== idx)); }
  function updateEquipo(idx: number, field: keyof Equipo, value: string | number) {
    setEquipos(equipos.map((eq, i) => (i === idx ? { ...eq, [field]: value } : eq)));
  }

  // ── Fotos de respaldo por equipo ──────────────────────────────────────────
  function addFotos(idx: number, files: FileList | null) {
    if (!files || files.length === 0) return;
    const errs: string[] = [];
    const nuevas: FotoNueva[] = [];
    for (const file of Array.from(files)) {
      if (!FOTO_MIME.has(file.type)) {
        errs.push(`${file.name}: solo se aceptan imágenes JPG, PNG o WEBP.`);
        continue;
      }
      if (file.size > FOTO_MAX_SIZE) {
        errs.push(`${file.name}: supera el límite de 5 MB.`);
        continue;
      }
      nuevas.push({ file, tipo: "OTRO", preview: URL.createObjectURL(file) });
    }
    if (nuevas.length > 0) {
      setEquipos(equipos.map((eq, i) => (i === idx ? { ...eq, fotos: [...eq.fotos, ...nuevas] } : eq)));
    }
    setErrors(errs);
  }

  function removeFoto(idx: number, fotoIdx: number) {
    const foto = equipos[idx]?.fotos[fotoIdx];
    if (foto) URL.revokeObjectURL(foto.preview);
    setEquipos(equipos.map((eq, i) =>
      i === idx ? { ...eq, fotos: eq.fotos.filter((_, f) => f !== fotoIdx) } : eq
    ));
  }

  function setFotoTipo(idx: number, fotoIdx: number, tipo: string) {
    setEquipos(equipos.map((eq, i) =>
      i === idx
        ? { ...eq, fotos: eq.fotos.map((f, fi) => (fi === fotoIdx ? { ...f, tipo } : f)) }
        : eq
    ));
  }
  function valorMensual(eq: Equipo): number {
    return parseNum(eq.valor_hora) * parseNum(eq.horas_minimas_mensuales);
  }

  // Condiciones mínimas del paso 1 (cliente + fechas). Las reutiliza validate().
  function datosErrors(): string[] {
    const errs: string[] = [];
    if (!clientId) errs.push("Selecciona un cliente / arrendatario.");
    if (!fechaInicio) errs.push("Ingresa la fecha de inicio.");
    if (fechaTermino && fechaInicio && fechaTermino < fechaInicio)
      errs.push("La fecha de término no puede ser anterior a la de inicio.");
    return errs;
  }

  // Validación parcial al avanzar del paso 1 del asistente.
  function validateDatos(): boolean {
    const errs = datosErrors();
    setErrors(errs);
    return errs.length === 0;
  }

  function validate(): boolean {
    const errs: string[] = [...datosErrors()];
    if (equipos.length === 0) errs.push("Agrega al menos un equipo.");
    equipos.forEach((eq, i) => {
      if (!eq.descripcion.trim()) errs.push(`Equipo ${i + 1}: falta la descripción del equipo.`);
      if (parseNum(eq.valor_hora) < 0) errs.push(`Equipo ${i + 1}: el valor hora no puede ser negativo.`);
      if (parseNum(eq.horas_minimas_mensuales) < 0) errs.push(`Equipo ${i + 1}: las horas mínimas no pueden ser negativas.`);
      if (parseNum(eq.tarifa_hora_extra) < 0) errs.push(`Equipo ${i + 1}: la tarifa hora extra no puede ser negativa.`);
      if (eq.anio && (Number(eq.anio) < 1900 || Number(eq.anio) > 2100))
        errs.push(`Equipo ${i + 1}: el año no es válido.`);
    });
    setErrors(errs);
    return errs.length === 0;
  }

  // ¿El representante ingresado difiere del guardado en la empresa? Solo se
  // pregunta si hay nombre ingresado (no vacío) y el nombre o la cédula cambió
  // respecto de la ficha del cliente (null se compara como "").
  function representanteDifiere(): boolean {
    if (!selectedClient) return false;
    const nombre = representanteCliente.trim();
    if (!nombre) return false;
    const rut = rutRepresentante.trim();
    const nombreGuardado = (selectedClient.representante_legal ?? "").trim();
    const rutGuardado = (selectedClient.rut_representante ?? "").trim();
    return nombre !== nombreGuardado || rut !== rutGuardado;
  }

  // Click en "Crear": valida y, si el representante difiere del de la empresa,
  // abre el diálogo antes de crear. Si no, crea directamente sin actualizar.
  function handleSubmit() {
    if (!validate()) return;
    if (representanteDifiere()) {
      setConfirmRepOpen(true);
      return;
    }
    void crearContrato(false);
  }

  // Confirmación del diálogo: "Sí, actualizar empresa" → crea el contrato y
  // además actualiza la ficha. "No, solo este contrato" → solo crea.
  // Igual que ConfirmDialog: NO cierra de inmediato. Activa loading (bloquea
  // ambos botones del diálogo y muestra "Procesando..."), mantiene el diálogo
  // abierto hasta que crearContrato termine, y recién entonces lo cierra. En
  // el camino feliz crearContrato hace router.push y ya no volvemos; en error
  // (o fotos/empresa fallidas) crearContrato deja loading=false y los mensajes
  // en la página, por lo que al cerrar el diálogo quedan visibles.
  async function confirmarConActualizacion(actualizarEmpresa: boolean) {
    if (loading) return;
    setLoading(true);
    try {
      await crearContrato(actualizarEmpresa);
    } finally {
      setConfirmRepOpen(false);
    }
  }

  // Crea el contrato (payload byte a byte idéntico). Si actualizarEmpresa es
  // true, además sincroniza el representante en la ficha de la empresa; un
  // fallo de ese update NUNCA impide ni duplica la creación del contrato.
  async function crearContrato(actualizarEmpresa: boolean) {
    setLoading(true);
    // Aviso no bloqueante si el update de empresa falla (el contrato ya existe).
    let avisoEmpresa: string | null = null;
    const payload: CreateContractInput = {
      company_id: clientId,
      moneda,
      fecha_inicio: fechaInicio,
      fecha_termino: fechaTermino || null,
      duracion_meses: duracionMeses ? parseInt(duracionMeses, 10) : null,
      lugar_operacion: lugarOperacion || null,
      forma_pago: formaPago || null,
      observaciones: observaciones || null,
      ciudad_celebracion: ciudadCelebracion || null,
      vigencia_contrato: vigenciaContrato || null,
      numero_anexo: numeroAnexo || null,
      fecha_anexo: fechaAnexo || null,
      numero_cotizacion: numeroCotizacion || null,
      correo_notificaciones: correoNotificaciones || null,
      representante_cliente: representanteCliente || null,
      rut_representante: rutRepresentante || null,
      equipos: equipos.map((eq) => ({
        descripcion: eq.descripcion.trim(),
        marca: eq.marca || null,
        modelo: eq.modelo || null,
        patente: eq.patente || null,
        anio: eq.anio ? parseInt(eq.anio, 10) : null,
        chasis: eq.chasis || null,
        motor: eq.motor || null,
        color: eq.color || null,
        valor_hora: parseNum(eq.valor_hora),
        horas_minimas_mensuales: eq.horas_minimas_mensuales.trim() ? Math.round(parseNum(eq.horas_minimas_mensuales)) : null,
        valor_mensual_estimado: valorMensual(eq) || null,
        tarifa_hora_extra: eq.tarifa_hora_extra.trim() ? parseNum(eq.tarifa_hora_extra) : null,
        horometro_inicial: eq.horometro_inicial || null,
        mantenimiento_horas: eq.mantenimiento_horas || null,
        observaciones: eq.observaciones || null,
      })),
    };
    try {
      const result = await createContract(payload);

      // Sincroniza el representante en la ficha de la empresa si el usuario lo
      // confirmó. El contrato YA existe: un fallo aquí no lo revierte ni lo
      // duplica — se informa como aviso no bloqueante.
      if (actualizarEmpresa && selectedClient) {
        try {
          await updateCompanyRepresentante({
            id: selectedClient.id,
            representante_legal: representanteCliente.trim() || null,
            rut_representante: rutRepresentante.trim() || null,
          });
        } catch {
          avisoEmpresa =
            "El contrato se creó, pero no se pudo actualizar el representante de la empresa. Puedes editarlo desde su ficha.";
        }
      }

      // Subir las fotos de respaldo adjuntadas contra el endpoint existente
      // (mismas validaciones que en el detalle). El contrato ya existe: si
      // alguna foto falla, se informa y puede reintentarse desde el detalle.
      const totalFotos = equipos.reduce((acc, eq) => acc + eq.fotos.length, 0);
      if (totalFotos > 0) {
        const fallidas: string[] = [];
        let subidas = 0;
        for (let i = 0; i < equipos.length; i++) {
          const equipmentId = result.equipos.find((e) => e.orden === i + 1)?.id;
          for (const foto of equipos[i].fotos) {
            subidas += 1;
            setUploadMsg(`Subiendo fotos ${subidas}/${totalFotos}...`);
            if (!equipmentId) {
              fallidas.push(`Equipo ${i + 1} — ${foto.file.name}: no se encontró el equipo creado.`);
              continue;
            }
            const fd = new FormData();
            fd.append("file", foto.file);
            fd.append("tipo", foto.tipo);
            try {
              const res = await fetch(`/api/contratos/equipos/${equipmentId}/fotos`, {
                method: "POST",
                body: fd,
              });
              if (!res.ok) {
                const j = (await res.json().catch(() => null)) as { error?: string } | null;
                fallidas.push(`Equipo ${i + 1} — ${foto.file.name}: ${j?.error ?? "no se pudo subir"}.`);
              }
            } catch {
              fallidas.push(`Equipo ${i + 1} — ${foto.file.name}: error de red al subir.`);
            }
          }
        }
        setUploadMsg(null);
        if (fallidas.length > 0) {
          setCreatedId(result.id);
          setErrors([
            ...(avisoEmpresa ? [avisoEmpresa] : []),
            "El contrato se creó correctamente, pero estas fotos no se pudieron subir (puedes reintentar desde el detalle del contrato):",
            ...fallidas,
          ]);
          setLoading(false);
          return;
        }
      }

      // Si el update de empresa falló, no redirigimos: mostramos el aviso y
      // ofrecemos ir al contrato ya creado (evita perder el mensaje).
      if (avisoEmpresa) {
        setCreatedId(result.id);
        setErrors([avisoEmpresa]);
        setLoading(false);
        return;
      }

      router.push(`/contratos/${result.id}`);
    } catch (err) {
      setErrors(
        err instanceof Error
          ? err.message.split("\n")
          : ["Error al guardar el contrato. Intenta nuevamente."]
      );
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <Stepper steps={WIZARD_STEPS} current={step} />

      {step === 1 && (<>
      {/* Bloque 1 — Datos del contrato */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 space-y-4">
        <h2 className="font-semibold text-[#253158]">Datos del contrato</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 space-y-2">
            <Label>Cliente / Arrendatario <span className="text-[#c6352e]">*</span></Label>
            <Select value={clientId} onValueChange={handleClientChange}>
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar cliente...">
                  {selectedClient
                    ? `${selectedClient.nombre}${selectedClient.rut ? ` — ${selectedClient.rut}` : ""}`
                    : null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {clients.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="font-medium">{c.nombre}</span>
                    {c.rut && <span className="block text-xs text-gray-400 leading-tight">{c.rut}</span>}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Moneda del contrato <span className="text-[#c6352e]">*</span></Label>
            <Select value={moneda} onValueChange={(v) => setMoneda((v as Moneda) ?? "CLP")}>
              <SelectTrigger>
                <SelectValue placeholder="Moneda">{moneda}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CLP">CLP — Peso chileno</SelectItem>
                <SelectItem value="UF">UF — Unidad de Fomento</SelectItem>
                <SelectItem value="USD">USD — Dólar</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Fecha de inicio <span className="text-[#c6352e]">*</span></Label>
            <Input
              type="date"
              value={fechaInicio}
              onChange={(e) => aplicarFechaInicio(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Fecha de término</Label>
            <Input
              type="date"
              value={fechaTermino}
              onChange={(e) => aplicarFechaTermino(e.target.value)}
            />
            {fechaInicio && fechaTermino && !spanFechas && (
              <p className="text-xs text-[#c6352e]">La fecha de término debe ser posterior al inicio.</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Ciudad de celebración</Label>
            <Input value={ciudadCelebracion} placeholder="Calama" onChange={(e) => setCiudadCelebracion(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Vigencia del contrato</Label>
            <Select
              value={vigenciaSel}
              onValueChange={(v) => {
                const val = v ?? "";
                setVigenciaSel(val);
                if (val === VIGENCIA_OTRA || val === VIGENCIA_NINGUNA) {
                  // Modo manual: las fechas dejan de pisar la vigencia. La
                  // duración se recalcula desde las fechas actuales para no
                  // dejar meses fantasma de un plazo elegido antes; si el rango
                  // está incompleto o invertido, queda vacía.
                  setVigenciaContrato("");
                  const ini = parseFechaLocal(fechaInicio);
                  const fin = parseFechaLocal(fechaTermino);
                  if (ini && fin && fin > ini) {
                    const meses = mesesCompletos(desgloseSpan(ini, fin));
                    setDuracionMeses(meses > 0 ? String(meses) : "");
                  } else {
                    setDuracionMeses("");
                  }
                } else {
                  // Plazo en años elegido: el texto viaja tal cual y la fecha
                  // de término se ajusta a inicio + N años (si hay inicio).
                  setVigenciaContrato(val);
                  const n = parseInt(val, 10);
                  const ini = parseFechaLocal(fechaInicio);
                  if (ini && Number.isFinite(n)) {
                    // new Date normaliza 29-feb a 28-feb si el año destino no es bisiesto.
                    const fin = new Date(ini.getFullYear() + n, ini.getMonth(), ini.getDate());
                    const y = fin.getFullYear();
                    const mm = String(fin.getMonth() + 1).padStart(2, "0");
                    const dd = String(fin.getDate()).padStart(2, "0");
                    setFechaTermino(`${y}-${mm}-${dd}`);
                  }
                  setDuracionMeses(String(n * 12));
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar vigencia...">
                  {vigenciaSel === VIGENCIA_OTRA
                    ? "Otra vigencia (escribir)"
                    : vigenciaSel === VIGENCIA_NINGUNA
                      ? "Sin especificar"
                      : vigenciaSel
                        ? vigenciaSel
                        // Modo auto: muestra el texto calculado desde las fechas.
                        : (vigenciaContrato || null)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={VIGENCIA_NINGUNA}>Sin especificar</SelectItem>
                {VIGENCIAS.map((v) => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
                <SelectItem value={VIGENCIA_OTRA}>Otra vigencia (escribir)</SelectItem>
              </SelectContent>
            </Select>
            {vigenciaSel === VIGENCIA_OTRA && (
              <Input
                value={vigenciaContrato}
                placeholder="Ej: 18 meses, indefinida..."
                onChange={(e) => setVigenciaContrato(e.target.value)}
              />
            )}
            <p className="text-xs text-gray-400">
              {vigenciaSel === "" && vigenciaContrato
                ? "Según fechas de inicio y término. Si eliges un plazo, la fecha de término se ajusta."
                : "Si no se indica, el PDF usa “2 años”."}
            </p>
          </div>
          <div className="space-y-2">
            <Label>Lugar de operación / entrega</Label>
            <Input value={lugarOperacion} placeholder="Faena / ciudad" onChange={(e) => setLugarOperacion(e.target.value)} />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Label>Observaciones</Label>
            <textarea value={observaciones} onChange={(e) => setObservaciones(e.target.value)} rows={2} placeholder="Notas generales del contrato..." className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#253158]/20 focus:border-[#253158]" />
          </div>
        </div>
      </div>

      {/* Bloque 2 — Cliente / representante */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 space-y-4">
        <h2 className="font-semibold text-[#253158]">Representante del cliente</h2>
        <p className="text-xs text-gray-400 -mt-2">Se autocompletan desde la ficha del cliente seleccionado y quedan editables. La razón social, RUT y dirección se toman del cliente (snapshot al crear).</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Representante legal</Label>
            <Input value={representanteCliente} placeholder="Nombre completo" onChange={(e) => setRepresentanteCliente(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Cédula del representante</Label>
            <Input value={rutRepresentante} placeholder="12.345.678-9" onChange={(e) => setRutRepresentante(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Cierre paso 1 (Bloques 1 y 2) */}
      </>)}

      {step === 2 && (<>
      {/* Bloque 3 — Condiciones particulares / Anexo */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 space-y-4">
        <h2 className="font-semibold text-[#253158]">Condiciones particulares (Anexo)</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>N° de anexo</Label>
            <Input value={numeroAnexo} placeholder="001-A" onChange={(e) => setNumeroAnexo(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Fecha del anexo</Label>
            <Input type="date" value={fechaAnexo} onChange={(e) => setFechaAnexo(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>N° de cotización Solterra</Label>
            <Select
              value={cotizacionSel}
              onValueChange={(v) => {
                const val = v ?? "";
                setCotizacionSel(val);
                if (val === "__manual__" || val === "__ninguna__" || val === "") {
                  setNumeroCotizacion("");
                  // Sin cotización asociada: limpia el aviso de cliente distinto.
                  setClienteMismatchHint(null);
                } else {
                  const cot = cotizaciones.find((c) => c.id === val);
                  setNumeroCotizacion(cot?.numero ?? "");
                  // Además del N°, auto-rellena cliente, fechas y equipos.
                  void autofillDesdeCotizacion(val);
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccionar cotización...">
                  {cotizacionSel === "__manual__"
                    ? "Otro número (manual)"
                    : cotizacionSel === "__ninguna__"
                      ? "Sin cotización asociada"
                      : cotizacionSel
                        ? (cotizaciones.find((c) => c.id === cotizacionSel)?.numero ?? null)
                        : null}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__ninguna__">Sin cotización asociada</SelectItem>
                {cotizaciones.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    <span className="font-medium">{c.numero}</span>
                    <span className="block text-xs text-gray-400 leading-tight">
                      {c.cliente ?? "Sin cliente"} · {c.fecha}
                    </span>
                  </SelectItem>
                ))}
                <SelectItem value="__manual__">Otro número (escribir manualmente)</SelectItem>
              </SelectContent>
            </Select>
            {cotizacionSel === "__manual__" && (
              <Input
                value={numeroCotizacion}
                placeholder="Ej: 177 R2/025"
                onChange={(e) => setNumeroCotizacion(e.target.value)}
              />
            )}
            {autofillLoading && (
              <p className="flex items-center gap-1.5 text-xs text-gray-400">
                <Loader2 className="h-3 w-3 animate-spin" />
                Trayendo datos de la cotización...
              </p>
            )}
            {clienteMismatchHint && (
              <p className="flex items-start gap-1.5 text-xs text-amber-600">
                <AlertTriangle className="h-3.5 w-3.5 flex-shrink-0 mt-0.5" />
                <span>{clienteMismatchHint}</span>
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Condición de pago</Label>
            <Input value={formaPago} placeholder="Anticipado / vencido / 30 días..." onChange={(e) => setFormaPago(e.target.value)} />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Label>Correo para notificaciones</Label>
            <Input type="email" value={correoNotificaciones} placeholder="contacto@cliente.cl" onChange={(e) => setCorreoNotificaciones(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Cierre paso 2 (Bloque 3) */}
      </>)}

      {step === 3 && (<>
      {/* Bloque 4 — Equipos arrendados */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-[#253158]">Equipos arrendados</h2>
          <span className="text-xs text-gray-400">{equipos.length} equipo(s)</span>
        </div>

        {equipos.map((eq, idx) => (
          <div key={idx} className="border border-gray-200 rounded-lg p-3 sm:p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Equipo {idx + 1}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => removeEquipo(idx)} disabled={equipos.length === 1} className="h-8 w-8 p-0 text-gray-300 hover:text-[#c6352e] hover:bg-red-50">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label>Equipo / descripción <span className="text-[#c6352e]">*</span></Label>
              <Input value={eq.descripcion} placeholder="Ej: Excavadora oruga 20 ton" onChange={(e) => updateEquipo(idx, "descripcion", e.target.value)} />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1.5"><Label>Marca</Label><Input value={eq.marca} onChange={(e) => updateEquipo(idx, "marca", e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Modelo</Label><Input value={eq.modelo} onChange={(e) => updateEquipo(idx, "modelo", e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Patente</Label><Input value={eq.patente} onChange={(e) => updateEquipo(idx, "patente", e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Año</Label><Input type="number" min="1900" max="2100" step="1" value={eq.anio} onChange={(e) => updateEquipo(idx, "anio", e.target.value)} /></div>
              <div className="space-y-1.5"><Label>N° chasis</Label><Input value={eq.chasis} onChange={(e) => updateEquipo(idx, "chasis", e.target.value)} /></div>
              <div className="space-y-1.5"><Label>N° motor</Label><Input value={eq.motor} onChange={(e) => updateEquipo(idx, "motor", e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Color</Label><Input value={eq.color} onChange={(e) => updateEquipo(idx, "color", e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Horómetro inicial</Label><Input value={eq.horometro_inicial} placeholder="Ej: 1.250 h" onChange={(e) => updateEquipo(idx, "horometro_inicial", e.target.value)} /></div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1 border-t border-gray-100">
              <div className="space-y-1.5"><Label>Valor hora ({moneda})</Label><Input type="text" inputMode="decimal" placeholder={moneda === "UF" ? "Ej: 1,19" : "0"} value={eq.valor_hora} onFocus={(e) => e.target.select()} onChange={(e) => updateEquipo(idx, "valor_hora", e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Horas mín. mensuales</Label><Input type="text" inputMode="numeric" placeholder="0" value={eq.horas_minimas_mensuales} onFocus={(e) => e.target.select()} onChange={(e) => updateEquipo(idx, "horas_minimas_mensuales", e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Tarifa hora extra ({moneda})</Label><Input type="text" inputMode="decimal" placeholder={moneda === "UF" ? "Ej: 0,12" : "0"} value={eq.tarifa_hora_extra} onFocus={(e) => e.target.select()} onChange={(e) => updateEquipo(idx, "tarifa_hora_extra", e.target.value)} /></div>
              <div className="space-y-1.5">
                <Label>Valor mensual estimado ({moneda})</Label>
                <div className="h-10 flex items-center px-3 rounded-md bg-gray-50 border border-gray-200 text-sm font-semibold text-[#253158] tabular-nums">{fmtMonto(valorMensual(eq), moneda)}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Mantención cada (horas)</Label><Input value={eq.mantenimiento_horas} placeholder="Ej: 250 h" onChange={(e) => updateEquipo(idx, "mantenimiento_horas", e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Observaciones técnicas</Label><Input value={eq.observaciones} placeholder="Notas del equipo..." onChange={(e) => updateEquipo(idx, "observaciones", e.target.value)} /></div>
            </div>

            {/* Fotos de respaldo del equipo (opcional): se suben automáticamente
                al crear el contrato, contra el endpoint existente de fotos. */}
            <div className="space-y-2 pt-2 border-t border-gray-100">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <Label className="flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5 text-gray-400" />
                  Fotos de respaldo (opcional)
                </Label>
                <span className="text-[11px] text-gray-400">JPG/PNG/WEBP · máx. 5 MB c/u</span>
              </div>
              {eq.fotos.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {eq.fotos.map((foto, fi) => (
                    <div key={foto.preview} className="rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
                      <div className="relative aspect-video bg-gray-100 overflow-hidden">
                        <img src={foto.preview} alt={foto.file.name} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removeFoto(idx, fi)}
                          aria-label={`Quitar ${foto.file.name}`}
                          className="absolute top-1 right-1 p-1 rounded-md bg-white/90 text-gray-500 hover:text-[#c6352e] shadow-sm transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      <div className="p-1.5 space-y-1">
                        <p className="text-[10px] text-gray-400 truncate" title={foto.file.name}>{foto.file.name}</p>
                        <select
                          value={foto.tipo}
                          onChange={(e) => setFotoTipo(idx, fi, e.target.value)}
                          aria-label={`Tipo de foto ${foto.file.name}`}
                          className="w-full text-xs border border-gray-200 rounded-md px-1.5 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#253158]/30"
                        >
                          {TIPOS_FOTO.map((t) => (
                            <option key={t.value} value={t.value}>{t.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <label className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-[#253158] border border-dashed border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 transition-colors">
                <ImagePlus className="h-3.5 w-3.5" />
                Agregar fotos
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  className="sr-only"
                  onChange={(e) => { addFotos(idx, e.target.files); e.target.value = ""; }}
                />
              </label>
              <p className="text-xs text-gray-400">
                Se suben al crear el contrato. También puedes agregar más después desde el detalle.
              </p>
            </div>
          </div>
        ))}

        <Button type="button" variant="outline" size="sm" onClick={addEquipo} className="gap-2 text-[#253158] border-[#253158]">
          <Plus className="h-4 w-4" />
          Agregar equipo
        </Button>
      </div>

      {/* Cierre paso 3 (Bloque 4) */}
      </>)}

      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded p-3 space-y-0.5">
          {errors.map((e) => (<p key={e} className="text-sm text-red-600">• {e}</p>))}
        </div>
      )}

      {/* Footer del asistente. El submit (handleSubmit) y la subida de fotos
          no cambian: solo se reparte el formulario en pasos visuales. */}
      <div className="flex justify-between gap-2 bg-white rounded-xl shadow-sm px-5 py-4">
        <Button type="button" variant="outline" disabled={step === 1 || loading} onClick={() => setStep(step - 1)}>
          ← Atrás
        </Button>
        <div className="flex gap-2">
          {createdId ? (
            <Button onClick={() => router.push(`/contratos/${createdId}`)} className="bg-[#253158] hover:bg-[#1e305e] text-white gap-2">
              Ir al contrato creado
            </Button>
          ) : step < 3 ? (
            <Button
              type="button"
              className="bg-[#253158] hover:bg-[#1e305e] text-white"
              onClick={() => { if (step !== 1 || validateDatos()) setStep(step + 1); }}
            >
              Siguiente →
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading} className="bg-[#253158] hover:bg-[#1e305e] text-white gap-2">
              {loading ? (uploadMsg ?? "Guardando...") : "Crear contrato"}
            </Button>
          )}
        </div>
      </div>

      {/* Diálogo: el representante ingresado difiere del guardado en la empresa.
          Replica el patrón visual de ConfirmDialog, pero con dos acciones que
          AMBAS crean el contrato — la elección solo decide si además se
          actualiza la ficha. Mientras se procesa (loading) el diálogo se
          mantiene abierto con ambos botones bloqueados y "Procesando...", y
          Escape/overlay no cierran. Sin procesar, Escape/overlay abortan sin
          crear. */}
      {confirmRepOpen && selectedClient && createPortal(
        <>
          <div
            aria-hidden="true"
            className="fixed inset-0 z-[200] bg-slate-900/40 animate-in fade-in duration-150"
            onClick={() => { if (!loading) setConfirmRepOpen(false); }}
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="rep-dialog-title"
            aria-describedby="rep-dialog-description"
            className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="pointer-events-auto w-full max-w-md bg-white rounded-xl shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
              <div className="h-1 w-full rounded-t-xl bg-[#253158]" />
              <div className="px-6 pt-5 pb-6">
                <div className="flex items-start gap-4 mb-3">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center bg-[#253158]/10">
                    <AlertTriangle className="h-5 w-5 text-[#253158]" />
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <h2 id="rep-dialog-title" className="text-base font-semibold text-gray-900 leading-tight">
                      Representante distinto al registrado
                    </h2>
                  </div>
                </div>
                <p id="rep-dialog-description" className="text-sm text-gray-500 leading-relaxed ml-14">
                  El representante ingresado no coincide con el guardado en la ficha de{" "}
                  <span className="font-medium text-gray-700">{selectedClient.nombre}</span>.
                  ¿Quieres actualizar también la ficha de la empresa con estos datos?
                </p>
                <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => confirmarConActualizacion(false)}
                    disabled={loading}
                    className="h-9 px-4 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    No, solo este contrato
                  </button>
                  <button
                    type="button"
                    onClick={() => confirmarConActualizacion(true)}
                    disabled={loading}
                    className="h-9 px-4 text-sm font-medium rounded-lg text-white bg-[#253158] hover:bg-[#1e2a4a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    {loading ? "Procesando..." : "Sí, actualizar empresa"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}

      {/* Diálogo: reemplazar los equipos del formulario con los de la cotización.
          Se abre solo cuando el formulario ya tiene equipos con datos escritos.
          Ambas opciones conservan el resto del auto-relleno (cliente y fechas ya
          se aplicaron): la elección solo decide si se pisan los equipos. */}
      {equiposPendientes && createPortal(
        <>
          <div
            aria-hidden="true"
            className="fixed inset-0 z-[200] bg-slate-900/40 animate-in fade-in duration-150"
            onClick={() => confirmarReemplazoEquipos(false)}
          />
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="equipos-dialog-title"
            aria-describedby="equipos-dialog-description"
            className="fixed inset-0 z-[201] flex items-center justify-center p-4 pointer-events-none"
          >
            <div className="pointer-events-auto w-full max-w-md bg-white rounded-xl shadow-2xl border border-gray-200 animate-in fade-in zoom-in-95 duration-150">
              <div className="h-1 w-full rounded-t-xl bg-[#253158]" />
              <div className="px-6 pt-5 pb-6">
                <div className="flex items-start gap-4 mb-3">
                  <div className="flex-shrink-0 h-10 w-10 rounded-full flex items-center justify-center bg-[#253158]/10">
                    <AlertTriangle className="h-5 w-5 text-[#253158]" />
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <h2 id="equipos-dialog-title" className="text-base font-semibold text-gray-900 leading-tight">
                      Reemplazar equipos del formulario
                    </h2>
                  </div>
                </div>
                <p id="equipos-dialog-description" className="text-sm text-gray-500 leading-relaxed ml-14">
                  ¿Reemplazar los equipos del formulario con los{" "}
                  <span className="font-medium text-gray-700">{equiposPendientes.length}</span> de la cotización?
                </p>
                <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3 mt-6">
                  <button
                    type="button"
                    onClick={() => confirmarReemplazoEquipos(false)}
                    className="h-9 px-4 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 bg-white hover:bg-gray-50 transition-colors"
                  >
                    No, mantener los actuales
                  </button>
                  <button
                    type="button"
                    onClick={() => confirmarReemplazoEquipos(true)}
                    className="h-9 px-4 text-sm font-medium rounded-lg text-white bg-[#253158] hover:bg-[#1e2a4a] transition-colors"
                  >
                    Sí, reemplazar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>,
        document.body
      )}
    </div>
  );
}
