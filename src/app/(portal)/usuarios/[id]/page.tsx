import { prisma } from "@/lib/prisma";
import { getPortalSessionFast } from "@/lib/auth/session";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { SelectField } from "@/components/portal/SelectField";
import { ArrowLeft } from "lucide-react";
import { updateUser } from "../actions";
import UsuarioActions from "./UsuarioActions";
import { deactivateUser } from "../actions";

const ROL_OPTIONS = [
  { value: "USUARIO", label: "Usuario" },
  { value: "SUPERVISOR", label: "Supervisor" },
  { value: "ADMINISTRADOR", label: "Administrador" },
];

const rolColors: Record<string, string> = {
  ADMINISTRADOR: "bg-purple-100 text-purple-700",
  SUPERVISOR: "bg-blue-100 text-blue-700",
  USUARIO: "bg-gray-100 text-gray-700",
};

interface Props {
  params: Promise<{ id: string }>;
}

export default async function UsuarioDetailPage({ params }: Props) {
  const { id } = await params;
  const session = await getPortalSessionFast();
  if (!session) redirect("/login");
  if (session.rol !== "ADMINISTRADOR") redirect("/dashboard");

  const user = await prisma.profile.findUnique({ where: { id } });
  if (!user) notFound();

  const updateWithId = updateUser.bind(null, id);

  return (
    <div className="max-w-lg space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/usuarios">
          <Button variant="ghost" size="sm"><ArrowLeft className="h-4 w-4" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-[#253158]">{user.nombre}</h1>
          <p className="text-gray-500 text-sm">{user.email}</p>
        </div>
        <Badge className={`${rolColors[user.rol]} hover:${rolColors[user.rol]}`}>{user.rol}</Badge>
        {!user.activo && (
          <Badge className="bg-red-100 text-red-600 hover:bg-red-100">Inactivo</Badge>
        )}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6">
        <form action={updateWithId} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="nombre">Nombre completo</Label>
            <Input id="nombre" name="nombre" defaultValue={user.nombre} required />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input value={user.email} disabled className="bg-gray-50" />
            <p className="text-xs text-gray-400">El email no puede modificarse</p>
          </div>
          <div className="space-y-2">
            <Label>Rol</Label>
            <SelectField
              name="rol"
              defaultValue={user.rol}
              options={ROL_OPTIONS}
            />
          </div>
          <Button type="submit" className="bg-[#253158] hover:bg-[#1e305e] text-white">
            Guardar cambios
          </Button>
        </form>
      </div>

      {user.activo && user.id !== session.id && (
        <UsuarioActions userId={id} userName={user.nombre} deactivate={deactivateUser} />
      )}
    </div>
  );
}
