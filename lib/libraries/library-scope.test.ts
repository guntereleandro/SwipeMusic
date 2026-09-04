import { describe, expect, it } from "vitest";
import { filterRowsBySongIds, positionalArguments, requireLibrarySlug, resolveRequiredLibrary } from "./library-scope";

describe("escopo de biblioteca", () => {
  it("exige --library e normaliza o slug", () => {
    expect(requireLibrarySlug(["E:\\Musicas", "--library", "Norair"])).toBe("norair");
    expect(() => requireLibrarySlug(["E:\\Musicas"])).toThrow(/--library/);
  });

  it("não confunde o valor de --library com a pasta", () => {
    expect(positionalArguments(["E:\\Musicas", "--library", "norair", "--plan"])).toEqual(["E:\\Musicas"]);
  });

  it("elimina ratings de músicas fora da biblioteca", () => {
    const rows = [{ song_id: "norair" }, { song_id: "lito" }];
    expect(filterRowsBySongIds(rows, new Set(["lito"]))).toEqual([{ song_id: "lito" }]);
  });

  it("aborta quando a biblioteca não existe", async () => {
    await expect(resolveRequiredLibrary("inexistente", async () => null)).rejects.toThrow("Biblioteca não encontrada: inexistente");
  });
});
