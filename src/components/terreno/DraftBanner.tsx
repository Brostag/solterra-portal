"use client";

// Aviso no intrusivo de borrador sin enviar (Nivel 1 offline, docs/offline-design.md §2).
// Solo se renderiza client-side cuando useDraft encontró un borrador → sin
// riesgo de hydration mismatch.

function fmtGuardado(ts: number): string {
  const d = new Date(ts);
  const hora = d.toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" });
  const esHoy = d.toDateString() === new Date().toDateString();
  return esHoy ? `de las ${hora}` : `del ${d.toLocaleDateString("es-CL")} a las ${hora}`;
}

export default function DraftBanner({
  savedAt,
  onRestore,
  onDiscard,
  className = "",
}: {
  savedAt: number;
  onRestore: () => void;
  onDiscard: () => void;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border border-[#253158]/15 bg-[#f6f7f9] px-4 py-3 ${className}`.trim()}
    >
      <p className="min-w-0 flex-1 text-sm text-[#253158]">
        Tienes un borrador sin enviar {fmtGuardado(savedAt)}.
      </p>
      <div className="flex flex-shrink-0 items-center gap-3">
        <button
          type="button"
          onClick={onRestore}
          className="rounded-lg bg-[#253158] px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-[#1b2540]"
        >
          Retomar
        </button>
        <button
          type="button"
          onClick={onDiscard}
          className="text-xs font-medium text-gray-500 transition hover:text-[#c6352e]"
        >
          Descartar
        </button>
      </div>
    </div>
  );
}
