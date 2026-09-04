import { access, mkdir, rename, stat, writeFile } from "node:fs/promises";
import { dirname, isAbsolute, relative, resolve } from "node:path";
import { stdin as input, stdout as output } from "node:process";
import { createInterface } from "node:readline/promises";
import { createClient } from "@supabase/supabase-js";
import { config as loadEnv } from "dotenv";
import type { Database } from "../lib/supabase/database.types";
import { positionalArguments, requireLibrarySlug, resolveRequiredLibrary } from "../lib/libraries/library-scope";
import { analyzeLibrary } from "./music-analysis/analyze-library";
import {
  QUARANTINE_DIRECTORY,
  applyCleanupPlan,
  chooseAvailableDestination,
  createCleanupPlan,
  listRemoteSongs,
  type CleanupDecision,
  type CleanupPlan,
  type RemoteSong,
} from "./music-cleanup/cleanup-plan";

const CONFIRMATION = "MOVER DUPLICATAS";
const PAGE_SIZE = 1_000;

loadEnv({ path: resolve(process.cwd(), ".env.local"), quiet: true });
loadEnv({ path: resolve(process.cwd(), ".env"), quiet: true });

function environment(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`Variável obrigatória ausente: ${name}`);
  return value;
}

function timestamp(date: Date) {
  return date.toISOString().replace(/:/g, "").replace("T", "-").slice(0, 17);
}

function csvValue(value: unknown) {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\r\n;]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function cleanupCsv(decisions: CleanupDecision[]) {
  const columns: Array<keyof CleanupDecision> = [
    "original_path", "file_hash", "classification", "action", "reason", "song_id",
    "library_slug", "kept_representative", "quarantine_destination", "move_status", "error",
  ];
  return `\uFEFF${columns.join(",")}\r\n${decisions.map((item) => columns.map((column) => csvValue(item[column])).join(",")).join("\r\n")}\r\n`;
}

async function remoteSongs(client: ReturnType<typeof createServiceClient>, libraryId: string): Promise<RemoteSong[]> {
  return listRemoteSongs(async (from, to) => {
    const { data, error } = await client.from("songs").select("id,file_hash").eq("library_id", libraryId)
      .order("id", { ascending: true }).range(from, to);
    if (error) throw error;
    return data;
  }, PAGE_SIZE);
}

function createServiceClient() {
  return createClient<Database>(environment("NEXT_PUBLIC_SUPABASE_URL"), environment("SUPABASE_SERVICE_ROLE_KEY"), {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

function assertInside(parent: string, target: string) {
  const child = relative(parent, target);
  if (!child || child.startsWith("..") || isAbsolute(child)) throw new Error(`Caminho fora da quarentena: ${target}`);
}

async function prepareDestination(root: string, decision: CleanupDecision) {
  if (!decision.quarantine_destination) throw new Error(`Destino ausente para ${decision.original_path}`);
  const quarantineRoot = resolve(root, QUARANTINE_DIRECTORY);
  const relativeDestination = await chooseAvailableDestination(decision.quarantine_destination, async (candidate) => {
    try { await access(resolve(root, candidate)); return true; } catch { return false; }
  });
  const destination = resolve(root, relativeDestination);
  assertInside(quarantineRoot, destination);
  decision.quarantine_destination = relativeDestination;
  return destination;
}

async function saveReports(plan: CleanupPlan, execution: unknown, date = new Date()) {
  const directory = resolve(process.cwd(), "reports");
  await mkdir(directory, { recursive: true });
  const base = `music-cleanup-${timestamp(date)}`;
  const json = resolve(directory, `${base}.json`);
  const csv = resolve(directory, `${base}.csv`);
  await Promise.all([
    writeFile(json, JSON.stringify({ generated_at: date.toISOString(), ...plan, execution }, null, 2), "utf8"),
    writeFile(csv, cleanupCsv(plan.decisions), "utf8"),
  ]);
  return { json, csv };
}

function printPlan(plan: CleanupPlan) {
  console.log("\n===========================================");
  console.log("SWIPEMUSIC — PLANO DE LIMPEZA LOCAL");
  console.log("===========================================\n");
  console.log(`Biblioteca: ${plan.library_slug}`);
  console.log(`Arquivos encontrados: ${plan.summary.files_found.toLocaleString("pt-BR")}`);
  console.log(`Arquivos correspondentes ao Supabase: ${plan.summary.matched_to_supabase.toLocaleString("pt-BR")}`);
  console.log(`Arquivos redundantes seguros: ${plan.summary.safe_duplicates.toLocaleString("pt-BR")}`);
  console.log(`Casos ambíguos preservados: ${plan.summary.ambiguous_preserved.toLocaleString("pt-BR")}`);
  console.log(`Arquivos fora do Supabase: ${plan.summary.not_in_supabase.toLocaleString("pt-BR")}`);
  console.log(`\nSerão mantidos: ${plan.summary.kept.toLocaleString("pt-BR")}`);
  console.log(`Serão movidos para quarentena: ${plan.summary.to_quarantine.toLocaleString("pt-BR")}`);
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const slug = requireLibrarySlug(args);
  const rootArgument = positionalArguments(args)[0];
  if (!rootArgument) throw new Error('Informe a pasta. Exemplo: npm.cmd run clean-music-folder -- "C:\\Músicas" --library lito');
  const root = resolve(rootArgument);
  const rootStats = await stat(root).catch(() => null);
  if (!rootStats?.isDirectory()) throw new Error(`Pasta não encontrada: ${root}`);

  const client = createServiceClient();
  const library = await resolveRequiredLibrary(slug, async (candidate) => {
    const { data, error } = await client.from("libraries").select("id,slug").eq("slug", candidate).maybeSingle();
    if (error) throw error;
    return data;
  });
  const [analysis, remote] = await Promise.all([
    analyzeLibrary(root, { writeReports: false, printSummary: false }),
    remoteSongs(client, library.id),
  ]);
  const plan = createCleanupPlan(analysis.files, analysis.duplicateGroups, remote, library.slug);
  for (const decision of plan.decisions.filter((item) => item.action === "MOVE_DUPLICATE")) {
    await prepareDestination(root, decision);
  }
  printPlan(plan);

  if (!apply) {
    const reports = await saveReports(plan, { mode: "dry_run", completed: true, errors: [] });
    console.log("\nNenhum arquivo foi alterado.");
    console.log(`JSON: ${reports.json}\nCSV:  ${reports.csv}`);
    console.log(`\nPara executar:\nnpm.cmd run clean-music-folder -- "${root}" --library ${library.slug} --apply`);
    return;
  }

  console.log(`\nSerá criada a pasta ${QUARANTINE_DIRECTORY}. Nenhum arquivo será apagado.`);
  console.log(`Digite exatamente ${CONFIRMATION} para continuar.`);
  const prompt = createInterface({ input, output });
  let answer = "";
  try { answer = await prompt.question("> "); } finally { prompt.close(); }
  if (answer !== CONFIRMATION) {
    const reports = await saveReports(plan, { mode: "apply", completed: false, cancelled: true, errors: [] });
    console.log(`Operação cancelada. Nenhum arquivo foi movido.\nJSON: ${reports.json}\nCSV:  ${reports.csv}`);
    return;
  }

  const execution = await applyCleanupPlan(plan, async (decision) => {
    const source = resolve(root, decision.original_path);
    const destination = await prepareDestination(root, decision);
    await mkdir(dirname(destination), { recursive: true });
    await rename(source, destination);
  });
  const reports = await saveReports(plan, { mode: "apply", ...execution });
  console.log(execution.completed ? "\nLimpeza concluída; duplicatas foram movidas para a quarentena." : "\nLimpeza interrompida após uma falha; movimentos anteriores foram preservados.");
  console.log(`JSON: ${reports.json}\nCSV:  ${reports.csv}`);
  if (!execution.completed) process.exitCode = 1;
}

main().catch((error: unknown) => {
  console.error(`Falha: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
