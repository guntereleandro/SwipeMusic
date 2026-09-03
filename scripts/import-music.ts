import { readFile, stat, writeFile } from "node:fs/promises";
import { basename, extname, resolve } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import { parseFile, type IPicture } from "music-metadata";
import type { Database } from "../lib/supabase/database.types";
import { analyzeLibrary } from "./music-analysis/analyze-library";
import { buildImportPlan, type ImportPlan } from "./music-import/import-plan";
import { createResumePlan, type ResumePlan } from "./music-import/resume-plan";
import { listAllStorageObjects } from "./music-reset/library-reset";

const MUSIC_BUCKET = "music";
const COVERS_BUCKET = "covers";

loadEnv({ path: resolve(process.cwd(), ".env.local"), quiet: true });
loadEnv({ path: resolve(process.cwd(), ".env"), quiet: true });

function requireEnvironment(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Variável obrigatória ausente: ${name}`);
  return value;
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function coverExtension(picture: IPicture) {
  const format = picture.format.toLowerCase();
  if (format === "image/jpeg" || format === "image/jpg") return "jpg";
  if (format === "image/png") return "png";
  if (format === "image/webp") return "webp";
  if (format === "image/gif") return "gif";
  return null;
}

function coverContentType(extension: string) {
  return extension === "jpg" ? "image/jpeg" : `image/${extension}`;
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

async function confirmImport(plan: ImportPlan, resumePlan: ResumePlan) {
  console.log("\nATENÇÃO: esta etapa fará uploads e inserts reais.");
  console.log(`Já importadas: ${resumePlan.alreadyImported.length.toLocaleString("pt-BR")}`);
  console.log(`Ainda faltando: ${resumePlan.missing.length.toLocaleString("pt-BR")}`);
  console.log(`Uploads de áudio necessários: ${resumePlan.uploadsRequired.toLocaleString("pt-BR")}`);
  console.log("Digite IMPORTAR para continuar.");

  const prompt = createInterface({ input, output });
  try {
    return (await prompt.question("> ")).trim() === "IMPORTAR";
  } finally {
    prompt.close();
  }
}

async function readRemoteState(supabase: ReturnType<typeof createServiceClient>) {
  const hashes = new Set<string>();
  for (let from = 0; ; from += 1_000) {
    const { data, error } = await supabase.from("songs").select("file_hash").range(from, from + 999);
    if (error) throw error;
    for (const song of data) if (song.file_hash) hashes.add(song.file_hash);
    if (data.length < 1_000) break;
  }
  const music = supabase.storage.from(MUSIC_BUCKET);
  const covers = supabase.storage.from(COVERS_BUCKET);
  const listBucket = (storage: typeof music) => listAllStorageObjects(async (prefix, options) => {
    const { data, error } = await storage.list(prefix, { ...options, sortBy: { column: "name", order: "asc" } });
    if (error) throw error;
    return data;
  });
  const [musicObjects, coverObjects] = await Promise.all([listBucket(music), listBucket(covers)]);
  return { hashes, musicObjects: new Set(musicObjects), coverObjects: new Set(coverObjects) };
}

function createServiceClient() {
  return createClient<Database>(
    requireEnvironment("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnvironment("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

async function buildResumePlan(plan: ImportPlan, supabase: ReturnType<typeof createServiceClient>) {
  const remote = await readRemoteState(supabase);
  return { resumePlan: createResumePlan(plan.to_import, remote.hashes, remote.musicObjects, remote.coverObjects), remote };
}

function printResumePlan(plan: ImportPlan, resumePlan: ResumePlan) {
  console.log("\n===================================");
  console.log("SWIPEMUSIC — PLANO DE RETOMADA");
  console.log("===================================\n");
  console.log(`Arquivos analisados:               ${plan.summary.files_found.toLocaleString("pt-BR")}`);
  console.log(`Músicas previstas no plano local:  ${plan.summary.files_to_import.toLocaleString("pt-BR")}`);
  console.log(`Já importadas no Supabase:         ${resumePlan.alreadyImported.length.toLocaleString("pt-BR")}`);
  console.log(`Ainda faltando:                    ${resumePlan.missing.length.toLocaleString("pt-BR")}`);
  console.log(`Uploads de áudio necessários:      ${resumePlan.uploadsRequired.toLocaleString("pt-BR")}`);
  console.log(`Áudios órfãos que serão reusados:  ${resumePlan.orphanAudioPaths.length.toLocaleString("pt-BR")}`);
  console.log(`Capas órfãs que serão reusadas:    ${resumePlan.orphanCoverPaths.length.toLocaleString("pt-BR")}`);
  console.log("\nNenhum upload, insert ou remoção foi executado.");
}

async function runRealImport(
  root: string,
  plan: ImportPlan,
  supabase: ReturnType<typeof createServiceClient>,
  resumePlan: ResumePlan,
  existingCoverObjects: ReadonlySet<string>,
) {
  if (!(await confirmImport(plan, resumePlan))) {
    console.log("Importação cancelada. Nenhum upload ou insert foi executado.");
    return;
  }

  const startedAt = Date.now();
  const fileByPath = new Map(plan.files.map((file) => [file.relative_path, file]));
  const results: Array<{
    relative_path: string;
    status: "imported" | "already_exists" | "error";
    error?: string;
  }> = [];
  let imported = 0;
  let alreadyExists = 0;
  let errors = 0;
  let bytesSent = 0;

  for (const [index, decision] of resumePlan.missing.entries()) {
    const file = fileByPath.get(decision.relative_path)!;
    const absolutePath = resolve(root, ...decision.relative_path.split("/"));
    console.log(`\n[${index + 1}/${resumePlan.missing.length}] ${decision.relative_path}`);
    let uploadedAudio: string | null = null;
    let uploadedCover: string | null = null;
    let resolvedCoverPath: string | null = null;

    try {
      if (!file.file_hash) throw new Error("SHA-256 indisponível; arquivo preservado para revisão.");
      const { data: existing, error: lookupError } = await supabase
        .from("songs")
        .select("id")
        .eq("file_hash", file.file_hash)
        .maybeSingle();
      if (lookupError) throw lookupError;
      if (existing) {
        alreadyExists += 1;
        results.push({ relative_path: decision.relative_path, status: "already_exists" });
        console.log("→ já existe no banco, ignorada");
        continue;
      }

      let picture: IPicture | undefined;
      try {
        picture = (await parseFile(absolutePath, { duration: true })).common.picture?.[0];
      } catch {
        // Metadata NEEDS_REVIEW must not block a readable file from being imported.
      }
      const pictureExtension = picture ? coverExtension(picture) : null;
      const audioPath = `${file.file_hash}.mp3`;
      if (decision.audio_upload_required) {
        const audioBytes = await readFile(absolutePath);
        const { error: audioError } = await supabase.storage.from(MUSIC_BUCKET).upload(
          audioPath,
          audioBytes,
          { contentType: "audio/mpeg", upsert: false },
        );
        if (audioError) throw audioError;
        uploadedAudio = audioPath;
        bytesSent += audioBytes.byteLength;
      } else {
        console.log("→ áudio órfão já presente no Storage; upload dispensado");
      }

      if (picture && pictureExtension) {
        const coverPath = `${file.file_hash}.${pictureExtension}`;
        resolvedCoverPath = coverPath;
        if (existingCoverObjects.has(coverPath)) {
          console.log("→ capa órfã já presente no Storage; upload dispensado");
        } else {
          const coverBytes = Buffer.from(picture.data);
          const { error: coverError } = await supabase.storage.from(COVERS_BUCKET).upload(
            coverPath,
            coverBytes,
            { contentType: coverContentType(pictureExtension), upsert: false },
          );
          if (coverError) throw coverError;
          uploadedCover = coverPath;
          bytesSent += coverBytes.byteLength;
        }
      }

      const fallbackTitle = basename(absolutePath, extname(absolutePath));
      const { error: insertError } = await supabase.from("songs").insert({
        title: file.resolved_title ?? fallbackTitle,
        artist: file.resolved_artist,
        album: file.resolved_album,
        original_filename: file.original_filename,
        source_folder: file.source_folder,
        audio_path: audioPath,
        cover_path: resolvedCoverPath,
        file_hash: file.file_hash,
        duration_seconds: file.duration_seconds,
        bitrate: file.bitrate,
        sample_rate: file.sample_rate,
        metadata_status: file.metadata_status,
        metadata_review_required: file.metadata_status === "NEEDS_REVIEW",
      });
      if (insertError) throw insertError;

      imported += 1;
      results.push({ relative_path: decision.relative_path, status: "imported" });
      console.log("✓ importada");
    } catch (error) {
      if (uploadedAudio) await supabase.storage.from(MUSIC_BUCKET).remove([uploadedAudio]);
      if (uploadedCover) await supabase.storage.from(COVERS_BUCKET).remove([uploadedCover]);
      const message = errorMessage(error);
      errors += 1;
      results.push({ relative_path: decision.relative_path, status: "error", error: message });
      console.error(`✗ erro: ${message}`);
    }
  }

  const finishedAt = new Date();
  const summary = {
    found: plan.summary.files_found,
    planned: plan.summary.files_to_import,
    imported,
    already_existing: alreadyExists,
    exact_duplicates_skipped: plan.summary.exact_duplicates_skipped,
    likely_duplicates_skipped: plan.summary.likely_duplicates_skipped,
    possible_duplicates_preserved: plan.summary.possible_duplicates_preserved,
    errors,
    bytes_sent: bytesSent,
    elapsed_seconds: Math.round((Date.now() - startedAt) / 1000),
  };
  const reportPath = resolve(process.cwd(), "reports", `import-${timestamp(finishedAt)}.json`);
  await writeFile(reportPath, JSON.stringify({ finished_at: finishedAt.toISOString(), summary, results }, null, 2), "utf8");

  console.log("\nResumo final da importação");
  console.log(`Encontrados: ${summary.found}`);
  console.log(`Planejados: ${summary.planned}`);
  console.log(`Importados: ${summary.imported}`);
  console.log(`Já existentes no banco: ${summary.already_existing}`);
  console.log(`Exact duplicates pulados: ${summary.exact_duplicates_skipped}`);
  console.log(`Likely duplicates pulados: ${summary.likely_duplicates_skipped}`);
  console.log(`Possible duplicates preservados: ${summary.possible_duplicates_preserved}`);
  console.log(`Erros: ${summary.errors}`);
  console.log(`Bytes enviados: ${formatBytes(summary.bytes_sent)}`);
  console.log(`Tempo total: ${summary.elapsed_seconds}s`);
  console.log(`Relatório: ${reportPath}`);
  if (errors > 0) process.exitCode = 1;
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes("--dry-run");
  const planMode = args.includes("--plan");
  const rootArgument = args.find((argument) => !argument.startsWith("--"));
  if (!rootArgument) {
    throw new Error('Informe a pasta raiz. Exemplo: npm run import-music -- "E:\\Musicas" --plan');
  }

  const root = resolve(rootArgument);
  const rootStats = await stat(root).catch(() => null);
  if (!rootStats?.isDirectory()) throw new Error(`Pasta não encontrada: ${root}`);

  if (dryRun) {
    await analyzeLibrary(root);
    return;
  }

  const plan = await buildImportPlan(root, true);
  const supabase = createServiceClient();
  const { resumePlan, remote } = await buildResumePlan(plan, supabase);
  if (planMode) {
    printResumePlan(plan, resumePlan);
    return;
  }
  await runRealImport(root, plan, supabase, resumePlan, remote.coverObjects);
}

main().catch((error: unknown) => {
  console.error(`Falha: ${errorMessage(error)}`);
  process.exitCode = 1;
});
