import { describe, expect, it, vi } from "vitest";
import type { AnalyzedFile, DuplicateGroup } from "../music-analysis/analyze-library";
import { applyCleanupPlan, chooseAvailableDestination, createCleanupPlan, listRemoteSongs } from "./cleanup-plan";

function file(path: string, hash: string, overrides: Partial<AnalyzedFile> = {}): AnalyzedFile {
  return {
    original_filename: path.split("/").at(-1)!, source_folder: null, relative_path: path,
    id3_title: "Música", id3_artist: "Artista", id3_album: null, resolved_title: "Música",
    resolved_artist: "Artista", resolved_album: null, title_source: "ID3", artist_source: "ID3",
    album_source: "UNKNOWN", title_confidence: "HIGH", artist_confidence: "HIGH", metadata_status: "GOOD",
    duration_seconds: 200, bitrate: 192000, sample_rate: 44100, embedded_cover_bytes: 0,
    file_hash: hash, file_size: 1000, has_cover: false, normalized_title: "musica", normalized_artist: "artista",
    duplicate_status: "UNIQUE", duplicate_group: null, duplicate_confidence: 0, review_reason: "",
    metadata_issues: [], suspicious_fields: [], ...overrides,
  };
}

function likely(paths: string[]): DuplicateGroup {
  return { duplicate_group: 1, duplicate_status: "LIKELY_DUPLICATE", confidence: .96, quantity: paths.length, files: paths, reasons: ["complete_linkage"] };
}

describe("plano conservador de limpeza", () => {
  it("mantém uma cópia exata cadastrada e move apenas a redundante", () => {
    const files = [file("original.mp3", "same", { duplicate_status: "EXACT_DUPLICATE" }), file("copia.mp3", "same", { duplicate_status: "EXACT_DUPLICATE" })];
    const plan = createCleanupPlan(files, [], [{ id: "song", file_hash: "same" }], "lito");
    expect(plan.decisions.filter((item) => item.action === "KEEP")).toHaveLength(1);
    expect(plan.decisions.filter((item) => item.action === "MOVE_DUPLICATE")).toHaveLength(1);
    expect(plan.decisions.find((item) => item.action === "MOVE_DUPLICATE")).toMatchObject({ song_id: "song", library_slug: "lito" });
  });

  it("não confunde mesmo nome com hash diferente", () => {
    const plan = createCleanupPlan([file("a/faixa.mp3", "remote"), file("b/faixa.mp3", "different")], [], [{ id: "song", file_hash: "remote" }], "lito");
    expect(plan.decisions.map((item) => item.action)).toEqual(["KEEP", "KEEP_NOT_IN_SUPABASE"]);
  });

  it("move LIKELY somente com um representante remoto inequívoco", () => {
    const files = [file("remota.mp3", "remote", { duplicate_status: "LIKELY_DUPLICATE" }), file("redundante.mp3", "local", { duplicate_status: "LIKELY_DUPLICATE" })];
    const safe = createCleanupPlan(files, [likely(files.map((item) => item.relative_path))], [{ id: "song", file_hash: "remote" }], "lito");
    expect(safe.decisions.find((item) => item.original_path === "redundante.mp3")?.action).toBe("MOVE_DUPLICATE");
    const ambiguous = createCleanupPlan(files, [likely(files.map((item) => item.relative_path))], [{ id: "a", file_hash: "remote" }, { id: "b", file_hash: "local" }], "lito");
    expect(ambiguous.decisions.every((item) => item.action === "KEEP")).toBe(true);
    expect(ambiguous.summary.ambiguous_preserved).toBe(2);
  });

  it("sempre preserva POSSIBLE, NEEDS_REVIEW e arquivo fora da library", () => {
    const files = [
      file("possible.mp3", "p", { duplicate_status: "POSSIBLE_DUPLICATE" }),
      file("review.mp3", "r", { metadata_status: "NEEDS_REVIEW" }),
      file("outra-library.mp3", "other"),
    ];
    const plan = createCleanupPlan(files, [], [], "lito");
    expect(plan.decisions.map((item) => item.action)).toEqual(["KEEP_NOT_IN_SUPABASE", "KEEP_POSSIBLE", "KEEP_REVIEW"]);
  });

  it("pagina mais de 1000 músicas remotas", async () => {
    const first = Array.from({ length: 1000 }, (_, index) => ({ id: `${index}`, file_hash: `${index}` }));
    const fetch = vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce([{ id: "1000", file_hash: "1000" }]);
    await expect(listRemoteSongs(fetch)).resolves.toHaveLength(1001);
    expect(fetch).toHaveBeenNthCalledWith(2, 1000, 1999);
  });
});

describe("quarentena e falha parcial", () => {
  it("gera alternativa segura quando o nome já existe, inclusive com acentos", async () => {
    const destination = await chooseAvailableDestination("_duplicatas_removidas/Álbuns/Música.mp3", async (path) => path.endsWith("Música.mp3"));
    expect(destination).toBe("_duplicatas_removidas/Álbuns/Música (1).mp3");
  });

  it("interrompe no primeiro erro e registra movimentos anteriores", async () => {
    const files = [file("a.mp3", "same", { duplicate_status: "EXACT_DUPLICATE" }), file("b.mp3", "same", { duplicate_status: "EXACT_DUPLICATE" }), file("c.mp3", "same", { duplicate_status: "EXACT_DUPLICATE" })];
    const plan = createCleanupPlan(files, [], [{ id: "song", file_hash: "same" }], "lito");
    let calls = 0;
    const result = await applyCleanupPlan(plan, async () => { calls += 1; if (calls === 2) throw new Error("disco cheio"); });
    expect(result).toMatchObject({ completed: false, errors: [{ message: "disco cheio" }] });
    expect(plan.decisions.filter((item) => item.move_status === "MOVED")).toHaveLength(1);
    expect(plan.decisions.filter((item) => item.move_status === "FAILED")).toHaveLength(1);
  });
});
