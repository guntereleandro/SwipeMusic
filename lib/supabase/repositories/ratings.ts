import { getSupabaseClient } from "../client";
import type { RatingRow } from "../database.types";
import type { Rating } from "../../../types/song";
import { listAllPages } from "./pagination";

function withoutJoinedSong(row: RatingRow & { songs: { library_id: string } }) {
  return { id: row.id, song_id: row.song_id, rating: row.rating, created_at: row.created_at };
}

export async function listRatings(libraryId: string): Promise<RatingRow[]> {
  if (!libraryId) throw new Error("libraryId é obrigatório para listar avaliações.");
  const client = getSupabaseClient();

  return listAllPages(async (from, to) => {
    const { data, error } = await client
      .from("ratings")
      .select("id, song_id, rating, created_at, songs!inner(library_id)")
      .eq("songs.library_id", libraryId)
      .order("created_at", { ascending: true })
      .order("id", { ascending: true })
      .range(from, to);

    if (error) throw new Error(`Não foi possível listar as avaliações: ${error.message}`);
    return data.map(withoutJoinedSong);
  });
}

export async function saveRating(songId: string, rating: Rating, libraryId: string): Promise<RatingRow> {
  const client = getSupabaseClient();
  const { data: song, error: songError } = await client.from("songs").select("id")
    .eq("id", songId).eq("library_id", libraryId).maybeSingle();
  if (songError) throw new Error(`Não foi possível validar a música: ${songError.message}`);
  if (!song) throw new Error("A música não pertence a esta biblioteca.");
  const { data, error } = await client
    .from("ratings")
    .insert({ song_id: songId, rating })
    .select()
    .single();

  if (error) throw new Error(`Não foi possível salvar a avaliação: ${error.message}`);
  return data;
}

export async function undoLastRating(libraryId: string): Promise<RatingRow | null> {
  const client = getSupabaseClient();
  const { data: latestRating, error: findError } = await client
    .from("ratings")
    .select("id, song_id, rating, created_at, songs!inner(library_id)")
    .eq("songs.library_id", libraryId)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (findError) {
    throw new Error(`Não foi possível localizar a última avaliação: ${findError.message}`);
  }
  if (!latestRating) return null;

  const { error: deleteError } = await client
    .from("ratings")
    .delete()
    .eq("id", latestRating.id);

  if (deleteError) {
    throw new Error(`Não foi possível desfazer a avaliação: ${deleteError.message}`);
  }

  return withoutJoinedSong(latestRating);
}

export async function getRatingCounts(libraryId: string): Promise<Record<Rating, number>> {
  const ratings = await listRatings(libraryId);
  const counts: Record<Rating, number> = { LIKE: 0, NEUTRAL: 0, DISLIKE: 0 };

  for (const item of ratings) {
    if (item.rating === "LIKE" || item.rating === "NEUTRAL" || item.rating === "DISLIKE") {
      counts[item.rating] += 1;
    }
  }

  return counts;
}
