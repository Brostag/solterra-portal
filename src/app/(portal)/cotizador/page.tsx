import { getPortalSessionFast } from "@/lib/auth/session";
import { getCompanySettings } from "@/lib/company-settings";
import { getCompanyClientsForSelector } from "@/lib/cache/master-lists";
import { redirect } from "next/navigation";
import VolverAlDashboard from "@/components/portal/VolverAlDashboard";
import CotizadorForm from "./CotizadorForm";
import { getNextQuotationNumber } from "@/app/(portal)/cotizaciones/actions";
import { GASTOS_INICIALES, normalizarGastos } from "@/lib/cotizador";

export default async function CotizadorPage() {
  const [session, config, empresas, numeroSugerido] = await Promise.all([
    getPortalSessionFast(),
    getCompanySettings(),
    getCompanyClientsForSelector(),
    getNextQuotationNumber(),
  ]);
  if (!session) redirect("/login");

  const ivaPorcentaje = config ? Number(config.iva_porcentaje) : 19;

  // Gastos por defecto guardados por la empresa. Si no hay lista guardada
  // (o está vacía tras normalizar), se parte con los 9 gastos históricos.
  const gastosGuardados = config ? normalizarGastos(config.cotizador_gastos_default) : [];
  const gastosDefault = gastosGuardados.length > 0 ? gastosGuardados : GASTOS_INICIALES;

  // Solo ADMIN/SUPERVISOR pueden persistir la lista como default de la empresa.
  const canSaveGastos = session.rol === "ADMINISTRADOR" || session.rol === "SUPERVISOR";

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
      <CotizadorForm
        ivaPorcentaje={ivaPorcentaje}
        clientes={clientes}
        numeroSugerido={numeroSugerido}
        gastosDefault={gastosDefault}
        canSaveGastos={canSaveGastos}
      />
    </div>
  );
}
