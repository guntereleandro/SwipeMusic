import { getSupabaseClient } from "@/lib/supabase/client";
import type { SongRow } from "@/lib/supabase/database.types";
import { listRatings } from "@/lib/supabase/repositories/ratings";

export async function listSongs(): Promise<SongRow[]> {
  const { data, error } = await getSupabaseClient()
    .from("songs")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Não foi possível listar as músicas: ${error.message}`);
  return data;
}

export async function listPendingSongs(): Promise<SongRow[]> {
  const [songs, ratings] = await Promise.all([listSongs(), listRatings()]);
  const ratedSongIds = new Set(ratings.map((rating) => rating.song_id));
  return songs.filter((song) => !ratedSongIds.has(song.id));
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
