import { getPortalSessionFast } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SelectField } from "@/components/portal/SelectField";
import { ArrowLeft } from "lucide-react";
import { inviteUser } from "../actions";
import { SubmitButton } from "@/components/portal/SubmitButton";

const ROL_OPTIONS = [
  { value: "USUARIO", label: "Usuario" },
  { value: "SUPERVISOR", label: "Supervisor" },
  { value: "ADMINISTRADOR", label: "Administrador" },
];

export default async function NuevoUsuarioPage() {
  const session = await getPortalSessionFast();
  if (!session) redirect("/login");
  if (session.rol !== "ADMINISTRADOR") redirect("/usuarios");

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/usuarios">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <h1 className="text-2xl font-bold text-[#253158]">Invitar Usuario</h1>
      </div>

      <div className="bg-white rounded-lg border p-6">
        <form action={inviteUser} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre completo <span className="text-[#c6352e]">*</span></Label>
            <Input id="nombre" name="nombre" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email <span className="text-[#c6352e]">*</span></Label>
            <Input id="email" name="email" type="email" required />
          </div>
          <div className="space-y-2">
            <Label>Rol <span className="text-[#c6352e]">*</span></Label>
            <SelectField
              name="rol"
              defaultValue="USUARIO"
              options={ROL_OPTIONS}
            />
          </div>
          <p className="text-sm text-gray-500">
            Se enviará un correo de invitación para que el usuario establezca su contraseña.
          </p>
          <div className="flex gap-3 pt-2">
            <SubmitButton label="Enviar invitación" loadingLabel="Enviando..." />
            <Link href="/usuarios">
              <Button type="button" variant="outline">Cancelar</Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
}

