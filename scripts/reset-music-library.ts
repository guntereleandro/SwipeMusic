import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import type { Database } from "../lib/supabase/database.types";
import {
  REQUIRED_CONFIRMATION,
  isResetConfirmed,
  listAllStorageObjects,
  removeStorageObjectsInBatches,
  runResetStages,
  type ResetCounts,
  type ResetReport,
} from "./music-reset/library-reset";
import { requireLibrarySlug, resolveRequiredLibrary } from "../lib/libraries/library-scope";

const MUSIC_BUCKET = "music";
const COVERS_BUCKET = "covers";
const DB_PAGE_SIZE = 1_000;

loadEnv({ path: resolve(process.cwd(), ".env.local"), quiet: true });
loadEnv({ path: resolve(process.cwd(), ".env"), quiet: true });

function requiredEnvironment(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Variável obrigatória ausente: ${name}`);
  return value;
}

function message(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

async function songStoragePaths(client: SupabaseClient<Database>, libraryId: string) {
  const audio = new Set<string>();
  const covers = new Set<string>();
  for (let from = 0; ; from += DB_PAGE_SIZE) {
    const { data, error } = await client
      .from("songs")
      .select("audio_path,cover_path")
      .eq("library_id", libraryId)
      .order("id", { ascending: true })
      .range(from, from + DB_PAGE_SIZE - 1);
    if (error) throw error;
    for (const song of data) {
      if (song.audio_path) audio.add(song.audio_path);
      if (song.cover_path) covers.add(song.cover_path);
    }
    if (data.length < DB_PAGE_SIZE) break;
  }
  return { audio: [...audio], covers: [...covers] };
}

async function bucketObjects(client: SupabaseClient<Database>, bucket: string) {
  const storage = client.storage.from(bucket);
  return listAllStorageObjects(async (prefix, options) => {
    const { data, error } = await storage.list(prefix, { ...options, sortBy: { column: "name", order: "asc" } });
    if (error) throw error;
    return data;
  });
}

async function readCounts(
  client: SupabaseClient<Database>,
  libraryId: string,
  audioPaths: ReadonlySet<string>,
  coverPaths: ReadonlySet<string>,
): Promise<ResetCounts> {
  const [songsResult, ratingsResult, music, covers] = await Promise.all([
    client.from("songs").select("id", { count: "exact", head: true }).eq("library_id", libraryId),
    client.from("ratings").select("id, songs!inner(library_id)", { count: "exact", head: true }).eq("songs.library_id", libraryId),
    bucketObjects(client, MUSIC_BUCKET),
    bucketObjects(client, COVERS_BUCKET),
  ]);
  if (songsResult.error) throw songsResult.error;
  if (ratingsResult.error) throw ratingsResult.error;
  return {
    songs: songsResult.count ?? 0,
    ratings: ratingsResult.count ?? 0,
    musicObjects: music.filter((path) => audioPaths.has(path)).length,
    coverObjects: covers.length,
    importedCoverObjects: covers.filter((path) => coverPaths.has(path)).length,
  };
}

async function removePaths(client: SupabaseClient<Database>, bucket: string, paths: string[]) {
  return removeStorageObjectsInBatches(paths, async (batch) => {
    const { data, error } = await client.storage.from(bucket).remove(batch);
    if (error) throw error;
    if ((data?.length ?? 0) !== batch.length) {
      throw new Error(`API confirmou ${data?.length ?? 0} de ${batch.length} remoções no bucket ${bucket}`);
    }
  });
}

function reportFileName(date = new Date()) {
  return `library-reset-${date.toISOString().replace(/[:.]/g, "-")}.json`;
}

async function saveReport(report: ResetReport) {
  const directory = resolve(process.cwd(), "reports");
  await mkdir(directory, { recursive: true });
  const path = resolve(directory, reportFileName());
  await writeFile(path, JSON.stringify(report, null, 2), "utf8");
  return path;
}

async function librarySongIds(client: SupabaseClient<Database>, libraryId: string) {
  const ids: string[] = [];
  for (let from = 0; ; from += DB_PAGE_SIZE) {
    const { data, error } = await client.from("songs").select("id").eq("library_id", libraryId).order("id", { ascending: true }).range(from, from + DB_PAGE_SIZE - 1);
    if (error) throw error;
    ids.push(...data.map(({ id }) => id));
    if (data.length < DB_PAGE_SIZE) return ids;
  }
}

async function main() {
  const librarySlug = requireLibrarySlug(process.argv.slice(2));
  const client = createClient<Database>(
    requiredEnvironment("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnvironment("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
  const library = await resolveRequiredLibrary(librarySlug, async (slug) => {
    const { data, error } = await client.from("libraries").select("id, slug").eq("slug", slug).maybeSingle();
    if (error) throw error;
    return data;
  });

  console.log("Inventariando banco e Storage; nada será alterado nesta etapa...");
  const paths = await songStoragePaths(client, library.id);
  const otherPaths = await (async () => {
    const audio = new Set<string>(); const covers = new Set<string>();
    for (let from = 0; ; from += DB_PAGE_SIZE) {
      const { data, error } = await client.from("songs").select("audio_path,cover_path").neq("library_id", library.id).order("id", { ascending: true }).range(from, from + DB_PAGE_SIZE - 1);
      if (error) throw error;
      for (const song of data) { if (song.audio_path) audio.add(song.audio_path); if (song.cover_path) covers.add(song.cover_path); }
      if (data.length < DB_PAGE_SIZE) return { audio, covers };
    }
  })();
  const musicObjects = await bucketObjects(client, MUSIC_BUCKET);
  const coverObjects = await bucketObjects(client, COVERS_BUCKET);
  const audioSet = new Set(paths.audio);
  const coverSet = new Set(paths.covers);
  const removableMusic = musicObjects.filter((path) => audioSet.has(path) && !otherPaths.audio.has(path));
  const importedCovers = coverObjects.filter((path) => coverSet.has(path) && !otherPaths.covers.has(path));
  const songIds = await librarySongIds(client, library.id);
  const beforeResults = await Promise.all([
    client.from("songs").select("id", { count: "exact", head: true }).eq("library_id", library.id),
    client.from("ratings").select("id, songs!inner(library_id)", { count: "exact", head: true }).eq("songs.library_id", library.id),
  ]);
  if (beforeResults[0].error) throw beforeResults[0].error;
  if (beforeResults[1].error) throw beforeResults[1].error;
  const before: ResetCounts = {
    songs: beforeResults[0].count ?? 0,
    ratings: beforeResults[1].count ?? 0,
    musicObjects: removableMusic.length,
    coverObjects: coverObjects.length,
    importedCoverObjects: importedCovers.length,
  };

  console.log("\nResumo antes do reset");
  console.log(`songs: ${before.songs}`);
  console.log(`ratings: ${before.ratings}`);
  console.log(`objetos em music: ${before.musicObjects}`);
  console.log(`objetos em covers (total): ${before.coverObjects}`);
  console.log(`capas importadas em covers: ${before.importedCoverObjects}`);
  console.log(`objetos preservados em covers: ${coverObjects.length - importedCovers.length}`);

  console.log(`\nBiblioteca selecionada: ${library.slug}`);
  console.log("Será apagado: ratings e songs desta biblioteca e seus objetos não compartilhados.");
  console.log("Será preservado: todas as outras bibliotecas, objetos compartilhados, buckets, Auth e RLS.");
  console.log(`Digite exatamente ${REQUIRED_CONFIRMATION} para continuar.`);
  const prompt = createInterface({ input, output });
  let answer: string;
  try {
    answer = await prompt.question("> ");
  } finally {
    prompt.close();
  }
  if (!isResetConfirmed(answer)) {
    console.log("Reset cancelado. Nenhuma alteração foi feita.");
    return;
  }

  try {
    const report = await runResetStages({
      before,
      deleteRatings: async () => {
        for (let index = 0; index < songIds.length; index += 500) {
          const { error } = await client.from("ratings").delete().in("song_id", songIds.slice(index, index + 500));
          if (error) throw error;
        }
      },
      deleteSongs: async () => {
        const { error } = await client.from("songs").delete().eq("library_id", library.id);
        if (error) throw error;
      },
      removeMusic: () => removePaths(client, MUSIC_BUCKET, removableMusic),
      removeImportedCovers: () => removePaths(client, COVERS_BUCKET, importedCovers),
      readAfter: () => readCounts(client, library.id, new Set(removableMusic), new Set(importedCovers)),
    });
    const reportPath = await saveReport(report);
    console.log("\nReset da biblioteca concluído: songs=0, ratings=0 e objetos exclusivos=0 para o escopo selecionado.");
    console.log(`Relatório: ${reportPath}`);
  } catch (error) {
    const report = (error as Error & { report?: ResetReport }).report;
    const reportPath = report ? await saveReport(report) : null;
    console.error(`\nRESET NÃO CONCLUÍDO: ${message(error)}`);
    if (reportPath) console.error(`Relatório de falha: ${reportPath}`);
    process.exitCode = 1;
  }
}

main().catch((error: unknown) => {
  console.error(`Falha antes da confirmação: ${message(error)}`);
  process.exitCode = 1;
});
