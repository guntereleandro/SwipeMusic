import { describe, expect, it } from "vitest";
import { filterImportDecisions, getDuplicateGroupView } from "./filter-import-plan";
import { parseImportPlan, selectLatestImportPlanFile } from "./parse-import-plan";
import type { ImportDecision } from "@/types/import-plan";

function decision(overrides: Partial<ImportDecision> & { relative_path: string }): ImportDecision {
  const { relative_path, ...rest } = overrides;
  return {
    relative_path,
    original_filename: relative_path.split("/").at(-1)!,
    source_folder: null,
    resolved_title: "Música",
    resolved_artist: "Artista",
    resolved_album: null,
    duration_seconds: 180,
    file_hash: "hash",
    file_size: 1000,
    action: "IMPORT",
    reason: "preserved",
    duplicate_status: "UNIQUE",
    duplicate_group: null,
    representative: relative_path,
    representative_reason: [],
    bitrate: 192000,
    sample_rate: 44100,
    has_cover: true,
    metadata_status: "GOOD",
    ...rest,
  };
}

const summary = {
  files_found: 10,
  files_to_import: 7,
  exact_duplicates_skipped: 1,
  likely_duplicates_skipped: 2,
  possible_duplicates_preserved: 2,
  metadata_review_preserved: 1,
  estimated_upload_bytes: 123456,
};

describe("leitura do relatório de importação", () => {
  it("seleciona somente o import-plan mais recente", () => {
    expect(selectLatestImportPlanFile([
      "library-analysis-v2-2026-08-28-100000.json",
      "import-plan-2026-08-28-120000.json",
      "import-plan-2026-08-29-090000.json",
      "notas.txt",
    ])).toBe("import-plan-2026-08-29-090000.json");
  });

  it("faz parsing do JSON e preserva as contagens do summary", () => {
    const parsed = parseImportPlan({
      generated_at: "2026-08-29T09:00:00.000Z",
      summary,
      decisions: [decision({ relative_path: "a.mp3" })],
      duplicate_groups: [],
    }, "import-plan-2026-08-29-090000.json");
    expect(parsed.summary).toEqual(summary);
    expect(parsed.decisions).toHaveLength(1);
  });

  it("recupera o duplicate status de relatórios antigos pelos grupos", () => {
    const parsed = parseImportPlan({
      generated_at: "2026-08-29T09:00:00.000Z",
      summary,
      to_import: [{ relative_path: "manter.mp3", action: "IMPORT", duplicate_group: 42 }],
      skipped_exact: [{ relative_path: "ignorar.mp3", action: "SKIP_EXACT", duplicate_group: 42 }],
      skipped_likely: [],
      duplicate_groups: [{ duplicate_group: 42, duplicate_status: "EXACT_DUPLICATE", confidence: 1, quantity: 2, files: ["manter.mp3", "ignorar.mp3"], reasons: ["identical_sha256"] }],
    }, "import-plan-2026-08-29-090000.json");
    expect(parsed.decisions.every((row) => row.duplicate_status === "EXACT_DUPLICATE")).toBe(true);
  });
});

describe("filtros da revisão", () => {
  const rows = [
    decision({ relative_path: "import.mp3" }),
    decision({ relative_path: "exact.mp3", action: "SKIP_EXACT", duplicate_status: "EXACT_DUPLICATE" }),
    decision({ relative_path: "likely.mp3", action: "SKIP_LIKELY", duplicate_status: "LIKELY_DUPLICATE" }),
    decision({ relative_path: "possible.mp3", duplicate_status: "POSSIBLE_DUPLICATE" }),
    decision({ relative_path: "review.mp3", metadata_status: "NEEDS_REVIEW" }),
  ];

  it("filtra Importar", () => expect(filterImportDecisions(rows, "IMPORT", "")).toHaveLength(3));
  it("filtra Ignorar", () => expect(filterImportDecisions(rows, "IGNORE", "")).toHaveLength(2));
  it("filtra Possible", () => expect(filterImportDecisions(rows, "POSSIBLE", "").map((row) => row.relative_path)).toEqual(["possible.mp3"]));
  it("filtra Needs Review", () => expect(filterImportDecisions(rows, "REVIEW", "").map((row) => row.relative_path)).toEqual(["review.mp3"]));
  it("possible duplicate continua marcado para importar", () => {
    expect(filterImportDecisions(rows, "POSSIBLE", "")[0].action).toBe("IMPORT");
  });
});

it("grupo identifica o representative correto", () => {
  const rows = [
    decision({ relative_path: "manter.mp3", duplicate_group: 42, duplicate_status: "LIKELY_DUPLICATE" }),
    decision({ relative_path: "ignorar.mp3", duplicate_group: 42, duplicate_status: "LIKELY_DUPLICATE", action: "SKIP_LIKELY", representative: "manter.mp3" }),
  ];
  expect(getDuplicateGroupView(rows, 42).representative?.relative_path).toBe("manter.mp3");
});
