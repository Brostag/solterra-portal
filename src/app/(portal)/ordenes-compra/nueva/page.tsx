import { getCompanySuppliersForSelector, getActiveProductsForSelector } from "@/lib/cache/master-lists";
import { getCompanySettings } from "@/lib/company-settings";
import { getPortalSessionFast } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import NuevoOCForm from "./NuevoOCForm";

export default async function NuevaOrdenCompraPage() {
  const session = await getPortalSessionFast();
  if (!session) redirect("/login");
  if (session.rol === "USUARIO") redirect("/ordenes-compra");

  const [empresas, products, config] = await Promise.all([
    getCompanySuppliersForSelector(),
    getActiveProductsForSelector(),
    getCompanySettings(),
  ]);

  const ivaPercent = config ? Number(config.iva_porcentaje) : 19;

  // Empresas con rol proveedor, adaptadas a la forma del selector de la OC.
  const suppliers = empresas.map((e) => ({
    id: e.id,
    nombre: e.nombre_razon_social,
    rut: e.rut,
  }));

  return (
    <NuevoOCForm
      suppliers={suppliers}
      products={products}
      ivaPercent={ivaPercent}
      mode="create"
    />
  );
}
