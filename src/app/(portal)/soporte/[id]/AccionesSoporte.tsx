"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cambiarEstadoReporte, guardarNotaInterna } from "../actions";

interface Props {
  id: string;
  estado: string;
  notaInicial: string;
  /** Estados válidos; los envía la página desde `vocabulario.ts` para no
   *  duplicar la lista acá. La server action igual valida. */
  estados: string[];
}

// Gestión interna del reporte: estado y nota. No permite editar el mensaje ni
// los adjuntos — eso lo escribió el cliente y no se altera.
export default function AccionesSoporte({ id, estado, notaInicial, estados }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [nota, setNota] = useState(notaInicial);
  const [error, setError] = useState<string | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const notaCambiada = nota.trim() !== notaInicial.trim();

  function handleEstado(nuevo: string) {
    setError(null);
    setAviso(null);
    startTransition(async () => {
      const res = await cambiarEstadoReporte(id, nuevo);
      if (res && "error" in res) {
        setError(res.error);
        return;
      }
      setAviso(`Reporte marcado como ${nuevo}.`);
      router.refresh();
    });
  }

  function handleNota() {
    setError(null);
    setAviso(null);
    startTransition(async () => {
      const res = await guardarNotaInterna(id, nota);
      if (res && "error" in res) {
        setError(res.error);
        return;
      }
      setAviso("Nota guardada.");
      router.refresh();
    });
  }

  return (
    <section className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
      <h2 className="font-semibold text-[#253158]">Gestión interna</h2>

      <div className="space-y-2">
        <p className="text-xs text-gray-400 uppercase tracking-wide">
          Estado actual: <span className="font-semibold text-gray-600">{estado}</span>
        </p>
        <div className="flex flex-wrap gap-2">
          {estados
            .filter((e) => e !== estado)
            .map((e) => (
              <Button
                key={e}
                type="button"
                size="sm"
                variant="outline"
                onClick={() => handleEstado(e)}
                disabled={isPending}
                className="border-[#253158]/30 text-[#253158] hover:bg-[#253158]/5 disabled:opacity-60"
              >
                {e}
              </Button>
            ))}
        </div>
      </div>

      <div className="space-y-2 border-t border-gray-100 pt-4">
        <label htmlFor="nota-interna" className="block text-xs text-gray-400 uppercase tracking-wide">
          Nota interna
        </label>
        <Textarea
          id="nota-interna"
          value={nota}
          onChange={(ev) => setNota(ev.target.value)}
          disabled={isPending}
          rows={5}
          maxLength={5000}
          placeholder="Diagnóstico, causa o cómo se resolvió. Solo lo ve soporte."
          className="border-gray-200 text-sm"
        />
        <div className="flex justify-end">
          <Button
            type="button"
            size="sm"
            onClick={handleNota}
            disabled={isPending || !notaCambiada}
            className="bg-[#253158] hover:bg-[#1e305e] text-white disabled:opacity-60"
          >
            {isPending ? "Guardando…" : "Guardar nota"}
          </Button>
        </div>
      </div>

      {error && <p className="text-xs text-[#c6352e]">{error}</p>}
      {aviso && !error && <p className="text-xs text-green-600">{aviso}</p>}
    </section>
  );
}
