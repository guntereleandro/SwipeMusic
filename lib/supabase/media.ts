import { getSupabaseClient } from "./client";

export const DEFAULT_COVER_URL = "/covers/default.svg";

function isReadyUrl(path: string) {
  return path.startsWith("/") || /^https?:\/\//i.test(path);
}

export function getAudioUrl(path: string) {
  if (isReadyUrl(path)) return path;
  return `/api/media/audio?path=${encodeURIComponent(path)}`;
}

export function getCoverUrl(path: string | null) {
  const normalizedPath = path?.trim();

  if (!normalizedPath) return DEFAULT_COVER_URL;
  if (isReadyUrl(normalizedPath)) return normalizedPath;

  return getSupabaseClient().storage.from("covers").getPublicUrl(normalizedPath).data.publicUrl;
}
