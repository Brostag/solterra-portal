import { createAdminClient } from "./admin";

const BUCKET = "documentos";

export async function uploadFile(
  path: string,
  file: Buffer,
  contentType: string,
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { contentType, upsert: false });
  if (error) throw new Error(`Error al subir archivo: ${error.message}`);
}

export async function deleteFile(path: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.storage.from(BUCKET).remove([path]);
  if (error) throw new Error(`Error al eliminar archivo: ${error.message}`);
}

export async function getSignedUrl(path: string, expiresIn = 3600): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, expiresIn);
  if (error || !data) throw new Error(`Error al generar URL firmada: ${error?.message}`);
  return data.signedUrl;
}

export async function getSignedUrls(
  paths: string[],
  expiresIn = 3600,
): Promise<Record<string, string>> {
  if (paths.length === 0) return {};
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(paths, expiresIn);
  if (error || !data) throw new Error(`Error al generar URLs firmadas: ${error?.message}`);
  return Object.fromEntries(
    data.map((item) => [item.path, item.signedUrl ?? ""]),
  );
}
