"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createContract, type CreateContractInput } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Camera, ImagePlus, X } from "lucide-react";
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
  clients: { id: string; nombre: string; rut: string | null }[];
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

  const selectedClient = clients.find((c) => c.id === clientId);

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

  async function handleSubmit() {
    if (!validate()) return;
    setLoading(true);
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
            "El contrato se creó correctamente, pero estas fotos no se pudieron subir (puedes reintentar desde el detalle del contrato):",
            ...fallidas,
          ]);
          setLoading(false);
          return;
        }
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
            <Select value={clientId} onValueChange={(v) => setClientId(v ?? "")}>
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
            <Input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Fecha de término</Label>
            <Input type="date" value={fechaTermino} onChange={(e) => setFechaTermino(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Ciudad de celebración</Label>
            <Input value={ciudadCelebracion} placeholder="Calama" onChange={(e) => setCiudadCelebracion(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Vigencia del contrato</Label>
            <Input value={vigenciaContrato} placeholder="2 años" onChange={(e) => setVigenciaContrato(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Duración del arriendo (meses)</Label>
            <Input type="number" min="1" step="1" value={duracionMeses} placeholder="Opcional" onChange={(e) => setDuracionMeses(e.target.value)} />
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
        <p className="text-xs text-gray-400 -mt-2">La razón social, RUT y dirección se toman del cliente seleccionado (snapshot al crear).</p>
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
                } else {
                  const cot = cotizaciones.find((c) => c.id === val);
                  setNumeroCotizacion(cot?.numero ?? "");
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
            </div>
          </div>
        ))}

        <Button type="button" variant="outline" size="sm" onClick={addEquipo} className="gap-2 text-[#253158] border-[#253158]">
          <Plus className="h-4 w-4" />
          Agregar equipo
        </Button>
      </div>

      {/* Bloque 5 — Nota sobre el respaldo fotográfico */}
      <div className="bg-white rounded-lg border border-dashed border-gray-300 p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-gray-50 rounded-md flex-shrink-0"><Camera className="h-5 w-5 text-gray-400" /></div>
          <div>
            <h2 className="font-semibold text-[#253158]">Respaldo fotográfico del equipo</h2>
            <p className="text-sm text-gray-500 mt-1">
              Adjunta las fotos en la sección «Fotos de respaldo» de cada equipo: se subirán
              automáticamente al crear el contrato. También puedes agregar más después desde el detalle.
            </p>
          </div>
        </div>
      </div>
      {/* Cierre paso 3 (Bloques 4 y 5) */}
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
    </div>
  );
}
