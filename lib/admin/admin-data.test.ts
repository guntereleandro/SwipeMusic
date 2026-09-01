import { describe, expect, it } from "vitest";
import type { RatingRow, SongRow } from "../supabase/database.types";
import {
  calculateAdminStats,
  filterAdminRatings,
  joinRatingsWithSongs,
  paginateAdminRatings,
  sortAdminRatings,
  type AdminRatingItem,
} from "./admin-data";

function song(id: string, title: string, artist: string | null): SongRow {
  return {
    id, title, artist, album: null, audio_path: `${id}.mp3`, cover_path: null,
    created_at: "2026-08-31T10:00:00.000Z", duration_seconds: null, bitrate: null,
    sample_rate: null, metadata_status: null, metadata_review_required: false,
    file_hash: id, original_filename: `${id}.mp3`, source_folder: null,
  };
}

function rating(id: string, songId: string, value: string, createdAt: string): RatingRow {
  return { id, song_id: songId, rating: value, created_at: createdAt };
}

const songs = [song("a", "Águas de Março", "Elis Regina"), song("b", "Bola de Meia", "Milton Nascimento"), song("c", "Céu", null)];
const ratings = [
  rating("r1", "a", "LIKE", "2026-08-31T20:00:00.000Z"),
  rating("r2", "b", "DISLIKE", "2026-08-31T21:00:00.000Z"),
];

describe("dados do admin", () => {
  it("relaciona ratings e songs por song_id", () => {
    expect(joinRatingsWithSongs(songs, ratings).map((item) => item.title)).toEqual([
      "Águas de Março", "Bola de Meia",
    ]);
  });

  it("ignora defensivamente rating sem música e rating inválido", () => {
    const result = joinRatingsWithSongs(songs, [
      ...ratings,
      rating("orphan", "missing", "LIKE", "2026-08-31T22:00:00.000Z"),
      rating("invalid", "c", "OTHER", "2026-08-31T22:00:00.000Z"),
    ]);
    expect(result).toHaveLength(2);
  });

  it("calcula totais, percentual e contagens por avaliação", () => {
    const items = joinRatingsWithSongs(songs, [
      ...ratings,
      rating("r3", "c", "NEUTRAL", "2026-08-31T22:00:00.000Z"),
    ]);
    expect(calculateAdminStats(4, items)).toEqual({
      total: 4, evaluated: 3, remaining: 1, percentComplete: 75,
      like: 1, neutral: 1, dislike: 1,
    });
  });

  it("trata uma biblioteca sem avaliações", () => {
    expect(calculateAdminStats(3, [])).toMatchObject({ evaluated: 0, remaining: 3, percentComplete: 0 });
  });

  it("busca título e artista sem diferenciar caixa ou acentos", () => {
    const items = joinRatingsWithSongs(songs, ratings);
    expect(filterAdminRatings(items, "ALL", "aguas")).toHaveLength(1);
    expect(filterAdminRatings(items, "ALL", "MILTON")).toHaveLength(1);
  });

  it("filtra pelo tipo de avaliação", () => {
    expect(filterAdminRatings(joinRatingsWithSongs(songs, ratings), "LIKE", "")).toHaveLength(1);
  });

  it("ordena por data e título", () => {
    const items = joinRatingsWithSongs(songs, ratings);
    expect(sortAdminRatings(items, "NEWEST")[0].songId).toBe("b");
    expect(sortAdminRatings(items, "OLDEST")[0].songId).toBe("a");
    expect(sortAdminRatings(items, "TITLE_ASC")[0].songId).toBe("a");
    expect(sortAdminRatings(items, "TITLE_DESC")[0].songId).toBe("b");
  });

  it("pagina somente depois dos filtros", () => {
    const items = Array.from({ length: 120 }, (_, index): AdminRatingItem => ({
      id: `r${index}`, songId: `${index}`, title: `Song ${index}`, artist: "Artist",
      coverPath: null, rating: "LIKE", ratedAt: "2026-08-31T20:00:00.000Z",
    }));
    const page = paginateAdminRatings(items, 2, 50);
    expect(page.items).toHaveLength(50);
    expect(page.items[0].songId).toBe("50");
    expect(page.totalPages).toBe(3);
  });
});
