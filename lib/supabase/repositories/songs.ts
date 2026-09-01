import { getSupabaseClient } from "@/lib/supabase/client";
import type { SongRow } from "@/lib/supabase/database.types";
import { listRatings } from "@/lib/supabase/repositories/ratings";
import { listAllPages } from "@/lib/supabase/repositories/pagination";
import { filterPendingSongs } from "@/lib/music/library";

export async function listSongs(): Promise<SongRow[]> {
  const client = getSupabaseClient();

  return listAllPages(async (from, to) => {
    const { data, error } = await client
      .from("songs")
      .select("*")
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to);

    if (error) throw new Error(`Não foi possível listar as músicas: ${error.message}`);
    return data;
  });
}

export async function listPendingSongs(): Promise<SongRow[]> {
  const [songs, ratings] = await Promise.all([listSongs(), listRatings()]);
  return filterPendingSongs(songs, ratings);
}

export async function getSongById(songId: string): Promise<SongRow | null> {
  const { data, error } = await getSupabaseClient()
    .from("songs")
    .select("*")
    .eq("id", songId)
    .maybeSingle();

  if (error) throw new Error(`Não foi possível carregar a música: ${error.message}`);
  return data;
}
