import { getSupabaseClient } from "@/lib/supabase/client";
import type { RatingRow } from "@/lib/supabase/database.types";
import type { Rating } from "@/types/song";

export async function listRatings(): Promise<RatingRow[]> {
  const { data, error } = await getSupabaseClient()
    .from("ratings")
    .select("*")
    .order("created_at", { ascending: true });

  if (error) throw new Error(`Não foi possível listar as avaliações: ${error.message}`);
  return data;
}

export async function saveRating(songId: string, rating: Rating): Promise<RatingRow> {
  const { data, error } = await getSupabaseClient()
    .from("ratings")
    .insert({ song_id: songId, rating })
    .select()
    .single();

  if (error) throw new Error(`Não foi possível salvar a avaliação: ${error.message}`);
  return data;
}

export async function undoLastRating(): Promise<RatingRow | null> {
  const client = getSupabaseClient();
  const { data: latestRating, error: findError } = await client
    .from("ratings")
    .select("*")
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

  return latestRating;
}

export async function getRatingCounts(): Promise<Record<Rating, number>> {
  const ratings = await listRatings();
  const counts: Record<Rating, number> = { LIKE: 0, NEUTRAL: 0, DISLIKE: 0 };

  for (const item of ratings) {
    if (item.rating === "LIKE" || item.rating === "NEUTRAL" || item.rating === "DISLIKE") {
      counts[item.rating] += 1;
    }
  }

  return counts;
}
