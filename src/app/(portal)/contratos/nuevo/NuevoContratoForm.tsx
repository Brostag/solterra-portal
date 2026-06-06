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
  observaciones: string;
}

function emptyEquipo(): Equipo {
  return {
    descripcion: "", marca: "", modelo: "", patente: "", anio: "",
    chasis: "", motor: "", color: "", valor_hora: 0,
    horas_minimas_mensuales: 0, observaciones: "",
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
  const [equipos, setEquipos] = useState<Equipo[]>([emptyEquipo()]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const selectedClient = clients.find((c) => c.id === clientId);

  function addEquipo() {
    setEquipos([...equipos, emptyEquipo()]);
  }
  function removeEquipo(idx: number) {
    setEquipos(equipos.filter((_, i) => i !== idx));
  }
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
      {/* Datos del contrato */}
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
            <Label>Duración (meses)</Label>
            <Input type="number" min="1" step="1" value={duracionMeses} placeholder="Opcional"
              onChange={(e) => setDuracionMeses(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Lugar de operación</Label>
            <Input value={lugarOperacion} placeholder="Faena / ciudad"
              onChange={(e) => setLugarOperacion(e.target.value)} />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Label>Condición de pago</Label>
            <Input value={formaPago} placeholder="Ej: 30 días, contra estado de pago..."
              onChange={(e) => setFormaPago(e.target.value)} />
          </div>
          <div className="sm:col-span-2 space-y-2">
            <Label>Observaciones</Label>
            <textarea
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              rows={3}
              placeholder="Notas generales del contrato..."
              className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#253158]/20 focus:border-[#253158]"
            />
          </div>
        </div>
      </div>

      {/* Equipos */}
      <div className="bg-white rounded-lg border p-4 sm:p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-[#253158]">Equipos arrendados</h2>
          <span className="text-xs text-gray-400">{equipos.length} equipo(s)</span>
        </div>

        {equipos.map((eq, idx) => (
          <div key={idx} className="border border-gray-200 rounded-lg p-3 sm:p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Equipo {idx + 1}
              </span>
              <Button
                type="button" variant="ghost" size="sm"
                onClick={() => removeEquipo(idx)}
                disabled={equipos.length === 1}
                className="h-8 w-8 p-0 text-gray-300 hover:text-[#c6352e] hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-1.5">
              <Label>Equipo / descripción <span className="text-[#c6352e]">*</span></Label>
              <Input value={eq.descripcion} placeholder="Ej: Excavadora oruga 20 ton"
                onChange={(e) => updateEquipo(idx, "descripcion", e.target.value)} />
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1.5">
                <Label>Marca</Label>
                <Input value={eq.marca} onChange={(e) => updateEquipo(idx, "marca", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Modelo</Label>
                <Input value={eq.modelo} onChange={(e) => updateEquipo(idx, "modelo", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Patente</Label>
                <Input value={eq.patente} onChange={(e) => updateEquipo(idx, "patente", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Año</Label>
                <Input type="number" min="1900" max="2100" step="1" value={eq.anio}
                  onChange={(e) => updateEquipo(idx, "anio", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>N° chasis</Label>
                <Input value={eq.chasis} onChange={(e) => updateEquipo(idx, "chasis", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>N° motor</Label>
                <Input value={eq.motor} onChange={(e) => updateEquipo(idx, "motor", e.target.value)} />
              </div>
              <div className="space-y-1.5">
                <Label>Color</Label>
                <Input value={eq.color} onChange={(e) => updateEquipo(idx, "color", e.target.value)} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-gray-100">
              <div className="space-y-1.5">
                <Label>Valor hora (CLP)</Label>
                <Input type="number" min="0" step="1" value={eq.valor_hora}
                  onChange={(e) => updateEquipo(idx, "valor_hora", parseFloat(e.target.value) || 0)} />
              </div>
              <div className="space-y-1.5">
                <Label>Horas mínimas mensuales</Label>
                <Input type="number" min="0" step="1" value={eq.horas_minimas_mensuales}
                  onChange={(e) => updateEquipo(idx, "horas_minimas_mensuales", parseFloat(e.target.value) || 0)} />
              </div>
              <div className="space-y-1.5">
                <Label>Valor mensual estimado</Label>
                <div className="h-10 flex items-center px-3 rounded-md bg-gray-50 border border-gray-200 text-sm font-semibold text-[#253158] tabular-nums">
                  {formatCurrency(valorMensual(eq), "CLP")}
                </div>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Observaciones del equipo</Label>
              <textarea
                value={eq.observaciones}
                onChange={(e) => updateEquipo(idx, "observaciones", e.target.value)}
                rows={2}
                placeholder="Horómetro inicial, hora extra, mantención cada X horas, etc."
                className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#253158]/20 focus:border-[#253158]"
              />
            </div>
          </div>
        ))}

        <Button type="button" variant="outline" size="sm" onClick={addEquipo}
          className="gap-2 text-[#253158] border-[#253158]">
          <Plus className="h-4 w-4" />
          Agregar equipo
        </Button>
      </div>

      {/* Respaldo fotográfico — pendiente C2.2 */}
      <div className="bg-white rounded-lg border border-dashed p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-gray-50 rounded-md flex-shrink-0">
            <Camera className="h-5 w-5 text-gray-400" />
          </div>
          <div>
            <h2 className="font-semibold text-[#253158]">Respaldo fotográfico del equipo</h2>
            <p className="text-sm text-gray-500 mt-1">
              La carga de fotos del equipo arrendado se habilitará en la próxima fase (C2.2).
              Por ahora puedes registrar las observaciones de cada equipo más arriba.
            </p>
          </div>
        </div>
      </div>

      {errors.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded p-3 space-y-0.5">
          {errors.map((e) => (
            <p key={e} className="text-sm text-red-600">• {e}</p>
          ))}
        </div>
      )}

      <div className="flex justify-end">
        <Button onClick={handleSubmit} disabled={loading}
          className="bg-[#253158] hover:bg-[#1e305e] text-white gap-2">
          {loading ? "Guardando..." : "Crear contrato"}
        </Button>
      </div>
    </div>
  );
}
