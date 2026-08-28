import type {
  DuplicateStatus,
  ImportAction,
  ImportDecision,
  ImportMetadataStatus,
  ImportPlanDuplicateGroup,
  ImportPlanReport,
  ImportPlanSummary,
} from "@/types/import-plan";

const REPORT_PATTERN = /^import-plan-\d{4}-\d{2}-\d{2}-\d{6}\.json$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function nullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function nullableNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function actionValue(value: unknown): ImportAction {
  return value === "SKIP_EXACT" || value === "SKIP_LIKELY" ? value : "IMPORT";
}

function metadataValue(value: unknown): ImportMetadataStatus {
  return value === "INFERRED" || value === "NEEDS_REVIEW" ? value : "GOOD";
}

function duplicateValue(value: unknown, action: ImportAction, possible: boolean): DuplicateStatus {
  if (
    value === "EXACT_DUPLICATE" || value === "LIKELY_DUPLICATE" ||
    value === "POSSIBLE_DUPLICATE" || value === "UNIQUE"
  ) return value;
  if (action === "SKIP_EXACT") return "EXACT_DUPLICATE";
  if (action === "SKIP_LIKELY") return "LIKELY_DUPLICATE";
  return possible ? "POSSIBLE_DUPLICATE" : "UNIQUE";
}

function strings(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function pathDefaults(relativePath: string) {
  const segments = relativePath.split("/");
  const originalFilename = segments.at(-1) ?? relativePath;
  const sourceFolder = segments.length > 1 ? segments.slice(0, -1).join("/") : null;
  return { originalFilename, sourceFolder };
}

function parseDecision(value: unknown, possiblePaths: Set<string>): ImportDecision | null {
  if (!isRecord(value)) return null;
  const relativePath = stringValue(value.relative_path);
  if (!relativePath) return null;
  const defaults = pathDefaults(relativePath);
  const action = actionValue(value.action);

  return {
    relative_path: relativePath,
    original_filename: stringValue(value.original_filename, defaults.originalFilename),
    source_folder: nullableString(value.source_folder) ?? defaults.sourceFolder,
    resolved_title: nullableString(value.resolved_title),
    resolved_artist: nullableString(value.resolved_artist),
    resolved_album: nullableString(value.resolved_album),
    duration_seconds: nullableNumber(value.duration_seconds),
    file_hash: stringValue(value.file_hash),
    file_size: numberValue(value.file_size),
    action,
    reason: stringValue(value.reason, action === "IMPORT" ? "preserved" : "duplicate"),
    duplicate_status: duplicateValue(value.duplicate_status, action, possiblePaths.has(relativePath)),
    duplicate_group: nullableNumber(value.duplicate_group),
    representative: stringValue(value.representative, relativePath),
    representative_reason: strings(value.representative_reason),
    bitrate: nullableNumber(value.bitrate),
    sample_rate: nullableNumber(value.sample_rate),
    has_cover: value.has_cover === true,
    metadata_status: metadataValue(value.metadata_status),
  };
}

function parseSummary(value: unknown): ImportPlanSummary {
  if (!isRecord(value)) throw new Error("O relatório não contém um summary válido.");
  return {
    files_found: numberValue(value.files_found),
    files_to_import: numberValue(value.files_to_import),
    exact_duplicates_skipped: numberValue(value.exact_duplicates_skipped),
    likely_duplicates_skipped: numberValue(value.likely_duplicates_skipped),
    possible_duplicates_preserved: numberValue(value.possible_duplicates_preserved),
    metadata_review_preserved: numberValue(value.metadata_review_preserved),
    estimated_upload_bytes: numberValue(value.estimated_upload_bytes),
  };
}

function parseGroup(value: unknown): ImportPlanDuplicateGroup | null {
  if (!isRecord(value)) return null;
  const status = duplicateValue(value.duplicate_status, "IMPORT", false);
  if (status === "UNIQUE") return null;
  return {
    duplicate_group: numberValue(value.duplicate_group),
    duplicate_status: status,
    confidence: numberValue(value.confidence),
    hash: nullableString(value.hash) ?? undefined,
    quantity: numberValue(value.quantity),
    wasted_bytes: nullableNumber(value.wasted_bytes) ?? undefined,
    files: strings(value.files),
    reasons: strings(value.reasons),
  };
}

export function selectLatestImportPlanFile(fileNames: string[]) {
  return fileNames.filter((name) => REPORT_PATTERN.test(name)).sort().at(-1) ?? null;
}

export function parseImportPlan(value: unknown, reportName: string): ImportPlanReport {
  if (!isRecord(value)) throw new Error("O conteúdo do relatório não é um objeto JSON.");
  const possibleRows = Array.isArray(value.possible_duplicates_preserved)
    ? value.possible_duplicates_preserved
    : [];
  const possiblePaths = new Set(possibleRows
    .filter(isRecord)
    .map((row) => stringValue(row.relative_path))
    .filter(Boolean));
  const sourceRows = Array.isArray(value.decisions)
    ? value.decisions
    : [value.to_import, value.skipped_exact, value.skipped_likely]
        .filter(Array.isArray)
        .flat();
  if (!Array.isArray(sourceRows)) throw new Error("O relatório não contém decisões compatíveis.");

  const groups = (Array.isArray(value.duplicate_groups) ? value.duplicate_groups : [])
    .map(parseGroup)
    .filter((group): group is ImportPlanDuplicateGroup => group !== null);
  const statusByPath = new Map(groups.flatMap((group) =>
    group.files.map((file) => [file, group.duplicate_status] as const),
  ));
  const decisions = sourceRows
    .map((row) => parseDecision(row, possiblePaths))
    .filter((row): row is ImportDecision => row !== null)
    .map((decision): ImportDecision => {
      const duplicateStatus: DuplicateStatus =
        decision.duplicate_status === "UNIQUE"
          ? statusByPath.get(decision.relative_path) ?? "UNIQUE"
          : decision.duplicate_status;
      return { ...decision, duplicate_status: duplicateStatus };
    });

  return {
    generated_at: stringValue(value.generated_at),
    report_name: reportName,
    summary: parseSummary(value.summary),
    decisions,
    duplicate_groups: groups,
  };
}
