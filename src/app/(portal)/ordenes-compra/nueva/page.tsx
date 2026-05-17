import { prisma } from "@/lib/prisma";
import { getCompanySettings } from "@/lib/company-settings";
import { getPortalSessionFast } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import NuevoOCForm from "./NuevoOCForm";

export default async function NuevaOrdenCompraPage() {
  const session = await getPortalSessionFast();
  if (!session) redirect("/login");
  if (session.rol === "USUARIO") redirect("/ordenes-compra");

  const [suppliers, products, config] = await Promise.all([
    prisma.supplier.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, rut: true },
      orderBy: { nombre: "asc" },
    }),
    prisma.product.findMany({
      where: { activo: true },
      select: { id: true, nombre: true, precio_unitario: true },
      orderBy: { nombre: "asc" },
    }),
    getCompanySettings(),
  ]);

  const ivaPercent = config ? Number(config.iva_porcentaje) : 19;

  return (
    <NuevoOCForm
      suppliers={suppliers.map((s) => ({ ...s, rut: s.rut ?? null }))}
      products={products.map((p) => ({ ...p, precio_unitario: Number(p.precio_unitario) }))}
      ivaPercent={ivaPercent}
      mode="create"
    />
  );
}
