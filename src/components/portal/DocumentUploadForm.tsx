"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger,
} from "@/components/ui/select";
import { Upload, X } from "lucide-react";

const TIPOS = [
  { value: "CONTRATO",         label: "Contrato" },
  { value: "COTIZACION",       label: "Cotización" },
  { value: "FACTURA_PROVEEDOR",label: "Factura Proveedor" },
  { value: "GUIA_DESPACHO",    label: "Guía de Despacho" },
  { value: "ORDEN_COMPRA",     label: "Orden de Compra" },
  { value: "CERTIFICADO",      label: "Certificado" },
  { value: "OTRO",             label: "Otro" },
] as const;

interface Props {
  invoice_id?:        string;
  purchase_order_id?: string;
  client_id?:         string;
  supplier_id?:       string;
}

export default function DocumentUploadForm({
  invoice_id, purchase_order_id, client_id, supplier_id,
}: Props) {
  const router = useRouter();
  const [tipo, setTipo]       = useState("");
  const [file, setFile]       = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    setFile(f);
    setError(null);
  }

  function clearFile() {
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleUpload() {
    if (!file || !tipo) { setError("Selecciona tipo y archivo"); return; }
    setLoading(true);
    setError(null);

    const fd = new FormData();
    fd.append("file", file);
    fd.append("tipo_documento", tipo);
    if (invoice_id)        fd.append("invoice_id",        invoice_id);
    if (purchase_order_id) fd.append("purchase_order_id", purchase_order_id);
    if (client_id)         fd.append("client_id",         client_id);
    if (supplier_id)       fd.append("supplier_id",       supplier_id);

    try {
      const res = await fetch("/api/documentos/upload", { method: "POST", body: fd });
      const json = await res.json() as { error?: string };
      if (!res.ok) { setError(json.error ?? "Error al subir"); return; }
      clearFile();
      setTipo("");
      router.refresh();
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-gray-50 rounded-lg border border-dashed border-gray-300 p-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-sm">Tipo de Documento</Label>
          <Select value={tipo} onValueChange={(v) => setTipo(v ?? "")}>
            <SelectTrigger className="bg-white">
              <span className={`flex-1 text-left text-sm ${!tipo ? "text-muted-foreground" : ""}`}>
                {tipo ? (TIPOS.find((t) => t.value === tipo)?.label ?? tipo) : "Seleccionar tipo..."}
              </span>
            </SelectTrigger>
            <SelectContent>
              {TIPOS.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label className="text-sm">Archivo</Label>
          <input
            ref={inputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx"
            onChange={handleFileChange}
            className="block w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded file:border file:border-gray-300 file:text-sm file:bg-white file:cursor-pointer cursor-pointer"
          />
        </div>
      </div>

      {file && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span className="truncate max-w-xs">{file.name}</span>
          <span className="text-gray-400 shrink-0">
            ({(file.size / 1024 / 1024).toFixed(2)} MB)
          </span>
          <button type="button" onClick={clearFile}>
            <X className="h-3.5 w-3.5 text-gray-400 hover:text-[#c6352e]" />
          </button>
        </div>
      )}

      {error && <p className="text-sm text-[#c6352e]">{error}</p>}

      <Button
        type="button"
        size="sm"
        disabled={!file || !tipo || loading}
        onClick={handleUpload}
        className="bg-[#253158] hover:bg-[#1e305e] text-white gap-2"
      >
        <Upload className="h-4 w-4" />
        {loading ? "Subiendo..." : "Subir documento"}
      </Button>
    </div>
  );
}
