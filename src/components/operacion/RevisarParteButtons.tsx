"use client";

import { useState, useTransition } from "react";
import {
  aprobarParte,
  rechazarParte,
} from "@/app/(operativo)/operacion/partes-diarios/actions";

export default function RevisarParteButtons({ id }: { id: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function revisar(accion: "aprobar" | "rechazar") {
    setError(null);
    startTransition(async () => {
      const res =
        accion === "aprobar" ? await aprobarParte(id) : await rechazarParte(id);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => revisar("aprobar")}
          disabled={pending}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:opacity-60"
        >
          Aprobar
        </button>
        <button
          type="button"
          onClick={() => revisar("rechazar")}
          disabled={pending}
          className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-[#c6352e] transition hover:bg-red-50 disabled:opacity-60"
        >
          Rechazar
        </button>
      </div>
      {error && <p className="text-xs text-[#c6352e]">{error}</p>}
    </div>
  );
}
