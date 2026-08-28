import "server-only";

import { readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { parseImportPlan, selectLatestImportPlanFile } from "@/lib/import-plan/parse-import-plan";
import type { ImportPlanReport } from "@/types/import-plan";

export type LatestImportPlanResult =
  | { status: "ok"; report: ImportPlanReport }
  | { status: "empty" }
  | { status: "error"; message: string };

export async function getLatestImportPlan(): Promise<LatestImportPlanResult> {
  const reportsDirectory = resolve(process.cwd(), "reports");

  try {
    const fileName = selectLatestImportPlanFile(await readdir(reportsDirectory));
    if (!fileName) return { status: "empty" };

    const contents = await readFile(resolve(reportsDirectory, fileName), "utf8");
    return { status: "ok", report: parseImportPlan(JSON.parse(contents), fileName) };
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Não foi possível ler o plano.",
    };
  }
}
