"use client";

import { useState, useTransition } from "react";

// Botón genérico de anulación con motivo (trazable, no borra). Reemplaza los
// 3 botones casi idénticos de checklist/checklist-mant/certificado-mant.
// La server action se pasa como prop desde el Server Component de detalle.
export default function AnularConMotivoButton({
  id,
  label,
  titulo,
  nota,
  onAnular,
}: {
  id: string;
  label: string;
  titulo: string;
  nota?: string;
  onAnular: (id: string, motivo: string) => Promise<{ error?: string } | void>;
}) {
  const [abierto, setAbierto] = useState(false);
  const [motivo, setMotivo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirmar() {
    setError(null);
    if (!motivo.trim()) {
      setError("Indica el motivo de anulación.");
      return;
    }
    startTransition(async () => {
      const res = await onAnular(id, motivo);
      if (res?.error) setError(res.error);
    });
  }

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-[#c6352e] transition hover:bg-red-50"
      >
        {label}
      </button>
    );
  }

  return (
    <div className="w-full max-w-md rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
      <p className="text-sm font-semibold text-[#253158]">{titulo}</p>
      {nota && <p className="mt-1 text-xs text-gray-500">{nota}</p>}
      <textarea
        value={motivo}
        onChange={(e) => setMotivo(e.target.value)}
        rows={2}
        placeholder="Motivo de la anulación"
        className="mt-3 w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-[#253158] focus:border-[#253158] focus:outline-none focus:ring-2 focus:ring-[#253158]/15"
      />
      {error && <p className="mt-1 text-xs text-[#c6352e]">{error}</p>}
      <div className="mt-3 flex items-center gap-3">
        <button
          type="button"
          onClick={confirmar}
          disabled={pending}
          className="rounded-lg bg-[#c6352e] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#a82c26] disabled:opacity-60"
        >
          {pending ? "Anulando…" : "Confirmar anulación"}
        </button>
        <button
          type="button"
          onClick={() => setAbierto(false)}
          className="text-sm font-medium text-gray-500 hover:text-[#253158]"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}
