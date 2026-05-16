import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Eye } from "lucide-react";

const rolColors: Record<string, string> = {
  ADMINISTRADOR: "bg-purple-100 text-purple-700",
  SUPERVISOR: "bg-blue-100 text-blue-700",
  USUARIO: "bg-gray-100 text-gray-700",
};

export default async function UsuariosPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.rol !== "ADMINISTRADOR") redirect("/dashboard");

  const users = await prisma.profile.findMany({
    orderBy: { created_at: "asc" },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#253158]">Usuarios</h1>
          <p className="text-gray-500 text-sm mt-1">{users.length} registros</p>
        </div>
        <Link href="/usuarios/nuevo">
          <Button className="bg-[#253158] hover:bg-[#1e305e] text-white gap-2">
            <Plus className="h-4 w-4" />
            Invitar Usuario
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Desde</TableHead>
              <TableHead className="w-16" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">{u.nombre}</TableCell>
                <TableCell className="text-gray-500 text-sm">{u.email}</TableCell>
                <TableCell>
                  <Badge className={`${rolColors[u.rol]} hover:${rolColors[u.rol]}`}>
                    {u.rol}
                  </Badge>
                </TableCell>
                <TableCell>
                  {u.activo ? (
                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100">Activo</Badge>
                  ) : (
                    <Badge className="bg-red-100 text-red-600 hover:bg-red-100">Inactivo</Badge>
                  )}
                </TableCell>
                <TableCell className="text-gray-500 text-sm">
                  {new Date(u.created_at).toLocaleDateString("es-CL")}
                </TableCell>
                <TableCell>
                  <Link href={`/usuarios/${u.id}`}>
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </Link>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
