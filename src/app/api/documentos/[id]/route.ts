import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { deleteFile, getSignedUrl } from "@/lib/supabase/storage";
import { prisma } from "@/lib/prisma";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const doc = await prisma.document.findUnique({
    where: { id },
    select: { storage_path: true, uploaded_by: true },
  });
  if (!doc) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });

  // USUARIO solo puede descargar documentos propios
  if (session.rol === "USUARIO" && doc.uploaded_by !== session.id) {
    return NextResponse.json({ error: "Sin permisos" }, { status: 403 });
  }

  try {
    const url = await getSignedUrl(doc.storage_path);
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: "Error al generar enlace de descarga" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.rol === "USUARIO")
    return NextResponse.json({ error: "Sin permisos para eliminar documentos" }, { status: 403 });

  const { id } = await params;
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) return NextResponse.json({ error: "Documento no encontrado" }, { status: 404 });

  if (session.rol === "SUPERVISOR" && doc.uploaded_by !== session.id)
    return NextResponse.json({ error: "Solo puedes eliminar documentos propios" }, { status: 403 });

  try {
    await deleteFile(doc.storage_path);
  } catch {
    // Si falla Storage, continuar borrando el registro
  }

  await prisma.document.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
