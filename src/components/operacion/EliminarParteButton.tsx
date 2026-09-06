"use client";

import { useState, useTransition } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { deleteParte } from "@/app/(operativo)/mantencion/ordenes-trabajo/actions";

// Botón de solo ícono para la columna "Acciones" del listado de órdenes de
// trabajo. Vive en su propio componente (y no inline en PartesLista) porque
// cada fila necesita su propio estado de pending/error: los hooks no se
// pueden invocar dentro de un .map().
export default function EliminarParteButton({ id }: { id: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onClick(ev: React.MouseEvent<HTMLButtonElement>) {
    // La fila completa del listado es clickeable (navega al detalle): sin
    // este stopPropagation, tocar "Eliminar" también dispararía la navegación.
    ev.stopPropagation();
    if (!confirm("¿Eliminar esta orden de trabajo? Esta acción no se puede deshacer.")) {
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        // deleteParte no redirige: el borrado ocurre desde el propio listado,
        // que ya está en la página correcta. En error devuelve { error }.
        const res = await deleteParte(id);
        if (res?.error) setError(res.error);
      } catch {
        // La action puede RECHAZAR en vez de devolver { error }: requireModule
        // lanza, y en terreno la conexión se cae a media llamada. Sin este
        // catch el usuario no ve nada y reintenta a ciegas.
        setError(
          "No se pudo completar la acción. Revisa tu conexión e intenta nuevamente.",
        );
      }
    });
  }

  return (
    <div className="relative inline-flex">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        title="Eliminar"
        aria-label="Eliminar orden de trabajo"
        className="rounded-lg p-1.5 text-[#c6352e] transition hover:bg-red-50 disabled:opacity-60"
      >
        {pending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Trash2 className="h-4 w-4" />
        )}
      </button>
      {error && (
        <p
          role="alert"
          className="absolute right-0 top-full z-10 mt-1 w-52 rounded-md bg-white p-2 text-left text-xs font-normal text-[#c6352e] shadow-lg ring-1 ring-red-200"
        >
          {error}
        </p>
      )}
    </div>
  );
}
