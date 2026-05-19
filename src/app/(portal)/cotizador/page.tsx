import { getPortalSessionFast } from "@/lib/auth/session";
import { getCompanySettings } from "@/lib/company-settings";
import { redirect } from "next/navigation";
import CotizadorForm from "./CotizadorForm";

export default async function CotizadorPage() {
  const [session, config] = await Promise.all([
    getPortalSessionFast(),
    getCompanySettings(),
  ]);
  if (!session) redirect("/login");

  const ivaPorcentaje = config ? Number(config.iva_porcentaje) : 19;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#253158]">Cotizador de Arriendo</h1>
        <p className="text-gray-500 text-sm mt-1">
          Calcula presupuestos rápidos para arriendo de maquinaria y servicios.
        </p>
      </div>
      <CotizadorForm ivaPorcentaje={ivaPorcentaje} />
    </div>
  );
}
