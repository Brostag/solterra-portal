import { prisma } from "@/lib/prisma";
import { getPortalSessionFast } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil } from "lucide-react";

interface Props {
  params: Promise<{ id: string }>;
}

function dash(v: string | null): string {
  return v && v.trim() !== "" ? v : "—";
}

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs text-gray-400 uppercase tracking-wide">{label}</dt>
      <dd className="text-gray-800 break-words">{dash(value)}</dd>
    </div>
  );
}

export default async function EmpresaDetallePage({ params }: Props) {
  const { id } = await params;
  const [session, empresa] = await Promise.all([
    getPortalSessionFast(),
    prisma.company.findUnique({ where: { id } }),
  ]);
  if (!session) redirect("/login");
  if (!empresa) notFound();

  const roles: string[] = [];
  if (empresa.es_cliente) roles.push("Cliente");
  if (empresa.es_proveedor) roles.push("Proveedor");
  if (empresa.es_arrendataria) roles.push("Arrendataria");
  if (empresa.es_otro) roles.push("Otro");

  return (
    <div className="max-w-5xl space-y-6">
      {/* Encabezado */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/empresas">
            <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl font-bold text-[#253158]">{empresa.nombre_razon_social}</h1>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${empresa.activo ? "bg-green-50 text-green-600 border border-green-200" : "bg-gray-100 text-gray-500 border border-gray-200"}`}>
                {empresa.activo ? "Activa" : "Inactiva"}
              </span>
            </div>
            <div className="flex flex-wrap gap-1 mt-1.5">
              {roles.length === 0 ? (
                <span className="text-xs text-gray-400">Sin roles</span>
              ) : (
                roles.map((r) => (
                  <span key={r} className="text-[11px] font-medium px-2 py-0.5 rounded bg-[#253158]/10 text-[#253158]">{r}</span>
                ))
              )}
            </div>
          </div>
        </div>
        {session.rol !== "USUARIO" && (
          <Link href={`/empresas/${empresa.id}/editar`} className="shrink-0 self-center">
            <Button className="bg-[#253158] hover:bg-[#1e305e] text-white gap-2">
              <Pencil className="h-4 w-4" />
              Editar empresa
            </Button>
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Datos generales */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h2 className="font-semibold text-[#253158]">Datos generales</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <Row label="RUT" value={empresa.rut} />
            <Row label="Giro" value={empresa.giro} />
            <Row label="Email" value={empresa.email} />
            <Row label="Teléfono" value={empresa.telefono} />
            <div className="sm:col-span-2"><Row label="Dirección" value={empresa.direccion} /></div>
            <Row label="Comuna" value={empresa.comuna} />
            <Row label="Ciudad" value={empresa.ciudad} />
            <Row label="Región" value={empresa.region} />
            <Row label="País" value={empresa.pais} />
          </dl>
        </div>

        {/* Representante legal */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h2 className="font-semibold text-[#253158]">Representante legal</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <Row label="Nombre" value={empresa.representante_legal} />
            <Row label="Cédula" value={empresa.rut_representante} />
            <Row label="Cargo" value={empresa.cargo_representante} />
            <Row label="Email" value={empresa.email_representante} />
            <Row label="Teléfono" value={empresa.telefono_representante} />
          </dl>
        </div>

        {/* Contacto comercial */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
          <h2 className="font-semibold text-[#253158]">Contacto comercial</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            <Row label="Nombre" value={empresa.contacto_nombre} />
            <Row label="Cargo" value={empresa.contacto_cargo} />
            <Row label="Email" value={empresa.contacto_email} />
            <Row label="Teléfono" value={empresa.contacto_telefono} />
          </dl>
        </div>

        {/* Datos comerciales + bancarios */}
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="space-y-3">
            <h2 className="font-semibold text-[#253158]">Datos comerciales</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <Row label="Condición de pago" value={empresa.condicion_pago} />
              <Row label="Correo notificaciones" value={empresa.correo_notificaciones} />
            </dl>
          </div>
          <div className="space-y-3 pt-3 border-t border-gray-100">
            <h2 className="font-semibold text-[#253158]">Datos bancarios</h2>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2 text-sm">
              <Row label="Banco" value={empresa.banco} />
              <Row label="Tipo de cuenta" value={empresa.tipo_cuenta} />
              <Row label="N° de cuenta" value={empresa.numero_cuenta} />
              <Row label="Titular" value={empresa.titular_cuenta} />
              <Row label="RUT titular" value={empresa.rut_titular_cuenta} />
            </dl>
          </div>
        </div>
      </div>

      {empresa.observaciones && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="font-semibold text-[#253158] mb-1">Observaciones</h2>
          <p className="text-sm text-gray-700 whitespace-pre-wrap">{empresa.observaciones}</p>
        </div>
      )}

      <div className="flex justify-start">
        <Link href="/empresas">
          <Button className="bg-white border border-gray-300 text-[#253158] hover:bg-gray-50 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Volver a Empresas
          </Button>
        </Link>
      </div>
    </div>
  );
}
