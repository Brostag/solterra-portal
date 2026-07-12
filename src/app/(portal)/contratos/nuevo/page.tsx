import { getCompanyClientsForSelector } from "@/lib/cache/master-lists";
import { prisma } from "@/lib/prisma";
import { getPortalSessionFast } from "@/lib/auth/session";
import { getEquiposFlotaSelector } from "@/lib/terreno/queries";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import NuevoContratoForm from "./NuevoContratoForm";

export default async function NuevoContratoPage() {
  const session = await getPortalSessionFast();
  if (!session) redirect("/login");
  if (session.rol === "USUARIO") redirect("/contratos");

  const [empresas, cotizacionesRaw, flota] = await Promise.all([
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
    // Flota operativa (equipos "Activo") para prellenar cada equipo del contrato.
    // Se refresca al tiro cuando Mantención cambia un equipo (MANT_EQUIPOS_TAG).
    getEquiposFlotaSelector(),
  ]);
  // Empresas con rol cliente/arrendataria, adaptadas a la forma del selector.
  const clients = empresas.map((e) => ({
    id: e.id,
    nombre: e.nombre_razon_social,
    rut: e.rut,
    // Datos del representante guardados en la empresa: prellenan el bloque
    // "Representante del cliente" del formulario (editables).
    representante_legal: e.representante_legal,
    rut_representante: e.rut_representante,
  }));
  const cotizaciones = cotizacionesRaw.map((q) => ({
    id: q.id,
    numero: q.numero,
    cliente: q.cliente_nombre_snapshot,
    fecha: new Date(q.fecha_emision).toLocaleDateString("es-CL"),
  }));

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#253158]">Nuevo Contrato Marco</h1>
          <p className="text-gray-500 text-sm mt-0.5">Solo Cliente, Fecha de inicio y los equipos son obligatorios — se crea en estado Borrador.</p>
        </div>
        <Link href="/contratos" className="flex-shrink-0">
          <Button variant="ghost" size="sm" className="gap-1.5 text-gray-500 hover:text-[#253158]">
            <X className="h-4 w-4" />
            Cancelar
          </Button>
        </Link>
      </div>
      <NuevoContratoForm clients={clients} cotizaciones={cotizaciones} flota={flota} />
    </div>
  );
}
