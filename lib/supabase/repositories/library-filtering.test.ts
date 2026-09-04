import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SongRow } from "@/lib/supabase/database.types";

const state = vi.hoisted(() => ({ pages: [] as unknown[][], calls: [] as Array<[string, ...unknown[]]> }));

vi.mock("../client", () => ({
  getSupabaseClient: () => {
    const query = {
      select(...args: unknown[]) { state.calls.push(["select", ...args]); return query; },
      eq(...args: unknown[]) { state.calls.push(["eq", ...args]); return query; },
      order(...args: unknown[]) { state.calls.push(["order", ...args]); return query; },
      range(...args: unknown[]) { state.calls.push(["range", ...args]); return Promise.resolve({ data: state.pages.shift() ?? [], error: null }); },
    };
    return { from: (table: string) => { state.calls.push(["from", table]); return query; } };
  },
}));

import { listSongs } from "./songs";
import { listRatings } from "./ratings";

function song(index: number): SongRow {
  return { id: `${index}`, library_id: "norair", title: `Song ${index}`, artist: null, album: null,
    original_filename: `${index}.mp3`, source_folder: null, audio_path: `${index}.mp3`, cover_path: null,
    file_hash: `${index}`, duration_seconds: null, bitrate: null, sample_rate: null, metadata_status: null,
    metadata_review_required: false, created_at: "2026-01-01T00:00:00Z" };
}

describe("consultas isoladas por biblioteca", () => {
  beforeEach(() => { state.pages = []; state.calls = []; });

  it("aplica library_id em todas as páginas de songs (>1000)", async () => {
    state.pages = [Array.from({ length: 1000 }, (_, index) => song(index)), [song(1000)]];
    await expect(listSongs("norair-id")).resolves.toHaveLength(1001);
    expect(state.calls.filter(([method]) => method === "eq")).toEqual([["eq", "library_id", "norair-id"], ["eq", "library_id", "norair-id"]]);
  });

  it("filtra ratings pela relação com songs da biblioteca", async () => {
    state.pages = [[{ id: "r1", song_id: "s1", rating: "LIKE", created_at: "2026-01-01", songs: { library_id: "lito-id" } }]];
    await expect(listRatings("lito-id")).resolves.toEqual([{ id: "r1", song_id: "s1", rating: "LIKE", created_at: "2026-01-01" }]);
    expect(state.calls).toContainEqual(["eq", "songs.library_id", "lito-id"]);
  });

  it("recusa consultas sem biblioteca explícita", async () => {
    await expect(listSongs("")).rejects.toThrow(/libraryId/);
    await expect(listRatings("")).rejects.toThrow(/libraryId/);
  });
});
