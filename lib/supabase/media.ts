import { getSupabaseClient } from "@/lib/supabase/client";

function isReadyUrl(path: string) {
  return path.startsWith("/") || /^https?:\/\//i.test(path);
}

export function getAudioUrl(path: string) {
  if (isReadyUrl(path)) return path;
  return `/api/media/audio?path=${encodeURIComponent(path)}`;
}

export function getCoverUrl(path: string | null) {
  if (!path) return "/covers/default.svg";
  if (isReadyUrl(path)) return path;

  return getSupabaseClient().storage.from("covers").getPublicUrl(path).data.publicUrl;
}
