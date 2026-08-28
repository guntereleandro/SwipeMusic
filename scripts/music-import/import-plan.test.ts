import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import type { AnalyzedFile, DuplicateGroup } from "../music-analysis/analyze-library";
import { chooseBestRepresentative, createImportPlan } from "./import-plan";

function file(overrides: Partial<AnalyzedFile> & { relative_path: string }): AnalyzedFile {
  return {
    original_filename: overrides.relative_path.split("/").at(-1)!,
    source_folder: null,
    id3_title: "Música",
    id3_artist: "Artista",
    id3_album: null,
    resolved_title: "Música",
    resolved_artist: "Artista",
    resolved_album: null,
    title_source: "ID3",
    artist_source: "ID3",
    album_source: "UNKNOWN",
    title_confidence: "HIGH",
    artist_confidence: "HIGH",
    metadata_status: "GOOD",
    duration_seconds: 200,
    bitrate: 192000,
    sample_rate: 44100,
    embedded_cover_bytes: 0,
    file_hash: overrides.relative_path,
    file_size: 1_000,
    has_cover: false,
    normalized_title: "musica",
    normalized_artist: "artista",
    duplicate_status: "UNIQUE",
    duplicate_group: null,
    duplicate_confidence: 0,
    review_reason: "",
    metadata_issues: [],
    suspicious_fields: [],
    ...overrides,
  };
}

function group(
  duplicateStatus: DuplicateGroup["duplicate_status"],
  files: string[],
  duplicateGroup = 1,
): DuplicateGroup {
  return {
    duplicate_group: duplicateGroup,
    duplicate_status: duplicateStatus,
    confidence: duplicateStatus === "EXACT_DUPLICATE" ? 1 : 0.96,
    quantity: files.length,
    files,
    reasons: ["test"],
  };
}

describe("chooseBestRepresentative", () => {
  it("prioriza metadata status", () => {
    const inferred = file({ relative_path: "a.mp3", metadata_status: "INFERRED" });
    const good = file({ relative_path: "b.mp3", metadata_status: "GOOD" });
    expect(chooseBestRepresentative([inferred, good]).representative).toBe(good);
  });

  it("prioriza presença de cover quando os metadados empatam", () => {
    const withoutCover = file({ relative_path: "a.mp3", has_cover: false });
    const withCover = file({ relative_path: "b.mp3", has_cover: true });
    expect(chooseBestRepresentative([withoutCover, withCover]).representative).toBe(withCover);
  });

  it("prioriza bitrate maior", () => {
    const low = file({ relative_path: "a.mp3", bitrate: 128000 });
    const high = file({ relative_path: "b.mp3", bitrate: 320000 });
    expect(chooseBestRepresentative([low, high]).representative).toBe(high);
  });

  it("desempata deterministicamente por relative_path", () => {
    const second = file({ relative_path: "z/arquivo.mp3" });
    const first = file({ relative_path: "a/arquivo.mp3" });
    expect(chooseBestRepresentative([second, first]).representative).toBe(first);
  });
});

describe("plano de importação", () => {
  it("importa apenas um EXACT_DUPLICATE", () => {
    const files = [
      file({ relative_path: "a.mp3", file_hash: "same", duplicate_status: "EXACT_DUPLICATE" }),
      file({ relative_path: "b.mp3", file_hash: "same", duplicate_status: "EXACT_DUPLICATE" }),
    ];
    const plan = createImportPlan(files, [group("EXACT_DUPLICATE", ["a.mp3", "b.mp3"])]);
    expect(plan.to_import).toHaveLength(1);
    expect(plan.skipped_exact).toHaveLength(1);
  });

  it("importa apenas um LIKELY_DUPLICATE", () => {
    const files = [file({ relative_path: "a.mp3" }), file({ relative_path: "b.mp3" })];
    const plan = createImportPlan(files, [group("LIKELY_DUPLICATE", ["a.mp3", "b.mp3"])]);
    expect(plan.to_import).toHaveLength(1);
    expect(plan.skipped_likely).toHaveLength(1);
  });

  it("preserva todos os POSSIBLE_DUPLICATE", () => {
    const files = [
      file({ relative_path: "a.mp3", duplicate_status: "POSSIBLE_DUPLICATE" }),
      file({ relative_path: "b.mp3", duplicate_status: "POSSIBLE_DUPLICATE" }),
    ];
    const plan = createImportPlan(files, [group("POSSIBLE_DUPLICATE", ["a.mp3", "b.mp3"])]);
    expect(plan.to_import).toHaveLength(2);
    expect(plan.possible_duplicates_preserved).toHaveLength(2);
  });

  it("preserva metadata NEEDS_REVIEW", () => {
    const needsReview = file({ relative_path: "review.mp3", metadata_status: "NEEDS_REVIEW" });
    const plan = createImportPlan([needsReview], []);
    expect(plan.to_import).toHaveLength(1);
    expect(plan.metadata_review_preserved).toHaveLength(1);
  });

  it("a camada de plano não importa nem inicializa Supabase", async () => {
    const source = await readFile(new URL("./import-plan.ts", import.meta.url), "utf8");
    expect(source).not.toContain("@supabase/supabase-js");
    expect(source).not.toContain("createClient(");
    expect(source).not.toContain(".from(\"");
    expect(source).not.toContain(".storage");
  });
});
