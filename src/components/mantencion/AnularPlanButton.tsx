"use client";

import { useState, useTransition } from "react";
import { anularPlan } from "@/app/(operativo)/mantencion/planes/actions";

export default function AnularPlanButton({ planId }: { planId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onClick() {
    if (!confirm("¿Anular este plan? No se podrá generar una orden de trabajo desde él.")) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const res = await anularPlan(planId);
      if (res?.error) setError(res.error);
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-[#c6352e] transition hover:bg-red-50 disabled:opacity-60"
      >
        {pending ? "Anulando…" : "Anular plan"}
      </button>
      {error && <p className="text-xs text-[#c6352e]">{error}</p>}
    </div>
  );
}
