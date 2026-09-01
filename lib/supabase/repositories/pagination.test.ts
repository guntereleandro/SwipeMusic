import { describe, expect, it, vi } from "vitest";
import { listAllPages } from "./pagination";

function rows(count: number, prefix = "row") {
  return Array.from({ length: count }, (_, index) => ({ id: `${prefix}-${index}` }));
}

function rangeFetcher<Row>(source: Row[]) {
  return vi.fn(async (from: number, to: number) => source.slice(from, to + 1));
}

describe("listAllPages", () => {
  it("carrega mais de 1.000 músicas em lotes", async () => {
    const source = rows(2_135, "song");
    const fetchPage = rangeFetcher(source);

    const result = await listAllPages(fetchPage);

    expect(result).toEqual(source);
    expect(fetchPage.mock.calls).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
  });

  it("faz uma última consulta vazia quando o total é múltiplo de 1.000", async () => {
    const source = rows(2_000);
    const fetchPage = rangeFetcher(source);

    expect(await listAllPages(fetchPage)).toEqual(source);
    expect(fetchPage.mock.calls.at(-1)).toEqual([2000, 2999]);
  });

  it("encerra após uma última página parcial", async () => {
    const fetchPage = rangeFetcher(rows(1_001));

    expect(await listAllPages(fetchPage)).toHaveLength(1_001);
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it("propaga erro de uma página intermediária", async () => {
    const fetchPage = vi.fn(async (from: number) => {
      if (from === 1_000) throw new Error("falha na segunda página");
      return rows(1_000);
    });

    await expect(listAllPages(fetchPage)).rejects.toThrow("falha na segunda página");
  });

  it("carrega mais de 1.000 avaliações sem duplicar IDs", async () => {
    const ratings = rows(1_501, "rating");
    const fetchPage = rangeFetcher(ratings);

    const result = await listAllPages(fetchPage);

    expect(result).toHaveLength(1_501);
    expect(new Set(result.map((rating) => rating.id)).size).toBe(1_501);
  });
});
