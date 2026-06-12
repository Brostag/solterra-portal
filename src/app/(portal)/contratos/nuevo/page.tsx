import { getCompanyClientsForSelector } from "@/lib/cache/master-lists";
import { prisma } from "@/lib/prisma";
import { getPortalSessionFast } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import NuevoContratoForm from "./NuevoContratoForm";

export default async function NuevoContratoPage() {
  const session = await getPortalSessionFast();
  if (!session) redirect("/login");
  if (session.rol === "USUARIO") redirect("/contratos");

  const [empresas, cotizacionesRaw] = await Promise.all([
    getCompanyClientsForSelector(),
    // Cotizaciones del sistema para ligar el contrato (campo N° de cotización).
    // Solo no anuladas, las 100 más recientes, payload mínimo para el selector.
    prisma.quotation.findMany({
      where: { estado: { not: "ANULADA" } },
      orderBy: { created_at: "desc" },
      take: 100,
      select: {
        id: true, numero: true, cliente_nombre_snapshot: true, fecha_emision: true,
      },
    }),
  ]);
  // Empresas con rol cliente/arrendataria, adaptadas a la forma del selector.
  const clients = empresas.map((e) => ({
    id: e.id,
    nombre: e.nombre_razon_social,
    rut: e.rut,
  }));
  const cotizaciones = cotizacionesRaw.map((q) => ({
    id: q.id,
    numero: q.numero,
    cliente: q.cliente_nombre_snapshot,
    fecha: new Date(q.fecha_emision).toLocaleDateString("es-CL"),
  }));

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/contratos">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#253158]">Nuevo Contrato Marco</h1>
          <p className="text-gray-500 text-sm mt-0.5">Arriendo de maquinaria — el contrato se crea en estado Borrador.</p>
        </div>
      </div>
      <NuevoContratoForm clients={clients} cotizaciones={cotizaciones} />
    </div>
  );
}
