import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/database.types";
import { isValidAudioStoragePath } from "@/lib/supabase/media-path";

const SIGNED_URL_TTL_SECONDS = 60 * 60;

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const path = new URL(request.url).searchParams.get("path");

  if (!isValidAudioStoragePath(path)) {
    return Response.json({ error: "Caminho de áudio inválido." }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    return Response.json({ error: "Storage não configurado." }, { status: 503 });
  }

  const supabase = createClient<Database>(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data, error } = await supabase.storage
    .from("music")
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error) {
    if (error.name === "StorageUnknownError") {
      return Response.json(
        { error: "Não foi possível acessar o serviço de áudio." },
        { status: 502 },
      );
    }

    return Response.json({ error: "Áudio não encontrado." }, { status: 404 });
  }

  return Response.redirect(data.signedUrl, 307);
}
