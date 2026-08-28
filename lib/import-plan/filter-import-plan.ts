import type { ImportDecision } from "@/types/import-plan";

export type ImportFilter = "ALL" | "IMPORT" | "IGNORE" | "EXACT" | "LIKELY" | "POSSIBLE" | "REVIEW";
export type ImportSortKey = "action" | "title" | "artist" | "duplicate" | "metadata" | "bitrate" | "group";

export function filterImportDecisions(
  decisions: ImportDecision[],
  filter: ImportFilter,
  query: string,
) {
  const normalizedQuery = query.trim().toLocaleLowerCase("pt-BR");
  return decisions.filter((decision) => {
    const matchesFilter =
      filter === "ALL" ||
      (filter === "IMPORT" && decision.action === "IMPORT") ||
      (filter === "IGNORE" && decision.action !== "IMPORT") ||
      (filter === "EXACT" && decision.duplicate_status === "EXACT_DUPLICATE") ||
      (filter === "LIKELY" && decision.duplicate_status === "LIKELY_DUPLICATE") ||
      (filter === "POSSIBLE" && decision.duplicate_status === "POSSIBLE_DUPLICATE") ||
      (filter === "REVIEW" && decision.metadata_status === "NEEDS_REVIEW");
    if (!matchesFilter || !normalizedQuery) return matchesFilter;

    return [
      decision.resolved_title,
      decision.resolved_artist,
      decision.original_filename,
      decision.source_folder,
      decision.relative_path,
    ].some((value) => value?.toLocaleLowerCase("pt-BR").includes(normalizedQuery));
  });
}

export function sortImportDecisions(decisions: ImportDecision[], key: ImportSortKey) {
  return [...decisions].sort((left, right) => {
    const values: Record<ImportSortKey, [string | number, string | number]> = {
      action: [left.action, right.action],
      title: [left.resolved_title ?? left.original_filename, right.resolved_title ?? right.original_filename],
      artist: [left.resolved_artist ?? "", right.resolved_artist ?? ""],
      duplicate: [left.duplicate_status, right.duplicate_status],
      metadata: [left.metadata_status, right.metadata_status],
      bitrate: [left.bitrate ?? -1, right.bitrate ?? -1],
      group: [left.duplicate_group ?? Number.MAX_SAFE_INTEGER, right.duplicate_group ?? Number.MAX_SAFE_INTEGER],
    };
    const [leftValue, rightValue] = values[key];
    return typeof leftValue === "number" && typeof rightValue === "number"
      ? rightValue - leftValue
      : String(leftValue).localeCompare(String(rightValue), "pt-BR");
  });
}

export function getDuplicateGroupView(decisions: ImportDecision[], group: number) {
  const members = decisions.filter((decision) => decision.duplicate_group === group);
  return {
    members,
    representative: members.find((decision) => decision.action === "IMPORT") ?? null,
  };
}
