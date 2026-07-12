import "server-only";

import { createSupabaseAdmin } from "@/lib/supabase-admin";

const allowedTypes = ["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"];
const maxFileSize = 8 * 1024 * 1024;

export async function uploadOptionalFile(file: File | null, bucket: string, prefix: string) {
  if (!file || file.size === 0) {
    return null;
  }

  if (!allowedTypes.includes(file.type)) {
    throw new Error("Tipo de archivo no permitido. Usa imagen, GIF o PDF.");
  }

  if (file.size > maxFileSize) {
    throw new Error("Archivo demasiado grande. Usa un archivo de maximo 8 MB.");
  }

  const extension = file.name.split(".").pop()?.toLowerCase() || "bin";
  const safeName = `${prefix}/${Date.now()}-${crypto.randomUUID()}.${extension}`;
  const supabase = createSupabaseAdmin();

  const { error } = await supabase.storage.from(bucket).upload(safeName, file, {
    contentType: file.type,
    upsert: false
  });

  if (error) {
    throw error;
  }

  if (bucket === "evidence") {
    return `/storage/${bucket}/${safeName}`;
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(safeName);
  return data.publicUrl;
}
