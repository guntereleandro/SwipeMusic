import { basename, dirname, extname, join } from "node:path";
import type { AnalyzedFile, DuplicateGroup } from "../music-analysis/analyze-library";
import { chooseBestRepresentative } from "../music-import/import-plan";

export const QUARANTINE_DIRECTORY = "_duplicatas_removidas";

export type CleanupAction = "KEEP" | "MOVE_DUPLICATE" | "KEEP_POSSIBLE" | "KEEP_REVIEW" | "KEEP_NOT_IN_SUPABASE";

export type RemoteSong = { id: string; file_hash: string | null };

export type CleanupDecision = {
  original_path: string;
  file_hash: string;
  classification: AnalyzedFile["duplicate_status"];
  action: CleanupAction;
  reason: string;
  song_id: string | null;
  library_slug: string;
  kept_representative: string | null;
  quarantine_destination: string | null;
  move_status?: "MOVED" | "FAILED" | "NOT_RUN";
  error?: string;
};

export type CleanupPlan = {
  library_slug: string;
  decisions: CleanupDecision[];
  summary: {
    files_found: number;
    matched_to_supabase: number;
    safe_duplicates: number;
    ambiguous_preserved: number;
    not_in_supabase: number;
    kept: number;
    to_quarantine: number;
  };
};

export async function listRemoteSongs(fetchPage: (from: number, to: number) => Promise<RemoteSong[]>, pageSize = 1_000) {
  const songs: RemoteSong[] = [];
  for (let from = 0; ; from += pageSize) {
    const page = await fetchPage(from, from + pageSize - 1);
    songs.push(...page);
    if (page.length < pageSize) return songs;
  }
}

export function createCleanupPlan(files: AnalyzedFile[], duplicateGroups: DuplicateGroup[], remoteSongs: RemoteSong[], librarySlug: string): CleanupPlan {
  const remoteByHash = new Map(remoteSongs.filter((song) => song.file_hash).map((song) => [song.file_hash!, song]));
  const byPath = new Map(files.map((file) => [file.relative_path, file]));
  const decisions = new Map<string, CleanupDecision>();

  for (const file of files) {
    const remote = remoteByHash.get(file.file_hash);
    const review = file.metadata_status === "NEEDS_REVIEW";
    const possible = file.duplicate_status === "POSSIBLE_DUPLICATE";
    decisions.set(file.relative_path, {
      original_path: file.relative_path,
      file_hash: file.file_hash,
      classification: file.duplicate_status,
      action: review ? "KEEP_REVIEW" : possible ? "KEEP_POSSIBLE" : remote ? "KEEP" : "KEEP_NOT_IN_SUPABASE",
      reason: review ? "metadata_needs_review" : possible ? "possible_duplicate_is_never_moved" : remote ? "exact_hash_exists_in_selected_library" : "hash_not_found_in_selected_library",
      song_id: remote?.id ?? null,
      library_slug: librarySlug,
      kept_representative: remote ? file.relative_path : null,
      quarantine_destination: null,
    });
  }

  const byHash = new Map<string, AnalyzedFile[]>();
  for (const file of files) {
    if (!file.file_hash) continue;
    const group = byHash.get(file.file_hash) ?? [];
    group.push(file);
    byHash.set(file.file_hash, group);
  }

  for (const [hash, copies] of byHash) {
    const remote = remoteByHash.get(hash);
    if (!remote || copies.length < 2) continue;
    const representative = chooseBestRepresentative(copies).representative;
    for (const file of copies) {
      const decision = decisions.get(file.relative_path)!;
      decision.song_id = remote.id;
      decision.kept_representative = representative.relative_path;
      if (file !== representative && file.metadata_status !== "NEEDS_REVIEW") {
        decision.action = "MOVE_DUPLICATE";
        decision.reason = "exact_sha256_duplicate_of_remote_song";
      }
    }
  }

  for (const group of duplicateGroups.filter((item) => item.duplicate_status === "LIKELY_DUPLICATE")) {
    const members = group.files.map((path) => byPath.get(path)).filter((file): file is AnalyzedFile => Boolean(file));
    const remoteHashes = [...new Set(members.map((file) => file.file_hash).filter((hash) => remoteByHash.has(hash)))];
    if (remoteHashes.length !== 1) {
      for (const file of members) {
        const decision = decisions.get(file.relative_path)!;
        if (decision.action !== "KEEP_REVIEW" && decision.action !== "KEEP_POSSIBLE") {
          decision.reason = "ambiguous_likely_without_unique_remote_representative";
        }
      }
      continue;
    }
    const remoteHash = remoteHashes[0];
    const remote = remoteByHash.get(remoteHash)!;
    const representative = chooseBestRepresentative(members.filter((file) => file.file_hash === remoteHash)).representative;
    for (const file of members) {
      const decision = decisions.get(file.relative_path)!;
      if (file.file_hash === remoteHash) {
        decision.song_id = remote.id;
        decision.kept_representative = representative.relative_path;
      } else if (file.metadata_status !== "NEEDS_REVIEW" && !remoteByHash.has(file.file_hash)) {
        decision.action = "MOVE_DUPLICATE";
        decision.reason = "unambiguous_likely_duplicate_with_remote_representative";
        decision.song_id = remote.id;
        decision.kept_representative = representative.relative_path;
      }
    }
  }

  const result = [...decisions.values()].sort((left, right) => left.original_path.localeCompare(right.original_path, "pt-BR"));
  for (const decision of result) {
    if (decision.action === "MOVE_DUPLICATE") decision.quarantine_destination = join(QUARANTINE_DIRECTORY, decision.original_path).replaceAll("\\", "/");
  }
  const matched = result.filter((item) => item.song_id !== null).length;
  return {
    library_slug: librarySlug,
    decisions: result,
    summary: {
      files_found: result.length,
      matched_to_supabase: matched,
      safe_duplicates: result.filter((item) => item.action === "MOVE_DUPLICATE").length,
      ambiguous_preserved: result.filter((item) => item.action === "KEEP_POSSIBLE" || item.action === "KEEP_REVIEW" || item.reason.startsWith("ambiguous_likely")).length,
      not_in_supabase: result.filter((item) => item.action === "KEEP_NOT_IN_SUPABASE").length,
      kept: result.filter((item) => item.action !== "MOVE_DUPLICATE").length,
      to_quarantine: result.filter((item) => item.action === "MOVE_DUPLICATE").length,
    },
  };
}

export async function chooseAvailableDestination(relativeDestination: string, exists: (path: string) => Promise<boolean>) {
  if (!(await exists(relativeDestination))) return relativeDestination;
  const directory = dirname(relativeDestination);
  const extension = extname(relativeDestination);
  const stem = basename(relativeDestination, extension);
  for (let suffix = 1; suffix < 100_000; suffix += 1) {
    const candidate = join(directory, `${stem} (${suffix})${extension}`).replaceAll("\\", "/");
    if (!(await exists(candidate))) return candidate;
  }
  throw new Error(`Não foi possível gerar destino livre para ${relativeDestination}`);
}

export async function applyCleanupPlan(plan: CleanupPlan, move: (decision: CleanupDecision) => Promise<void>) {
  const errors: Array<{ path: string; message: string }> = [];
  for (const decision of plan.decisions.filter((item) => item.action === "MOVE_DUPLICATE")) {
    try {
      await move(decision);
      decision.move_status = "MOVED";
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      decision.move_status = "FAILED";
      decision.error = message;
      errors.push({ path: decision.original_path, message });
      break;
    }
  }
  for (const decision of plan.decisions.filter((item) => item.action === "MOVE_DUPLICATE" && !item.move_status)) decision.move_status = "NOT_RUN";
  return { completed: errors.length === 0, errors };
}
