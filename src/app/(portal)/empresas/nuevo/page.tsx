import { getPortalSessionFast } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import NuevaEmpresaForm from "./NuevaEmpresaForm";

export default async function NuevaEmpresaPage() {
  const session = await getPortalSessionFast();
  if (!session) redirect("/login");
  if (session.rol === "USUARIO") redirect("/empresas");

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/empresas">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#253158]">Nueva Empresa</h1>
          <p className="text-gray-500 text-sm mt-0.5">
            Cliente, proveedor, arrendataria u otro — una empresa puede tener varios roles.
          </p>
        </div>
      </div>
      <NuevaEmpresaForm />
    </div>
  );
}
