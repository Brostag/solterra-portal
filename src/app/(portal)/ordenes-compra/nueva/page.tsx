import { getActiveSuppliersForSelector, getActiveProductsForSelector } from "@/lib/cache/master-lists";
import { getCompanySettings } from "@/lib/company-settings";
import { getPortalSessionFast } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import NuevoOCForm from "./NuevoOCForm";

export default async function NuevaOrdenCompraPage() {
  const session = await getPortalSessionFast();
  if (!session) redirect("/login");
  if (session.rol === "USUARIO") redirect("/ordenes-compra");

  const [suppliers, products, config] = await Promise.all([
    getActiveSuppliersForSelector(),
    getActiveProductsForSelector(),
    getCompanySettings(),
  ]);

  const ivaPercent = config ? Number(config.iva_porcentaje) : 19;

  return (
    <NuevoOCForm
      suppliers={suppliers.map((s) => ({ ...s, rut: s.rut ?? null }))}
      products={products}
      ivaPercent={ivaPercent}
      mode="create"
    />
  );
}
