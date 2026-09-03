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

async function tableCount(client: SupabaseClient<Database>, table: "songs" | "ratings") {
  const { count, error } = await client.from(table).select("id", { count: "exact", head: true });
  if (error) throw error;
  return count ?? 0;
}

async function songStoragePaths(client: SupabaseClient<Database>) {
  const audio = new Set<string>();
  const covers = new Set<string>();
  for (let from = 0; ; from += DB_PAGE_SIZE) {
    const { data, error } = await client
      .from("songs")
      .select("audio_path,cover_path")
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
  importedCoverPaths: ReadonlySet<string>,
): Promise<ResetCounts> {
  const [songs, ratings, music, covers] = await Promise.all([
    tableCount(client, "songs"),
    tableCount(client, "ratings"),
    bucketObjects(client, MUSIC_BUCKET),
    bucketObjects(client, COVERS_BUCKET),
  ]);
  return {
    songs,
    ratings,
    musicObjects: music.length,
    coverObjects: covers.length,
    importedCoverObjects: covers.filter((path) => importedCoverPaths.has(path)).length,
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

async function deleteAllRows(client: SupabaseClient<Database>, table: "ratings" | "songs") {
  const { error } = await client.from(table).delete().not("id", "is", null);
  if (error) throw error;
  const remaining = await tableCount(client, table);
  if (remaining !== 0) throw new Error(`${remaining} registros permaneceram em ${table}`);
}

async function main() {
  const client = createClient<Database>(
    requiredEnvironment("NEXT_PUBLIC_SUPABASE_URL"),
    requiredEnvironment("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  console.log("Inventariando banco e Storage; nada será alterado nesta etapa...");
  const paths = await songStoragePaths(client);
  const musicObjects = await bucketObjects(client, MUSIC_BUCKET);
  const coverObjects = await bucketObjects(client, COVERS_BUCKET);
  const audioSet = new Set(paths.audio);
  const coverSet = new Set(paths.covers);
  const unrelatedMusic = musicObjects.filter((path) => !audioSet.has(path));
  const importedCovers = coverObjects.filter((path) => coverSet.has(path));
  const preservedCovers = coverObjects.filter((path) => !coverSet.has(path));
  const before: ResetCounts = {
    songs: await tableCount(client, "songs"),
    ratings: await tableCount(client, "ratings"),
    musicObjects: musicObjects.length,
    coverObjects: coverObjects.length,
    importedCoverObjects: importedCovers.length,
  };

  console.log("\nResumo antes do reset");
  console.log(`songs: ${before.songs}`);
  console.log(`ratings: ${before.ratings}`);
  console.log(`objetos em music: ${before.musicObjects}`);
  console.log(`objetos em covers (total): ${before.coverObjects}`);
  console.log(`capas importadas em covers: ${before.importedCoverObjects}`);
  console.log(`objetos preservados em covers: ${preservedCovers.length}`);

  if (unrelatedMusic.length) {
    console.error("\nABORTADO: o bucket music contém objetos não referenciados por songs.");
    console.error("Eles podem ser arquivos de teste ou estrutura fixa e não serão apagados sem classificação:");
    for (const path of unrelatedMusic) console.error(`- ${path}`);
    process.exitCode = 1;
    return;
  }

  console.log("\nSerá apagado: ratings, songs, todos os objetos vinculados do bucket music e capas referenciadas por songs.");
  console.log("Será preservado: demais objetos de covers, buckets, schema, usuários, Auth, RLS e arquivos locais.");
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
      deleteRatings: () => deleteAllRows(client, "ratings"),
      deleteSongs: () => deleteAllRows(client, "songs"),
      removeMusic: () => removePaths(client, MUSIC_BUCKET, musicObjects),
      removeImportedCovers: () => removePaths(client, COVERS_BUCKET, importedCovers),
      readAfter: () => readCounts(client, coverSet),
    });
    const reportPath = await saveReport(report);
    console.log("\nReset concluído e verificado: songs=0, ratings=0, music objects=0, covers importadas=0.");
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
