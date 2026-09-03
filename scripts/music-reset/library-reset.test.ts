import { describe, expect, it, vi } from "vitest";
import {
  REQUIRED_CONFIRMATION,
  assertEmptyFinalState,
  createResetReport,
  isResetConfirmed,
  listAllStorageObjects,
  removeStorageObjectsInBatches,
  runResetStages,
  type ResetCounts,
} from "./library-reset";

const empty: ResetCounts = { songs: 0, ratings: 0, musicObjects: 0, coverObjects: 2, importedCoverObjects: 0 };

describe("confirmação forte", () => {
  it("aceita somente o texto exato", () => {
    expect(isResetConfirmed(REQUIRED_CONFIRMATION)).toBe(true);
    expect(isResetConfirmed("apagar biblioteca")).toBe(false);
    expect(isResetConfirmed(` ${REQUIRED_CONFIRMATION}`)).toBe(false);
  });
});

describe("Storage", () => {
  it("pagina e percorre subpastas", async () => {
    const list = vi.fn(async (prefix: string, { offset }: { limit: number; offset: number }) => {
      if (prefix === "" && offset === 0) return [{ name: "a.mp3", id: "1" }, { name: "rock", id: null, metadata: null }];
      if (prefix === "" && offset === 2) return [{ name: "b.mp3", id: "2" }];
      if (prefix === "rock" && offset === 0) return [{ name: "c.mp3", id: "3" }];
      return [];
    });
    await expect(listAllStorageObjects(list, "", 2)).resolves.toEqual(["a.mp3", "rock/c.mp3", "b.mp3"]);
    expect(list).toHaveBeenCalledWith("", { limit: 2, offset: 2 });
  });

  it("remove em lotes e contabiliza apenas lotes confirmados", async () => {
    const batches: string[][] = [];
    const remove = vi.fn(async (batch: string[]) => { batches.push(batch); });
    await expect(removeStorageObjectsInBatches(["a", "b", "c", "d", "e"], remove, 2)).resolves.toBe(5);
    expect(batches).toEqual([["a", "b"], ["c", "d"], ["e"]]);
  });
});

describe("relatório e execução", () => {
  it("gera relatório concluído e valida estado vazio", async () => {
    const before = { songs: 2, ratings: 3, musicObjects: 2, coverObjects: 3, importedCoverObjects: 1 };
    const report = await runResetStages({
      before,
      deleteRatings: async () => undefined,
      deleteSongs: async () => undefined,
      removeMusic: async () => 2,
      removeImportedCovers: async () => 1,
      readAfter: async () => empty,
      now: () => new Date("2026-09-01T12:00:00.000Z"),
    });
    expect(report).toEqual(createResetReport({
      started_at: "2026-09-01T12:00:00.000Z",
      status: "completed",
      counts_before: before,
      counts_after: empty,
      removed: { ratings: 3, songs: 2, music_objects: 2, imported_cover_objects: 1 },
      errors: [],
    }, new Date("2026-09-01T12:00:00.000Z")));
    expect(() => assertEmptyFinalState(empty)).not.toThrow();
  });

  it("interrompe no primeiro erro e produz relatório parcial explícito", async () => {
    const deleteSongs = vi.fn(async () => { throw new Error("banco indisponível"); });
    const removeMusic = vi.fn(async () => 1);
    await expect(runResetStages({
      before: { songs: 1, ratings: 1, musicObjects: 1, coverObjects: 0, importedCoverObjects: 0 },
      deleteRatings: async () => undefined,
      deleteSongs,
      removeMusic,
      removeImportedCovers: async () => 0,
      readAfter: async () => empty,
    })).rejects.toMatchObject({
      message: 'Etapa "songs" falhou: banco indisponível',
      report: { status: "failed", errors: [{ stage: "songs", message: "banco indisponível" }] },
    });
    expect(removeMusic).not.toHaveBeenCalled();
  });

  it("trata estado final não vazio como falha de verificação", async () => {
    await expect(runResetStages({
      before: empty,
      deleteRatings: async () => undefined,
      deleteSongs: async () => undefined,
      removeMusic: async () => 0,
      removeImportedCovers: async () => 0,
      readAfter: async () => ({ ...empty, musicObjects: 1 }),
    })).rejects.toMatchObject({
      report: { status: "failed", errors: [{ stage: "verificação final" }] },
    });
  });
});
