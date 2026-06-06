"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createContract, type CreateContractInput } from "../actions";
import { formatCurrency } from "@/lib/currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Camera } from "lucide-react";

interface Equipo {
  descripcion: string;
  marca: string;
  modelo: string;
  patente: string;
  anio: string;
  chasis: string;
  motor: string;
  color: string;
  valor_hora: number;
  horas_minimas_mensuales: number;
  tarifa_hora_extra: number;
  horometro_inicial: string;
  mantenimiento_horas: string;
  observaciones: string;
}

function emptyEquipo(): Equipo {
  return {
    descripcion: "", marca: "", modelo: "", patente: "", anio: "",
    chasis: "", motor: "", color: "", valor_hora: 0,
    horas_minimas_mensuales: 0, tarifa_hora_extra: 0,
    horometro_inicial: "", mantenimiento_horas: "", observaciones: "",
  };
}

interface Props {
  clients: { id: string; nombre: string; rut: string | null }[];
}

export default function NuevoContratoForm({ clients }: Props) {
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
  // Representante del cliente
  const [representanteCliente, setRepresentanteCliente] = useState("");
  const [rutRepresentante, setRutRepresentante] = useState("");
  // Condiciones particulares / anexo
  const [numeroAnexo, setNumeroAnexo] = useState("");
  const [fechaAnexo, setFechaAnexo] = useState("");
  const [numeroCotizacion, setNumeroCotizacion] = useState("");
  const [correoNotificaciones, setCorreoNotificaciones] = useState("");
  const [equipos, setEquipos] = useState<Equipo[]>([emptyEquipo()]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const selectedClient = clients.find((c) => c.id === clientId);

  function addEquipo() { setEquipos([...equipos, emptyEquipo()]); }
  function removeEquipo(idx: number) { setEquipos(equipos.filter((_, i) => i !== idx)); }
  function updateEquipo(idx: number, field: keyof Equipo, value: string | number) {
    setEquipos(equipos.map((eq, i) => (i === idx ? { ...eq, [field]: value } : eq)));
  }
  function valorMensual(eq: Equipo): number {
    return (eq.valor_hora || 0) * (eq.horas_minimas_mensuales || 0);
  }

  function validate(): boolean {
    const errs: string[] = [];
    if (!clientId) errs.push("Selecciona un cliente / arrendatario.");
    if (!fechaInicio) errs.push("Ingresa la fecha de inicio.");
    if (fechaTermino && fechaInicio && fechaTermino < fechaInicio)
      errs.push("La fecha de término no puede ser anterior a la de inicio.");
    if (equipos.length === 0) errs.push("Agrega al menos un equipo.");
    equipos.forEach((eq, i) => {
      if (!eq.descripcion.trim()) errs.push(`Equipo ${i + 1}: falta la descripción del equipo.`);
      if (eq.valor_hora < 0) errs.push(`Equipo ${i + 1}: el valor hora no puede ser negativo.`);
      if (eq.horas_minimas_mensuales < 0) errs.push(`Equipo ${i + 1}: las horas mínimas no pueden ser negativas.`);
      if (eq.tarifa_hora_extra < 0) errs.push(`Equipo ${i + 1}: la tarifa hora extra no puede ser negativa.`);
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
      client_id: clientId,
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
        valor_hora: eq.valor_hora || 0,
        horas_minimas_mensuales: eq.horas_minimas_mensuales || null,
        valor_mensual_estimado: valorMensual(eq) || null,
        tarifa_hora_extra: eq.tarifa_hora_extra || null,
        horometro_inicial: eq.horometro_inicial || null,
        mantenimiento_horas: eq.mantenimiento_horas || null,
        observaciones: eq.observaciones || null,
      })),
    };
    try {
      const result = await createContract(payload);
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
      {/* Bloque 1 — Datos del contrato */}
      <div className="bg-white rounded-lg border p-4 sm:p-6 space-y-4">
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
      <div className="bg-white rounded-lg border p-4 sm:p-6 space-y-4">
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

      {/* Bloque 3 — Condiciones particulares / Anexo */}
      <div className="bg-white rounded-lg border p-4 sm:p-6 space-y-4">
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
            <Input value={numeroCotizacion} placeholder="177 R2/025" onChange={(e) => setNumeroCotizacion(e.target.value)} />
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

      {/* Bloque 4 — Equipos arrendados */}
      <div className="bg-white rounded-lg border p-4 sm:p-6 space-y-4">
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
              <div className="space-y-1.5"><Label>Valor hora (CLP)</Label><Input type="number" min="0" step="1" value={eq.valor_hora} onChange={(e) => updateEquipo(idx, "valor_hora", parseFloat(e.target.value) || 0)} /></div>
              <div className="space-y-1.5"><Label>Horas mín. mensuales</Label><Input type="number" min="0" step="1" value={eq.horas_minimas_mensuales} onChange={(e) => updateEquipo(idx, "horas_minimas_mensuales", parseFloat(e.target.value) || 0)} /></div>
              <div className="space-y-1.5"><Label>Tarifa hora extra (CLP)</Label><Input type="number" min="0" step="1" value={eq.tarifa_hora_extra} onChange={(e) => updateEquipo(idx, "tarifa_hora_extra", parseFloat(e.target.value) || 0)} /></div>
              <div className="space-y-1.5">
                <Label>Valor mensual estimado</Label>
                <div className="h-10 flex items-center px-3 rounded-md bg-gray-50 border border-gray-200 text-sm font-semibold text-[#253158] tabular-nums">{formatCurrency(valorMensual(eq), "CLP")}</div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5"><Label>Mantención cada (horas)</Label><Input value={eq.mantenimiento_horas} placeholder="Ej: 250 h" onChange={(e) => updateEquipo(idx, "mantenimiento_horas", e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Observaciones técnicas</Label><Input value={eq.observaciones} placeholder="Notas del equipo..." onChange={(e) => updateEquipo(idx, "observaciones", e.target.value)} /></div>
            </div>
          </div>
        ))}

        <Button type="button" variant="outline" size="sm" onClick={addEquipo} className="gap-2 text-[#253158] border-[#253158]">
          <Plus className="h-4 w-4" />
          Agregar equipo
        </Button>
      </div>

      {/* Bloque 5 — Respaldo fotográfico (subida en el detalle) */}
      <div className="bg-white rounded-lg border border-dashed p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-gray-50 rounded-md flex-shrink-0"><Camera className="h-5 w-5 text-gray-400" /></div>
          <div>
            <h2 className="font-semibold text-[#253158]">Respaldo fotográfico del equipo</h2>
            <p className="text-sm text-gray-500 mt-1">Una vez creado el contrato, podrás subir las fotos de cada equipo desde el detalle del contrato.</p>
          </div>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded p-3 space-y-0.5">
          {errors.map((e) => (<p key={e} className="text-sm text-red-600">• {e}</p>))}
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={loading} className="bg-[#253158] hover:bg-[#1e305e] text-white gap-2">
          {loading ? "Guardando..." : "Crear contrato"}
        </Button>
      </div>
    </div>
  );
}
