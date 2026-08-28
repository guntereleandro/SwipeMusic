import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
  analyzeLibrary,
  type AnalyzedFile,
  type DuplicateGroup,
} from "../music-analysis/analyze-library";
import type { ImportDecision, ImportPlanSummary } from "../../types/import-plan";

export type { ImportDecision } from "../../types/import-plan";

export type ImportPlan = {
  summary: ImportPlanSummary;
  to_import: ImportDecision[];
  skipped_exact: ImportDecision[];
  skipped_likely: ImportDecision[];
  possible_duplicates_preserved: ImportDecision[];
  metadata_review_preserved: ImportDecision[];
  duplicate_groups: DuplicateGroup[];
  decisions: ImportDecision[];
  files: AnalyzedFile[];
};

const STATUS_SCORE = { GOOD: 3, INFERRED: 2, NEEDS_REVIEW: 1 } as const;
const CONFIDENCE_SCORE = { HIGH: 3, MEDIUM: 2, LOW: 1 } as const;

function decisionDetails(file: AnalyzedFile) {
  return {
    relative_path: file.relative_path,
    original_filename: file.original_filename,
    source_folder: file.source_folder,
    resolved_title: file.resolved_title,
    resolved_artist: file.resolved_artist,
    resolved_album: file.resolved_album,
    duration_seconds: file.duration_seconds,
    file_hash: file.file_hash,
    file_size: file.file_size,
    bitrate: file.bitrate,
    sample_rate: file.sample_rate,
    has_cover: file.has_cover,
    metadata_status: file.metadata_status,
  };
}

function compareRepresentative(left: AnalyzedFile, right: AnalyzedFile) {
  const comparisons = [
    Number(!right.analysis_error) - Number(!left.analysis_error),
    STATUS_SCORE[right.metadata_status] - STATUS_SCORE[left.metadata_status],
    CONFIDENCE_SCORE[right.title_confidence] - CONFIDENCE_SCORE[left.title_confidence],
    CONFIDENCE_SCORE[right.artist_confidence] - CONFIDENCE_SCORE[left.artist_confidence],
    Number(right.has_cover) - Number(left.has_cover),
    (right.bitrate ?? -1) - (left.bitrate ?? -1),
    (right.sample_rate ?? -1) - (left.sample_rate ?? -1),
    right.file_size - left.file_size,
  ];
  return comparisons.find((difference) => difference !== 0) ??
    left.relative_path.localeCompare(right.relative_path, "pt-BR");
}

export function chooseBestRepresentative(candidates: AnalyzedFile[]) {
  if (candidates.length === 0) throw new Error("Grupo de duplicatas vazio.");
  const representative = [...candidates].sort(compareRepresentative)[0];
  const reasons = [
    representative.analysis_error ? "com erro de leitura" : "sem erro de leitura",
    `metadata ${representative.metadata_status}`,
    `título ${representative.title_confidence}`,
    `artista ${representative.artist_confidence}`,
    representative.has_cover ? "cover presente" : "sem cover",
    representative.bitrate ? `bitrate ${Math.round(representative.bitrate / 1000)} kbps` : "bitrate desconhecido",
    representative.sample_rate ? `sample rate ${representative.sample_rate} Hz` : "sample rate desconhecido",
    "desempate final por relative_path",
  ];
  return { representative, reasons };
}

function escapeCsv(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function planCsv(decisions: ImportDecision[]) {
  const columns: Array<keyof ImportDecision> = [
    "relative_path", "original_filename", "source_folder", "resolved_title",
    "resolved_artist", "resolved_album", "duration_seconds", "file_hash", "file_size",
    "action", "reason", "duplicate_status", "duplicate_group",
    "representative", "representative_reason", "bitrate", "sample_rate",
    "has_cover", "metadata_status",
  ];
  const rows = decisions.map((decision) =>
    columns.map((column) => escapeCsv(
      Array.isArray(decision[column]) ? decision[column].join("; ") : decision[column],
    )).join(","),
  );
  return `\uFEFF${columns.join(",")}\r\n${rows.join("\r\n")}\r\n`;
}

function timestamp(date: Date) {
  return date.toISOString().replace(/:/g, "").replace("T", "-").slice(0, 17);
}

function formatBytes(bytes: number) {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} ${units[unit]}`;
}

export function createImportPlan(files: AnalyzedFile[], duplicateGroups: DuplicateGroup[]): ImportPlan {
  const byPath = new Map(files.map((file) => [file.relative_path, file]));
  const byHash = new Map<string, AnalyzedFile[]>();
  files.forEach((file) => {
    const key = file.file_hash || `path:${file.relative_path}`;
    const group = byHash.get(key) ?? [];
    group.push(file);
    byHash.set(key, group);
  });

  const activeByHash = new Map<string, AnalyzedFile>();
  const exactSkipped = new Map<string, { representative: AnalyzedFile; reasons: string[]; group: number | null }>();
  for (const [hash, hashFiles] of byHash) {
    const choice = chooseBestRepresentative(hashFiles);
    activeByHash.set(hash, choice.representative);
    const exactGroup = duplicateGroups.find((group) =>
      group.duplicate_status === "EXACT_DUPLICATE" && group.files.includes(choice.representative.relative_path),
    );
    hashFiles.forEach((file) => {
      if (file !== choice.representative) {
        exactSkipped.set(file.relative_path, {
          representative: choice.representative,
          reasons: choice.reasons,
          group: exactGroup?.duplicate_group ?? null,
        });
      }
    });
  }

  const likelySkipped = new Map<string, { representative: AnalyzedFile; reasons: string[]; group: number }>();
  const representativeRedirect = new Map<string, AnalyzedFile>();
  const likelyRepresentativeGroup = new Map<string, number>();
  const representativeReasons = new Map<string, string[]>();
  for (const group of duplicateGroups.filter((item) => item.duplicate_status === "LIKELY_DUPLICATE")) {
    const candidates = [...new Map(group.files
      .map((path) => byPath.get(path))
      .filter((file): file is AnalyzedFile => Boolean(file))
      .map((file) => {
        const key = file.file_hash || `path:${file.relative_path}`;
        const active = activeByHash.get(key)!;
        return [active.relative_path, active] as const;
      })).values()];
    if (candidates.length < 2) continue;
    const choice = chooseBestRepresentative(candidates);
    likelyRepresentativeGroup.set(choice.representative.relative_path, group.duplicate_group);
    representativeReasons.set(choice.representative.relative_path, choice.reasons);
    candidates.forEach((file) => {
      representativeRedirect.set(file.relative_path, choice.representative);
      if (file !== choice.representative) {
        likelySkipped.set(file.relative_path, {
          representative: choice.representative,
          reasons: choice.reasons,
          group: group.duplicate_group,
        });
      }
    });
  }

  const decisions = files.map((file): ImportDecision => {
    const exact = exactSkipped.get(file.relative_path);
    if (exact) {
      const finalRepresentative = representativeRedirect.get(exact.representative.relative_path) ?? exact.representative;
      return {
        ...decisionDetails(file),
        action: "SKIP_EXACT",
        reason: "exact_duplicate",
        duplicate_status: "EXACT_DUPLICATE",
        duplicate_group: exact.group,
        representative: finalRepresentative.relative_path,
        representative_reason:
          representativeReasons.get(finalRepresentative.relative_path) ?? exact.reasons,
      };
    }

    const likely = likelySkipped.get(file.relative_path);
    if (likely) {
      return {
        ...decisionDetails(file),
        action: "SKIP_LIKELY",
        reason: "likely_duplicate",
        duplicate_status: "LIKELY_DUPLICATE",
        duplicate_group: likely.group,
        representative: likely.representative.relative_path,
        representative_reason: likely.reasons,
      };
    }

    const likelyGroupNumber = likelyRepresentativeGroup.get(file.relative_path);
    const exactGroup = duplicateGroups.find((group) =>
      group.duplicate_status === "EXACT_DUPLICATE" && group.files.includes(file.relative_path),
    );
    const reasons = representativeReasons.get(file.relative_path) ?? chooseBestRepresentative([file]).reasons;
    return {
      ...decisionDetails(file),
      action: "IMPORT",
      reason: likelyGroupNumber ? "likely_duplicate_representative" : exactGroup ? "exact_duplicate_representative" : "preserved",
      duplicate_status: likelyGroupNumber ? "LIKELY_DUPLICATE" : file.duplicate_status,
      duplicate_group: likelyGroupNumber ?? exactGroup?.duplicate_group ?? file.duplicate_group,
      representative: file.relative_path,
      representative_reason: reasons,
    };
  });

  const toImport = decisions.filter((decision) => decision.action === "IMPORT");
  const skippedExact = decisions.filter((decision) => decision.action === "SKIP_EXACT");
  const skippedLikely = decisions.filter((decision) => decision.action === "SKIP_LIKELY");
  const possiblePreserved = toImport.filter((decision) =>
    byPath.get(decision.relative_path)?.duplicate_status === "POSSIBLE_DUPLICATE",
  );
  const reviewPreserved = toImport.filter((decision) => decision.metadata_status === "NEEDS_REVIEW");
  const estimatedBytes = toImport.reduce((total, decision) => {
    const file = byPath.get(decision.relative_path)!;
    return total + file.file_size + file.embedded_cover_bytes;
  }, 0);

  return {
    summary: {
      files_found: files.length,
      files_to_import: toImport.length,
      exact_duplicates_skipped: skippedExact.length,
      likely_duplicates_skipped: skippedLikely.length,
      possible_duplicates_preserved: possiblePreserved.length,
      metadata_review_preserved: reviewPreserved.length,
      estimated_upload_bytes: estimatedBytes,
    },
    to_import: toImport,
    skipped_exact: skippedExact,
    skipped_likely: skippedLikely,
    possible_duplicates_preserved: possiblePreserved,
    metadata_review_preserved: reviewPreserved,
    duplicate_groups: duplicateGroups,
    decisions,
    files,
  };
}

export async function buildImportPlan(root: string, writeReports = true) {
  const analysis = await analyzeLibrary(root, { writeReports: false, printSummary: false });
  const plan = createImportPlan(analysis.files, analysis.duplicateGroups);

  if (writeReports) {
    const now = new Date();
    const reportsDirectory = resolve(process.cwd(), "reports");
    const baseName = `import-plan-${timestamp(now)}`;
    await mkdir(reportsDirectory, { recursive: true });
    await Promise.all([
      writeFile(resolve(reportsDirectory, `${baseName}.json`), JSON.stringify({
        generated_at: now.toISOString(),
        summary: plan.summary,
        to_import: plan.to_import,
        skipped_exact: plan.skipped_exact,
        skipped_likely: plan.skipped_likely,
        possible_duplicates_preserved: plan.possible_duplicates_preserved,
        metadata_review_preserved: plan.metadata_review_preserved,
        duplicate_groups: plan.duplicate_groups,
        decisions: plan.decisions,
      }, null, 2), "utf8"),
      writeFile(resolve(reportsDirectory, `${baseName}.csv`), planCsv(plan.decisions), "utf8"),
    ]);
  }

  console.log("\n===================================");
  console.log("SWIPEMUSIC — PLANO DE IMPORTAÇÃO");
  console.log("===================================\n");
  console.log(`Arquivos encontrados:             ${plan.summary.files_found.toLocaleString("pt-BR")}`);
  console.log(`Arquivos que serão importados:    ${plan.summary.files_to_import.toLocaleString("pt-BR")}`);
  console.log(`Duplicatas exatas ignoradas:      ${plan.summary.exact_duplicates_skipped.toLocaleString("pt-BR")}`);
  console.log(`Likely duplicates ignoradas:      ${plan.summary.likely_duplicates_skipped.toLocaleString("pt-BR")}`);
  console.log(`Possible duplicates preservadas:  ${plan.summary.possible_duplicates_preserved.toLocaleString("pt-BR")}`);
  console.log(`Needs review preservados:         ${plan.summary.metadata_review_preserved.toLocaleString("pt-BR")}`);
  console.log(`Tamanho estimado de upload:       ${formatBytes(plan.summary.estimated_upload_bytes)}`);

  for (const group of plan.duplicate_groups.filter((item) => item.duplicate_status === "LIKELY_DUPLICATE").slice(0, 5)) {
    const imported = plan.to_import.find((decision) => decision.duplicate_group === group.duplicate_group);
    const ignored = plan.skipped_likely.filter((decision) => decision.duplicate_group === group.duplicate_group);
    console.log(`\nGrupo ${group.duplicate_group} — LIKELY_DUPLICATE`);
    console.log(`IMPORTAR: ${imported?.relative_path ?? "—"}`);
    ignored.forEach((decision) => console.log(`IGNORAR:  ${decision.relative_path}`));
    imported?.representative_reason.forEach((reason) => console.log(`- ${reason}`));
  }

  console.log("\nNenhum upload, insert ou alteração de arquivo foi executado.");
  return plan;
}
