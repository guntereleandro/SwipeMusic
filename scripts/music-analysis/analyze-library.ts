import { createHash } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import { basename, dirname, extname, relative, resolve, sep } from "node:path";
import { parseFile } from "music-metadata";
import { compareTracks, type DuplicateStatus } from "./classification";
import {
  isSuspiciousMetadataValue,
  resolveMetadata,
  type MetadataConfidence,
  type MetadataSource,
  type MetadataStatus,
} from "./metadata-resolution";
import { normalizeArtist, normalizeTitle } from "./normalization";

type MetadataIssue =
  | "NO_TITLE_METADATA"
  | "NO_ARTIST_METADATA"
  | "NO_ALBUM_METADATA"
  | "NO_COVER"
  | "SUSPICIOUS_METADATA";

export type AnalyzedFile = {
  original_filename: string;
  source_folder: string | null;
  relative_path: string;
  id3_title: string | null;
  id3_artist: string | null;
  id3_album: string | null;
  resolved_title: string | null;
  resolved_artist: string | null;
  resolved_album: string | null;
  title_source: MetadataSource;
  artist_source: MetadataSource;
  album_source: MetadataSource;
  title_confidence: MetadataConfidence;
  artist_confidence: MetadataConfidence;
  metadata_status: MetadataStatus;
  duration_seconds: number | null;
  bitrate: number | null;
  sample_rate: number | null;
  embedded_cover_bytes: number;
  file_hash: string;
  file_size: number;
  has_cover: boolean;
  normalized_title: string;
  normalized_artist: string;
  duplicate_status: DuplicateStatus;
  duplicate_group: number | null;
  duplicate_confidence: number;
  review_reason: string;
  metadata_issues: MetadataIssue[];
  suspicious_fields: string[];
  analysis_error?: string;
};

export type DuplicateGroup = {
  duplicate_group: number;
  duplicate_status: Exclude<DuplicateStatus, "UNIQUE">;
  confidence: number;
  hash?: string;
  quantity: number;
  wasted_bytes?: number;
  files: string[];
  reasons: string[];
};

export type Candidate = {
  left: number;
  right: number;
  duplicateStatus: Extract<DuplicateStatus, "LIKELY_DUPLICATE" | "POSSIBLE_DUPLICATE">;
  confidence: number;
  reasons: string[];
};

export async function findMp3Files(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const entryPath = resolve(directory, entry.name);
      if (entry.isDirectory()) return findMp3Files(entryPath);
      return entry.isFile() && extname(entry.name).toLowerCase() === ".mp3" ? [entryPath] : [];
    }),
  );
  return nested.flat().sort((left, right) => left.localeCompare(right, "pt-BR"));
}

export async function calculateSha256(filePath: string) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(filePath)) hash.update(chunk);
  return hash.digest("hex");
}

export function relativeFilePath(root: string, filePath: string) {
  return relative(root, filePath).split(sep).join("/");
}

export function getSourceFolder(root: string, filePath: string) {
  const folder = relative(root, dirname(filePath)).split(sep).join("/");
  return folder || null;
}

function candidateKey(left: number, right: number) {
  return left < right ? `${left}:${right}` : `${right}:${left}`;
}

export function buildCompleteLinkageGroups(
  candidates: Candidate[],
  status: Candidate["duplicateStatus"],
  unavailable: Set<number>,
) {
  const relevant = candidates
    .filter((candidate) => candidate.duplicateStatus === status)
    .sort((left, right) => right.confidence - left.confidence);
  const compatible = new Set(relevant.map((candidate) => candidateKey(candidate.left, candidate.right)));
  const groups: number[][] = [];
  const assigned = new Map<number, number>();

  const canJoin = (group: number[], candidate: number) =>
    group.every((member) => compatible.has(candidateKey(member, candidate)));

  for (const edge of relevant) {
    if (unavailable.has(edge.left) || unavailable.has(edge.right)) continue;
    const leftGroup = assigned.get(edge.left);
    const rightGroup = assigned.get(edge.right);

    if (leftGroup === undefined && rightGroup === undefined) {
      const groupIndex = groups.push([edge.left, edge.right]) - 1;
      assigned.set(edge.left, groupIndex);
      assigned.set(edge.right, groupIndex);
      continue;
    }

    if (leftGroup !== undefined && rightGroup === undefined && canJoin(groups[leftGroup], edge.right)) {
      groups[leftGroup].push(edge.right);
      assigned.set(edge.right, leftGroup);
      continue;
    }

    if (rightGroup !== undefined && leftGroup === undefined && canJoin(groups[rightGroup], edge.left)) {
      groups[rightGroup].push(edge.left);
      assigned.set(edge.left, rightGroup);
      continue;
    }

    if (leftGroup !== undefined && rightGroup !== undefined && leftGroup !== rightGroup) {
      const leftMembers = groups[leftGroup];
      const rightMembers = groups[rightGroup];
      const completeLink = leftMembers.every((left) =>
        rightMembers.every((right) => compatible.has(candidateKey(left, right))),
      );
      if (completeLink) {
        leftMembers.push(...rightMembers);
        rightMembers.forEach((member) => assigned.set(member, leftGroup));
        groups[rightGroup] = [];
      }
    }
  }

  return groups.filter((group) => group.length >= 2);
}

function escapeCsv(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n;]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function toCsv(files: AnalyzedFile[]) {
  const columns: Array<keyof AnalyzedFile> = [
    "original_filename", "source_folder", "relative_path",
    "id3_title", "id3_artist", "id3_album",
    "resolved_title", "resolved_artist", "resolved_album",
    "title_source", "artist_source", "album_source",
    "title_confidence", "artist_confidence", "metadata_status",
    "duration_seconds", "bitrate", "sample_rate", "file_hash", "file_size", "has_cover",
    "normalized_title", "normalized_artist",
    "duplicate_status", "duplicate_group", "duplicate_confidence", "review_reason",
  ];
  const rows = files.map((file) => columns.map((column) => escapeCsv(file[column])).join(","));
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

export async function analyzeLibrary(
  root: string,
  options: { writeReports?: boolean; printSummary?: boolean } = {},
) {
  const { writeReports = true, printSummary = true } = options;
  const paths = await findMp3Files(root);
  const files: AnalyzedFile[] = [];

  for (const [index, filePath] of paths.entries()) {
    const relativePath = relativeFilePath(root, filePath);
    const sourceFolder = getSourceFolder(root, filePath);
    console.log(`[${index + 1}/${paths.length}] ${relativePath}`);

    let id3Title: string | null = null;
    let id3Artist: string | null = null;
    let id3Album: string | null = null;
    let duration: number | null = null;
    let bitrate: number | null = null;
    let sampleRate: number | null = null;
    let embeddedCoverBytes = 0;
    let hasCover = false;
    let fileHash = "";
    let fileSize = 0;
    let analysisError: string | undefined;

    try {
      fileSize = (await stat(filePath)).size;
      fileHash = await calculateSha256(filePath);
      const metadata = await parseFile(filePath, { duration: true });
      id3Title = metadata.common.title?.trim() || null;
      id3Artist = metadata.common.artist?.trim() || null;
      id3Album = metadata.common.album?.trim() || null;
      duration = Number.isFinite(metadata.format.duration) ? Math.round(metadata.format.duration!) : null;
      bitrate = Number.isFinite(metadata.format.bitrate) ? Math.round(metadata.format.bitrate!) : null;
      sampleRate = Number.isFinite(metadata.format.sampleRate) ? metadata.format.sampleRate! : null;
      hasCover = Boolean(metadata.common.picture?.length);
      embeddedCoverBytes = metadata.common.picture?.[0]?.data.byteLength ?? 0;
    } catch (error) {
      analysisError = error instanceof Error ? error.message : String(error);
    }

    const resolved = resolveMetadata({
      fileName: basename(filePath),
      sourceFolder,
      id3Title,
      id3Artist,
      id3Album,
    });
    const metadataIssues: MetadataIssue[] = [];
    if (!id3Title) metadataIssues.push("NO_TITLE_METADATA");
    if (!id3Artist) metadataIssues.push("NO_ARTIST_METADATA");
    if (!id3Album) metadataIssues.push("NO_ALBUM_METADATA");
    if (!hasCover) metadataIssues.push("NO_COVER");
    if (resolved.suspiciousFields.length > 0) metadataIssues.push("SUSPICIOUS_METADATA");

    files.push({
      original_filename: basename(filePath),
      source_folder: sourceFolder,
      relative_path: relativePath,
      id3_title: id3Title,
      id3_artist: id3Artist,
      id3_album: id3Album,
      resolved_title: resolved.resolvedTitle,
      resolved_artist: resolved.resolvedArtist,
      resolved_album: resolved.resolvedAlbum,
      title_source: resolved.titleSource,
      artist_source: resolved.artistSource,
      album_source: resolved.albumSource,
      title_confidence: resolved.titleConfidence,
      artist_confidence: resolved.artistConfidence,
      metadata_status: analysisError ? "NEEDS_REVIEW" : resolved.metadataStatus,
      duration_seconds: duration,
      bitrate,
      sample_rate: sampleRate,
      embedded_cover_bytes: embeddedCoverBytes,
      file_hash: fileHash,
      file_size: fileSize,
      has_cover: hasCover,
      normalized_title: resolved.resolvedTitle ? normalizeTitle(resolved.resolvedTitle) : "",
      normalized_artist: resolved.resolvedArtist ? normalizeArtist(resolved.resolvedArtist) : "",
      duplicate_status: "UNIQUE",
      duplicate_group: null,
      duplicate_confidence: 0,
      review_reason: analysisError ? "metadata_read_error" : resolved.suspiciousFields.join("; "),
      metadata_issues: metadataIssues,
      suspicious_fields: resolved.suspiciousFields,
      analysis_error: analysisError,
    });
  }

  const duplicateGroups: DuplicateGroup[] = [];
  const byHash = new Map<string, number[]>();
  const withoutHash: number[] = [];
  files.forEach((file, index) => {
    if (!file.file_hash) return void withoutHash.push(index);
    const indexes = byHash.get(file.file_hash) ?? [];
    indexes.push(index);
    byHash.set(file.file_hash, indexes);
  });

  let nextGroup = 1;
  for (const [hash, indexes] of byHash) {
    if (indexes.length < 2) continue;
    const group = nextGroup++;
    const wastedBytes = files[indexes[0]].file_size * (indexes.length - 1);
    indexes.forEach((index) => Object.assign(files[index], {
      duplicate_status: "EXACT_DUPLICATE" as const,
      duplicate_group: group,
      duplicate_confidence: 1,
    }));
    duplicateGroups.push({
      duplicate_group: group,
      duplicate_status: "EXACT_DUPLICATE",
      confidence: 1,
      hash,
      quantity: indexes.length,
      wasted_bytes: wastedBytes,
      files: indexes.map((index) => files[index].relative_path),
      reasons: ["identical_sha256"],
    });
  }

  const representatives = [...[...byHash.values()].map((indexes) => indexes[0]), ...withoutHash];
  const candidates: Candidate[] = [];
  for (let left = 0; left < representatives.length; left += 1) {
    for (let right = left + 1; right < representatives.length; right += 1) {
      const leftFile = files[representatives[left]];
      const rightFile = files[representatives[right]];
      const comparison = compareTracks(
        {
          normalizedTitle: leftFile.normalized_title,
          normalizedArtist: leftFile.normalized_artist,
          durationSeconds: leftFile.duration_seconds,
          titleTrusted: leftFile.title_confidence !== "LOW",
          artistTrusted: leftFile.artist_confidence !== "LOW",
        },
        {
          normalizedTitle: rightFile.normalized_title,
          normalizedArtist: rightFile.normalized_artist,
          durationSeconds: rightFile.duration_seconds,
          titleTrusted: rightFile.title_confidence !== "LOW",
          artistTrusted: rightFile.artist_confidence !== "LOW",
        },
      );
      if (comparison.duplicateStatus) {
        candidates.push({
          left,
          right,
          duplicateStatus: comparison.duplicateStatus,
          confidence: comparison.confidence,
          reasons: comparison.reasons,
        });
      }
    }
  }

  const assigned = new Set<number>();
  for (const status of ["LIKELY_DUPLICATE", "POSSIBLE_DUPLICATE"] as const) {
    const groups = buildCompleteLinkageGroups(candidates, status, assigned);
    for (const memberIndexes of groups) {
      memberIndexes.forEach((index) => assigned.add(index));
      const matchingEdges = candidates.filter((candidate) =>
        candidate.duplicateStatus === status &&
        memberIndexes.includes(candidate.left) && memberIndexes.includes(candidate.right),
      );
      const group = nextGroup++;
      const confidence = Math.min(...matchingEdges.map((edge) => edge.confidence));
      const reasons = [...new Set(matchingEdges.flatMap((edge) => edge.reasons))];
      const fileIndexes = memberIndexes.map((index) => representatives[index]);

      fileIndexes.forEach((index) => {
        if (files[index].duplicate_status === "UNIQUE") {
          files[index].duplicate_status = status;
          files[index].duplicate_group = group;
          files[index].duplicate_confidence = confidence;
        }
      });
      duplicateGroups.push({
        duplicate_group: group,
        duplicate_status: status,
        confidence,
        quantity: fileIndexes.length,
        files: fileIndexes.map((index) => files[index].relative_path),
        reasons,
      });
    }
  }

  const countDuplicate = (status: DuplicateStatus) =>
    files.filter((file) => file.duplicate_status === status).length;
  const totalBytes = files.reduce((total, file) => total + file.file_size, 0);
  const recoverableBytes = duplicateGroups
    .filter((group) => group.duplicate_status === "EXACT_DUPLICATE")
    .reduce((total, group) => total + (group.wasted_bytes ?? 0), 0);
  const largestDuplicateGroup = duplicateGroups.reduce(
    (largest, group) => Math.max(largest, group.quantity), 0,
  );
  const summary = {
    files: files.length,
    total_bytes: totalBytes,
    trusted_id3: files.filter((file) =>
      !isSuspiciousMetadataValue(file.id3_title) && !isSuspiciousMetadataValue(file.id3_artist),
    ).length,
    suspicious_id3: files.filter((file) => file.suspicious_fields.length > 0).length,
    titles_inferred_from_filename: files.filter((file) => file.title_source === "FILENAME").length,
    artists_inferred_from_filename: files.filter((file) => file.artist_source === "FILENAME").length,
    artists_inferred_from_folder: files.filter((file) => file.artist_source === "FOLDER").length,
    unresolved_metadata: files.filter((file) => file.metadata_status === "NEEDS_REVIEW").length,
    exact_duplicates: duplicateGroups
      .filter((group) => group.duplicate_status === "EXACT_DUPLICATE")
      .reduce((total, group) => total + group.quantity - 1, 0),
    likely_duplicates: countDuplicate("LIKELY_DUPLICATE"),
    possible_duplicates: countDuplicate("POSSIBLE_DUPLICATE"),
    unique: countDuplicate("UNIQUE"),
    largest_duplicate_group: largestDuplicateGroup,
    potentially_recoverable_bytes: recoverableBytes,
  };

  const finishedAt = new Date();
  const reportsDirectory = resolve(process.cwd(), "reports");
  const baseName = `library-analysis-v2-${timestamp(finishedAt)}`;
  const jsonPath = resolve(reportsDirectory, `${baseName}.json`);
  const csvPath = resolve(reportsDirectory, `${baseName}.csv`);
  if (writeReports) {
    await mkdir(reportsDirectory, { recursive: true });
    await Promise.all([
      writeFile(jsonPath, JSON.stringify({ version: 2, finished_at: finishedAt.toISOString(), summary, duplicate_groups: duplicateGroups, files }, null, 2), "utf8"),
      writeFile(csvPath, toCsv(files), "utf8"),
    ]);
  }

  if (printSummary) {
    console.log("\n===================================");
    console.log("SWIPEMUSIC — AUDITORIA V2");
    console.log("===================================\n");
    console.log(`Arquivos:                       ${summary.files.toLocaleString("pt-BR")}`);
    console.log(`Tamanho total:                  ${formatBytes(summary.total_bytes)}`);
    console.log(`ID3 confiável:                  ${summary.trusted_id3.toLocaleString("pt-BR")}`);
    console.log(`ID3 suspeito:                   ${summary.suspicious_id3.toLocaleString("pt-BR")}`);
    console.log(`Títulos inferidos do filename:  ${summary.titles_inferred_from_filename.toLocaleString("pt-BR")}`);
    console.log(`Artistas inferidos do filename: ${summary.artists_inferred_from_filename.toLocaleString("pt-BR")}`);
    console.log(`Artistas inferidos da pasta:    ${summary.artists_inferred_from_folder.toLocaleString("pt-BR")}`);
    console.log(`Metadados não resolvidos:       ${summary.unresolved_metadata.toLocaleString("pt-BR")}`);
    console.log(`Duplicatas exatas:              ${summary.exact_duplicates.toLocaleString("pt-BR")}`);
    console.log(`Prováveis:                      ${summary.likely_duplicates.toLocaleString("pt-BR")}`);
    console.log(`Possíveis:                      ${summary.possible_duplicates.toLocaleString("pt-BR")}`);
    console.log(`Maior grupo de duplicatas:      ${summary.largest_duplicate_group.toLocaleString("pt-BR")}`);
    console.log(`Espaço economizável (exatas):   ${formatBytes(summary.potentially_recoverable_bytes)}`);
    if (duplicateGroups.some((group) => group.duplicate_status === "LIKELY_DUPLICATE" && group.quantity > 10)) {
      console.warn("WARNING: existe grupo LIKELY_DUPLICATE com mais de 10 arquivos; revise o JSON.");
    }
    console.log("\nNenhum arquivo da biblioteca foi alterado.");
    if (writeReports) {
      console.log(`JSON: ${jsonPath}`);
      console.log(`CSV:  ${csvPath}`);
    }
  }

  return { summary, duplicateGroups, files, jsonPath, csvPath };
}
