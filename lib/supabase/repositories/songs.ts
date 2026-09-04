import { getSupabaseClient } from "../client";
import type { SongRow } from "../database.types";
import { listRatings } from "./ratings";
import { listAllPages } from "./pagination";
import { filterPendingSongs } from "../../music/library";

export async function listSongs(libraryId: string): Promise<SongRow[]> {
  if (!libraryId) throw new Error("libraryId é obrigatório para listar músicas.");
  const client = getSupabaseClient();

  return listAllPages(async (from, to) => {
    const { data, error } = await client
      .from("songs")
      .select("*")
      .eq("library_id", libraryId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to);

    if (error) throw new Error(`Não foi possível listar as músicas: ${error.message}`);
    return data;
  });
}

export async function listPendingSongs(libraryId: string): Promise<SongRow[]> {
  const [songs, ratings] = await Promise.all([listSongs(libraryId), listRatings(libraryId)]);
  return filterPendingSongs(songs, ratings);
}

export async function getSongById(songId: string, libraryId: string): Promise<SongRow | null> {
  const { data, error } = await getSupabaseClient()
    .from("songs")
    .select("*")
    .eq("id", songId)
    .eq("library_id", libraryId)
    .maybeSingle();

  if (error) throw new Error(`Não foi possível carregar a música: ${error.message}`);
  return data;
}
