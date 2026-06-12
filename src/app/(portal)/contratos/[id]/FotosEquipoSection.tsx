"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Camera, ImageOff, Upload } from "lucide-react";

const TIPO_LABELS: Record<string, string> = {
  FRONTAL:           "Frontal",
  LATERAL_DERECHO:   "Lateral derecho",
  LATERAL_IZQUIERDO: "Lateral izquierdo",
  TRASERA:           "Trasera",
  CABINA:            "Cabina",
  HOROMETRO:         "Horómetro",
  RODADO:            "Rodado",
  DANIOS:            "Daños",
  OTRO:              "Otro",
};
const TIPOS = Object.keys(TIPO_LABELS);

export interface FotoEquipo {
  id: string;
  tipo: string;
  nombre_original: string;
  observacion: string | null;
  created_at: string;
  signedUrl: string | null;
}
export interface EquipoConFotos {
  id: string;
  descripcion: string;
  photos: FotoEquipo[];
}
interface Props {
  equipos: EquipoConFotos[];
  canManage: boolean;
}

function EquipoFotos({ equipo, canManage }: { equipo: EquipoConFotos; canManage: boolean }) {
  const router = useRouter();
  const [tipo, setTipo] = useState("FRONTAL");
  const [observacion, setObservacion] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleUpload() {
    if (!file) { setError("Selecciona una imagen."); return; }
    setLoading(true);
    setError(null);
    const fd = new FormData();
    fd.append("file", file);
    fd.append("tipo", tipo);
    if (observacion.trim()) fd.append("observacion", observacion.trim());
    try {
      const res = await fetch(`/api/contratos/equipos/${equipo.id}/fotos`, {
        method: "POST",
        body: fd,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Error al subir la foto.");
      }
      setFile(null);
      setObservacion("");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al subir la foto.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="border border-gray-200 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-semibold text-gray-800 text-sm">{equipo.descripcion}</h3>
        <span className="text-xs text-gray-400">{equipo.photos.length} foto(s)</span>
      </div>

      {equipo.photos.length === 0 ? (
        <p className="text-sm text-gray-400">Sin fotos registradas para este equipo.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {equipo.photos.map((f) => (
            <div key={f.id} className="rounded-lg border border-gray-200 overflow-hidden bg-gray-50">
              <div className="aspect-video bg-gray-100 flex items-center justify-center overflow-hidden">
                {f.signedUrl ? (
                  // Imagen privada de Supabase Storage vía signed URL. Se usa <img> nativo
                  // (no next/image) para no tocar next.config.ts en esta fase.
                  // lazy + async: las fotos (hasta 5 MB c/u) solo se descargan al
                  // acercarse al viewport, sin bloquear el render del detalle.
                  <img
                    src={f.signedUrl}
                    alt={TIPO_LABELS[f.tipo] ?? f.tipo}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageOff className="h-6 w-6 text-gray-300" />
                )}
              </div>
              <div className="px-2 py-1.5">
                <p className="text-[11px] font-semibold text-[#253158] truncate">{TIPO_LABELS[f.tipo] ?? f.tipo}</p>
                <p className="text-[10px] text-gray-400 truncate" title={f.nombre_original}>{f.nombre_original}</p>
                <p className="text-[10px] text-gray-400">{new Date(f.created_at).toLocaleDateString("es-CL")}</p>
                {f.observacion && <p className="text-[10px] text-gray-500 mt-0.5 line-clamp-2">{f.observacion}</p>}
              </div>
            </div>
          ))}
        </div>
      )}

      {canManage && (
        <div className="border-t border-gray-100 pt-3 grid grid-cols-1 sm:grid-cols-[160px_1fr_auto] gap-2 items-end">
          <div className="space-y-1.5">
            <Label className="text-xs">Tipo de foto</Label>
            <Select value={tipo} onValueChange={(v) => { if (v) setTipo(v); }}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {TIPOS.map((t) => (
                  <SelectItem key={t} value={t}>{TIPO_LABELS[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Imagen (JPG/PNG/WEBP, máx. 5 MB)</Label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={(e) => { setFile(e.target.files?.[0] ?? null); setError(null); }}
              className="block w-full text-xs text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-medium file:bg-[#253158]/10 file:text-[#253158] hover:file:bg-[#253158]/20 file:cursor-pointer"
            />
          </div>
          <Button
            onClick={handleUpload}
            disabled={loading || !file}
            className="bg-[#253158] hover:bg-[#1e305e] text-white gap-2"
          >
            <Upload className="h-4 w-4" />
            {loading ? "Subiendo..." : "Subir foto"}
          </Button>
          <div className="sm:col-span-3 space-y-1.5">
            <Label className="text-xs">Descripción (opcional)</Label>
            <input
              value={observacion}
              onChange={(e) => setObservacion(e.target.value)}
              placeholder="Ej: estado del rodado, daño en puerta lateral..."
              className="block w-full rounded-md border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#253158]/20 focus:border-[#253158]"
            />
          </div>
          {error && <p className="sm:col-span-3 text-xs text-red-600">{error}</p>}
        </div>
      )}
    </div>
  );
}

export default function FotosEquipoSection({ equipos, canManage }: Props) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Camera className="h-5 w-5 text-[#253158]" />
        <h2 className="font-semibold text-[#253158]">Respaldo fotográfico de los equipos</h2>
      </div>
      {equipos.length === 0 ? (
        <p className="text-sm text-gray-400">Este contrato no tiene equipos registrados.</p>
      ) : (
        <div className="space-y-3">
          {equipos.map((eq) => (
            <EquipoFotos key={eq.id} equipo={eq} canManage={canManage} />
          ))}
        </div>
      )}
    </div>
  );
}
