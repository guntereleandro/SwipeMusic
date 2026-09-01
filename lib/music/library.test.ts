import { describe, expect, it } from "vitest";
import { filterPendingSongs, getLibraryProgress } from "./library";
import type { Song } from "../../types/song";

describe("biblioteca musical", () => {
  it("forma a fila com músicas existentes menos as que possuem rating", () => {
    const songs = [{ id: "a" }, { id: "b" }, { id: "c" }];
    const ratings = [{ song_id: "b" }];

    expect(filterPendingSongs(songs, ratings)).toEqual([{ id: "a" }, { id: "c" }]);
  });

  it("não recoloca uma música avaliada na fila", () => {
    const songs = [{ id: "rated" }, { id: "pending" }];
    const ratings = [{ song_id: "rated" }];

    expect(filterPendingSongs(songs, ratings).map((song) => song.id)).toEqual(["pending"]);
  });

  it("deriva total, avaliadas e restantes dos dados reais", () => {
    const songs: Song[] = [
      { id: "1", title: "1", artist: "A", coverUrl: "", audioUrl: "", status: "LIKE" },
      { id: "2", title: "2", artist: "A", coverUrl: "", audioUrl: "", status: "NEUTRAL" },
      { id: "3", title: "3", artist: "A", coverUrl: "", audioUrl: "", status: "DISLIKE" },
      { id: "4", title: "4", artist: "A", coverUrl: "", audioUrl: "", status: "PENDING" },
    ];

    expect(getLibraryProgress(songs)).toEqual({ total: 4, evaluated: 3, remaining: 1 });
  });
});
