import { getPortalSessionFast } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import NuevaEmpresaForm from "./NuevaEmpresaForm";

export default async function NuevaEmpresaPage() {
  const session = await getPortalSessionFast();
  if (!session) redirect("/login");
  if (session.rol === "USUARIO") redirect("/empresas");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-[#253158]">Nueva Empresa</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Solo Datos generales y Roles son obligatorios — el resto puedes completarlo después.
          </p>
        </div>
        <Link href="/empresas" className="flex-shrink-0">
          <Button variant="ghost" size="sm" className="gap-1.5 text-gray-500 hover:text-[#253158]">
            <X className="h-4 w-4" />
            Cancelar
          </Button>
        </Link>
      </div>
      <NuevaEmpresaForm />
    </div>
  );
}
