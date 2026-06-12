import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/session";
import { uploadFile } from "@/lib/supabase/storage";
import { prisma } from "@/lib/prisma";
import { fileContentMatchesMime } from "@/lib/file-validation";
import { randomUUID } from "crypto";

const MAX_SIZE = 20 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);

const TIPOS_VALIDOS = new Set([
  "CONTRATO",
  "COTIZACION",
  "FACTURA_PROVEEDOR",
  "GUIA_DESPACHO",
  "ORDEN_COMPRA",
  "CERTIFICADO",
  "OTRO",
]);

export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  if (session.rol === "USUARIO")
    return NextResponse.json({ error: "Sin permisos para subir documentos" }, { status: 403 });

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const tipo_documento = (formData.get("tipo_documento") as string | null)?.trim();
  const invoice_id = (formData.get("invoice_id") as string | null) || null;
  const purchase_order_id = (formData.get("purchase_order_id") as string | null) || null;
  const client_id = (formData.get("client_id") as string | null) || null;
  const supplier_id = (formData.get("supplier_id") as string | null) || null;

  if (!file) return NextResponse.json({ error: "No se recibió archivo" }, { status: 400 });
  if (!tipo_documento || !TIPOS_VALIDOS.has(tipo_documento))
    return NextResponse.json({ error: "Tipo de documento inválido" }, { status: 400 });
  if (file.size > MAX_SIZE)
    return NextResponse.json({ error: "El archivo supera el límite de 20 MB" }, { status: 413 });
  if (!ALLOWED_MIME_TYPES.has(file.type))
    return NextResponse.json(
      { error: `Tipo de archivo no permitido: ${file.type}` },
      { status: 415 },
    );

  const associations = [invoice_id, purchase_order_id, client_id, supplier_id].filter(Boolean);
  if (associations.length > 1)
    return NextResponse.json({ error: "Solo se puede asociar a una entidad" }, { status: 400 });

  const ext = file.name.split(".").pop()?.replace(/[^a-zA-Z0-9]/g, "") ?? "bin";
  const storage_path = `${randomUUID()}.${ext}`;

  const buffer = Buffer.from(await file.arrayBuffer());

  // El MIME del navegador es declarativo: verificar el contenido real.
  if (!fileContentMatchesMime(file.type, buffer)) {
    return NextResponse.json(
      { error: "El contenido del archivo no corresponde al tipo declarado" },
      { status: 415 },
    );
  }

  try {
    await uploadFile(storage_path, buffer, file.type);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Error al subir archivo" },
      { status: 500 },
    );
  }

  try {
    const doc = await prisma.document.create({
      data: {
        nombre_archivo: file.name,
        nombre_original: file.name,
        tipo_documento,
        storage_path,
        tamaño: file.size,
        mime_type: file.type,
        invoice_id,
        purchase_order_id,
        client_id,
        supplier_id,
        uploaded_by: session.id,
      },
    });
    return NextResponse.json({ id: doc.id });
  } catch {
    // Si falla la DB, limpiar Storage
    const { createAdminClient } = await import("@/lib/supabase/admin");
    await createAdminClient().storage.from("documentos").remove([storage_path]);
    return NextResponse.json({ error: "Error al guardar el documento" }, { status: 500 });
  }
}
