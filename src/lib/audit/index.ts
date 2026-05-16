import { prisma } from "@/lib/prisma";

export async function logAudit(
  userId: string,
  accion: string,
  modulo: string,
  detalle?: string
): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: { user_id: userId, accion, modulo, detalle },
    });
  } catch {
    // La auditoría no debe interrumpir el flujo principal
  }
}
