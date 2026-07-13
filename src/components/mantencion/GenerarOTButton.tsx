"use client";

import { useState, useTransition } from "react";
import { generarOrdenTrabajo } from "@/app/(operativo)/mantencion/planes/actions";

export default function GenerarOTButton({ planId }: { planId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (
      !confirm(
        "¿Generar la orden de trabajo desde este plan? Se creará en el Taller y el plan quedará “Con OT”.",
      )
    ) {
      return;
    }
    setError(null);
    startTransition(async () => {
      // En éxito la action redirige al detalle de la OT en el Taller.
      const res = await generarOrdenTrabajo(planId);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="rounded-lg bg-[#253158] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1b2540] disabled:opacity-60"
      >
        {pending ? "Generando…" : "Generar orden de trabajo"}
      </button>
      {error && <p className="text-xs text-[#c6352e]">{error}</p>}
    </div>
  );
}
