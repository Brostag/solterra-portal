import { prisma } from "@/lib/prisma";
import { getPortalSessionFast } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import EditarEmpresaForm, { type EmpresaInitial } from "./EditarEmpresaForm";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function EditarEmpresaPage({ params }: Props) {
  const { id } = await params;
  const [session, empresa] = await Promise.all([
    getPortalSessionFast(),
    prisma.company.findUnique({ where: { id } }),
  ]);
  if (!session) redirect("/login");
  if (session.rol === "USUARIO") redirect(`/empresas/${id}`);
  if (!empresa) notFound();

  const initial: EmpresaInitial = {
    id: empresa.id,
    nombre_razon_social: empresa.nombre_razon_social,
    rut: empresa.rut ?? "",
    giro: empresa.giro ?? "",
    email: empresa.email ?? "",
    telefono: empresa.telefono ?? "",
    direccion: empresa.direccion ?? "",
    comuna: empresa.comuna ?? "",
    ciudad: empresa.ciudad ?? "",
    region: empresa.region ?? "",
    pais: empresa.pais ?? "Chile",
    observaciones: empresa.observaciones ?? "",
    activo: empresa.activo,
    es_cliente: empresa.es_cliente,
    es_proveedor: empresa.es_proveedor,
    es_arrendataria: empresa.es_arrendataria,
    es_otro: empresa.es_otro,
    representante_legal: empresa.representante_legal ?? "",
    rut_representante: empresa.rut_representante ?? "",
    cargo_representante: empresa.cargo_representante ?? "",
    email_representante: empresa.email_representante ?? "",
    telefono_representante: empresa.telefono_representante ?? "",
    contacto_nombre: empresa.contacto_nombre ?? "",
    contacto_cargo: empresa.contacto_cargo ?? "",
    contacto_email: empresa.contacto_email ?? "",
    contacto_telefono: empresa.contacto_telefono ?? "",
    condicion_pago: empresa.condicion_pago ?? "",
    correo_notificaciones: empresa.correo_notificaciones ?? "",
    banco: empresa.banco ?? "",
    tipo_cuenta: empresa.tipo_cuenta ?? "",
    numero_cuenta: empresa.numero_cuenta ?? "",
    titular_cuenta: empresa.titular_cuenta ?? "",
    rut_titular_cuenta: empresa.rut_titular_cuenta ?? "",
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/empresas/${id}`}>
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#253158]">Editar empresa</h1>
          <p className="text-gray-500 text-sm mt-0.5">{empresa.nombre_razon_social}</p>
        </div>
      </div>
      <EditarEmpresaForm initial={initial} />
    </div>
  );
}
