import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import {
  Table, TableBody, TableCell, TableHead,
  TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

const moduloColors: Record<string, string> = {
  facturas: "bg-blue-100 text-blue-700",
  clientes: "bg-purple-100 text-purple-700",
  productos: "bg-orange-100 text-orange-700",
  usuarios: "bg-green-100 text-green-700",
  configuracion: "bg-gray-100 text-gray-700",
};

export default async function AuditoriaPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.rol !== "ADMINISTRADOR") redirect("/dashboard");

  const logs = await prisma.auditLog.findMany({
    orderBy: { created_at: "desc" },
    take: 200,
    include: { user: { select: { nombre: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[#253158]">Auditoría</h1>
        <p className="text-gray-500 text-sm mt-1">Últimas {logs.length} acciones del sistema</p>
      </div>

      <div className="bg-white rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha</TableHead>
              <TableHead>Usuario</TableHead>
              <TableHead>Módulo</TableHead>
              <TableHead>Acción</TableHead>
              <TableHead>Detalle</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-gray-400 py-8">
                  Sin registros de auditoría
                </TableCell>
              </TableRow>
            ) : (
              logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-gray-500 text-sm whitespace-nowrap">
                    {new Date(log.created_at).toLocaleString("es-CL")}
                  </TableCell>
                  <TableCell className="font-medium text-sm">{log.user.nombre}</TableCell>
                  <TableCell>
                    <Badge className={`${moduloColors[log.modulo] ?? "bg-gray-100 text-gray-600"} hover:opacity-100`}>
                      {log.modulo}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-gray-700">{log.accion}</TableCell>
                  <TableCell className="text-sm text-gray-500">{log.detalle ?? "—"}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

