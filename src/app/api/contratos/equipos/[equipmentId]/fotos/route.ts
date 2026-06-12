import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { uploadFile, deleteFile } from "@/lib/supabase/storage";
import { prisma } from "@/lib/prisma";
import { fileContentMatchesMime } from "@/lib/file-validation";
import { logAudit } from "@/lib/audit";
import { TipoFotoEquipo } from "@prisma/client";
import { randomUUID } from "crypto";

const MAX_SIZE = 5 * 1024 * 1024; // 5 MB por imagen
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const TIPOS_VALIDOS = new Set<string>([
  "FRONTAL", "LATERAL_DERECHO", "LATERAL_IZQUIERDO", "TRASERA",
  "CABINA", "HOROMETRO", "RODADO", "DANIOS", "OTRO",
]);

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ equipmentId: string }> },
) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.rol !== "ADMINISTRADOR" && session.rol !== "SUPERVISOR")
    return NextResponse.json({ error: "Sin permisos para subir fotos" }, { status: 403 });

  const { equipmentId } = await params;

  // El equipo debe existir y pertenecer a un contrato no anulado.
  const equipo = await prisma.contractEquipment.findUnique({
    where: { id: equipmentId },
    select: {
      id: true,
      descripcion: true,
      contract: { select: { id: true, numero_contrato: true, estado: true } },
    },
  });
  if (!equipo) return NextResponse.json({ error: "El equipo no existe" }, { status: 404 });
  if (equipo.contract.estado === "ANULADO")
    return NextResponse.json({ error: "El contrato está anulado" }, { status: 409 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const tipo = (formData.get("tipo") as string | null)?.trim();
  const observacion = (formData.get("observacion") as string | null)?.trim() || null;

  if (!file) return NextResponse.json({ error: "No se recibió ninguna imagen" }, { status: 400 });
  if (!tipo || !TIPOS_VALIDOS.has(tipo))
    return NextResponse.json({ error: "Tipo de foto inválido" }, { status: 400 });
  if (file.size > MAX_SIZE)
    return NextResponse.json({ error: "La imagen supera el límite de 5 MB" }, { status: 413 });
  if (!ALLOWED_MIME_TYPES.has(file.type))
    return NextResponse.json(
      { error: `Tipo de archivo no permitido: ${file.type}. Solo JPG, PNG o WEBP.` },
      { status: 415 },
    );

  const ext = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") ?? "jpg";
  const storage_path = `contratos/${equipo.contract.id}/equipos/${equipmentId}/${randomUUID()}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  // El MIME del navegador es declarativo: verificar el contenido real.
  if (!fileContentMatchesMime(file.type, buffer)) {
    return NextResponse.json(
      { error: "El contenido del archivo no corresponde a una imagen JPG, PNG o WEBP" },
      { status: 415 },
    );
  }

  try {
    await uploadFile(storage_path, buffer, file.type);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al subir la imagen" },
      { status: 500 },
    );
  }

  try {
    const photo = await prisma.contractEquipmentPhoto.create({
      data: {
        contract_equipment_id: equipmentId,
        tipo: tipo as TipoFotoEquipo,
        storage_path,
        nombre_original: file.name,
        mime_type: file.type,
        tamano: file.size,
        observacion,
        uploaded_by: session.id,
      },
      select: { id: true },
    });

    await logAudit(
      session.id,
      "foto_equipo_subida",
      "contratos",
      `Contrato ${equipo.contract.numero_contrato} | Equipo: ${equipo.descripcion} | Tipo: ${tipo}`,
    );

    return NextResponse.json({ id: photo.id });
  } catch {
    // Si falla la DB, limpiar el archivo recién subido a Storage.
    await deleteFile(storage_path).catch(() => {});
    return NextResponse.json({ error: "Error al guardar la foto" }, { status: 500 });
  }
}
