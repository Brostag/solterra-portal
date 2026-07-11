import { getPortalSessionFast } from "@/lib/auth/session";
import { getCompanySettings } from "@/lib/company-settings";
import { getCompanyClientsForSelector } from "@/lib/cache/master-lists";
import { redirect } from "next/navigation";
import VolverAlDashboard from "@/components/portal/VolverAlDashboard";
import CotizadorForm from "./CotizadorForm";
import { getNextQuotationNumber } from "@/app/(portal)/cotizaciones/actions";

export default async function CotizadorPage() {
  const [session, config, empresas, numeroSugerido] = await Promise.all([
    getPortalSessionFast(),
    getCompanySettings(),
    getCompanyClientsForSelector(),
    getNextQuotationNumber(),
  ]);
  if (!session) redirect("/login");

  const ivaPorcentaje = config ? Number(config.iva_porcentaje) : 19;

  // Empresas (rol cliente/arrendataria) adaptadas a la forma del selector.
  const clientes = empresas.map((e) => ({
    id: e.id,
    nombre: e.nombre_razon_social,
    rut: e.rut,
  }));

  return (
    <div className="space-y-6">
      <VolverAlDashboard />

      <div>
        <h1 className="text-2xl font-bold text-[#253158]">Cotizador de Arriendo</h1>
        <p className="text-gray-500 text-sm mt-1">
          Calcula presupuestos rápidos para arriendo de maquinaria y servicios.
        </p>
      </div>
      <CotizadorForm ivaPorcentaje={ivaPorcentaje} clientes={clientes} numeroSugerido={numeroSugerido} />
    </div>
  );
}
