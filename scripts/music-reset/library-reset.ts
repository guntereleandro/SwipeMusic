export const REQUIRED_CONFIRMATION = "APAGAR BIBLIOTECA";
export const STORAGE_PAGE_SIZE = 100;
export const STORAGE_REMOVE_BATCH_SIZE = 100;

export type StorageEntry = {
  name: string;
  id?: string | null;
  metadata?: unknown | null;
};

export type StorageLister = (
  prefix: string,
  options: { limit: number; offset: number },
) => Promise<StorageEntry[]>;

export type ResetCounts = {
  songs: number;
  ratings: number;
  musicObjects: number;
  coverObjects: number;
  importedCoverObjects: number;
};

export type ResetReport = {
  started_at: string;
  finished_at: string;
  status: "completed" | "failed";
  counts_before: ResetCounts;
  counts_after: ResetCounts | null;
  removed: { ratings: number; songs: number; music_objects: number; imported_cover_objects: number };
  errors: Array<{ stage: string; message: string }>;
};

export function isResetConfirmed(answer: string) {
  return answer === REQUIRED_CONFIRMATION;
}

function joinStoragePath(prefix: string, name: string) {
  return prefix ? `${prefix}/${name}` : name;
}

function isFolder(entry: StorageEntry) {
  return entry.id == null && entry.metadata == null;
}

export async function listAllStorageObjects(
  list: StorageLister,
  prefix = "",
  pageSize = STORAGE_PAGE_SIZE,
): Promise<string[]> {
  const objects: string[] = [];
  for (let offset = 0; ; offset += pageSize) {
    const page = await list(prefix, { limit: pageSize, offset });
    for (const entry of page) {
      const path = joinStoragePath(prefix, entry.name);
      if (isFolder(entry)) objects.push(...(await listAllStorageObjects(list, path, pageSize)));
      else objects.push(path);
    }
    if (page.length < pageSize) break;
  }
  return objects;
}

export async function removeStorageObjectsInBatches(
  paths: string[],
  remove: (batch: string[]) => Promise<void>,
  batchSize = STORAGE_REMOVE_BATCH_SIZE,
) {
  let removed = 0;
  for (let index = 0; index < paths.length; index += batchSize) {
    const batch = paths.slice(index, index + batchSize);
    await remove(batch);
    removed += batch.length;
  }
  return removed;
}

export function createResetReport(input: Omit<ResetReport, "finished_at">, now = new Date()): ResetReport {
  return { ...input, finished_at: now.toISOString() };
}

export function assertEmptyFinalState(counts: ResetCounts) {
  const resetTargets = {
    songs: counts.songs,
    ratings: counts.ratings,
    musicObjects: counts.musicObjects,
    importedCoverObjects: counts.importedCoverObjects,
  };
  const remaining = Object.entries(resetTargets).filter(([, count]) => count !== 0);
  if (remaining.length) {
    throw new Error(`Estado final não está vazio: ${remaining.map(([name, count]) => `${name}=${count}`).join(", ")}`);
  }
}

export async function runResetStages(options: {
  before: ResetCounts;
  deleteRatings: () => Promise<void>;
  deleteSongs: () => Promise<void>;
  removeMusic: () => Promise<number>;
  removeImportedCovers: () => Promise<number>;
  readAfter: () => Promise<ResetCounts>;
  now?: () => Date;
}) {
  const now = options.now ?? (() => new Date());
  const startedAt = now().toISOString();
  const removed = { ratings: 0, songs: 0, music_objects: 0, imported_cover_objects: 0 };
  let stage = "ratings";
  let after: ResetCounts | null = null;

  try {
    await options.deleteRatings();
    removed.ratings = options.before.ratings;
    stage = "songs";
    await options.deleteSongs();
    removed.songs = options.before.songs;
    stage = "music storage";
    removed.music_objects = await options.removeMusic();
    stage = "covers storage";
    removed.imported_cover_objects = await options.removeImportedCovers();
    stage = "verificação final";
    after = await options.readAfter();
    assertEmptyFinalState(after);
    return createResetReport({
      started_at: startedAt,
      status: "completed",
      counts_before: options.before,
      counts_after: after,
      removed,
      errors: [],
    }, now());
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw Object.assign(new Error(`Etapa "${stage}" falhou: ${message}`), {
      report: createResetReport({
        started_at: startedAt,
        status: "failed",
        counts_before: options.before,
        counts_after: after,
        removed,
        errors: [{ stage, message }],
      }, now()),
    });
  }
}
