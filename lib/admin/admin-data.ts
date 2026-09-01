import type { RatingRow, SongRow } from "../supabase/database.types";
import type { Rating } from "../../types/song";

export type AdminRatingItem = {
  id: string;
  songId: string;
  title: string;
  artist: string;
  coverPath: string | null;
  rating: Rating;
  ratedAt: string;
};

export type AdminRatingFilter = "ALL" | Rating;
export type AdminRatingSort = "NEWEST" | "OLDEST" | "TITLE_ASC" | "TITLE_DESC";

export type AdminStats = {
  total: number;
  evaluated: number;
  remaining: number;
  percentComplete: number;
  like: number;
  neutral: number;
  dislike: number;
};

function isRating(value: string): value is Rating {
  return value === "LIKE" || value === "NEUTRAL" || value === "DISLIKE";
}

function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("pt-BR")
    .trim();
}

export function joinRatingsWithSongs(
  songs: SongRow[],
  ratings: RatingRow[],
): AdminRatingItem[] {
  const songsById = new Map(songs.map((song) => [song.id, song]));
  const ratingBySongId = new Map<string, RatingRow>();

  for (const rating of ratings) {
    if (!isRating(rating.rating) || !songsById.has(rating.song_id)) continue;

    const current = ratingBySongId.get(rating.song_id);
    if (!current || rating.created_at > current.created_at) {
      ratingBySongId.set(rating.song_id, rating);
    }
  }

  return Array.from(ratingBySongId.values()).map((rating) => {
    const song = songsById.get(rating.song_id)!;

    return {
      id: rating.id,
      songId: song.id,
      title: song.title,
      artist: song.artist ?? "Artista desconhecido",
      coverPath: song.cover_path,
      rating: rating.rating as Rating,
      ratedAt: rating.created_at,
    };
  });
}

export function calculateAdminStats(totalSongs: number, items: AdminRatingItem[]): AdminStats {
  const counts = { LIKE: 0, NEUTRAL: 0, DISLIKE: 0 } satisfies Record<Rating, number>;

  for (const item of items) counts[item.rating] += 1;

  const evaluated = items.length;

  return {
    total: totalSongs,
    evaluated,
    remaining: Math.max(0, totalSongs - evaluated),
    percentComplete: totalSongs === 0 ? 0 : Math.round((evaluated / totalSongs) * 1_000) / 10,
    like: counts.LIKE,
    neutral: counts.NEUTRAL,
    dislike: counts.DISLIKE,
  };
}

export function filterAdminRatings(
  items: AdminRatingItem[],
  filter: AdminRatingFilter,
  query: string,
) {
  const normalizedQuery = normalizeSearch(query);

  return items.filter((item) => {
    if (filter !== "ALL" && item.rating !== filter) return false;
    if (!normalizedQuery) return true;

    return (
      normalizeSearch(item.title).includes(normalizedQuery) ||
      normalizeSearch(item.artist).includes(normalizedQuery)
    );
  });
}

export function sortAdminRatings(items: AdminRatingItem[], sort: AdminRatingSort) {
  return [...items].sort((left, right) => {
    if (sort === "NEWEST") return right.ratedAt.localeCompare(left.ratedAt);
    if (sort === "OLDEST") return left.ratedAt.localeCompare(right.ratedAt);

    const comparison = left.title.localeCompare(right.title, "pt-BR", {
      sensitivity: "base",
    });
    return sort === "TITLE_ASC" ? comparison : -comparison;
  });
}

export function paginateAdminRatings(
  items: AdminRatingItem[],
  page: number,
  pageSize: number,
) {
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const currentPage = Math.min(Math.max(1, page), totalPages);

  return {
    currentPage,
    totalPages,
    items: items.slice((currentPage - 1) * pageSize, currentPage * pageSize),
  };
}

const BRAZIL_DATE_TIME = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatRatingDate(value: string) {
  return BRAZIL_DATE_TIME.format(new Date(value)).replace(",", "");
}
