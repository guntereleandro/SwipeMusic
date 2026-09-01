import type { RatingRow } from "@/lib/supabase/database.types";
import type { Song } from "@/types/song";

type IdentifiableSong = {
  id: string;
};

export function filterPendingSongs<SongRow extends IdentifiableSong>(
  songs: SongRow[],
  ratings: Pick<RatingRow, "song_id">[],
): SongRow[] {
  const ratedSongIds = new Set(ratings.map((rating) => rating.song_id));
  return songs.filter((song) => !ratedSongIds.has(song.id));
}

export function getLibraryProgress(songs: Song[]) {
  const evaluated = songs.filter((song) => song.status !== "PENDING").length;

  return {
    total: songs.length,
    evaluated,
    remaining: songs.length - evaluated,
  };
}
