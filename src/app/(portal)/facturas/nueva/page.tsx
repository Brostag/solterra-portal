import { getActiveClientsForSelector, getActiveProductsForSelector } from "@/lib/cache/master-lists";
import { getCompanySettings } from "@/lib/company-settings";
import NuevaFacturaForm from "./NuevaFacturaForm";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function NuevaFacturaPage() {
  const [clients, products, config] = await Promise.all([
    getActiveClientsForSelector(),
    getActiveProductsForSelector(),
    getCompanySettings(),
  ]);

  const configWarnings: string[] = [];
  if (!config) {
    configWarnings.push("No hay configuración de empresa. El PDF del emisor quedará en blanco.");
  } else {
    if (!config.razon_social?.trim())
      configWarnings.push("Falta la Razón Social de la empresa en Configuración.");
    if (!config.rut?.trim())
      configWarnings.push("Falta el RUT de la empresa en Configuración.");
    if (!config.giro?.trim())
      configWarnings.push("Falta el Giro de la empresa (se mostrará vacío en el PDF).");
    if (!config.direccion?.trim())
      configWarnings.push("Falta la Dirección de la empresa (se mostrará vacía en el PDF).");
  }

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/facturas">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold text-[#253158]">Nueva Factura</h1>
      </div>
      <NuevaFacturaForm
        clients={clients}
        products={products}
        ivaPercent={config ? Number(config.iva_porcentaje) : 19}
        defaultMoneda={(config?.moneda_principal as "CLP" | "USD" | "UF") ?? "CLP"}
        configWarnings={configWarnings}
      />
    </div>
  );
}
