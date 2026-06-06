import { getActiveClientsForSelector } from "@/lib/cache/master-lists";
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

  const clients = await getActiveClientsForSelector();

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/contratos">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#253158]">Nuevo Contrato</h1>
          <p className="text-gray-500 text-sm mt-0.5">Arriendo de maquinaria — el contrato se crea en estado Borrador.</p>
        </div>
      </div>
      <NuevoContratoForm clients={clients} />
    </div>
  );
}
