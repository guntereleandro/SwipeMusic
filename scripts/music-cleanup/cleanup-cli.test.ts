import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = readFileSync(resolve(process.cwd(), "scripts/clean-music-folder.ts"), "utf8");
const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8")) as { scripts: Record<string, string> };

describe("CLI de limpeza", () => {
  it("é dry-run por padrão e só move com --apply e confirmação forte", () => {
    expect(source).toContain('const apply = args.includes("--apply")');
    expect(source).toContain('const CONFIRMATION = "MOVER DUPLICATAS"');
    expect(source).toContain("if (!apply)");
    expect(source.indexOf("if (!apply)")).toBeLessThan(source.indexOf("applyCleanupPlan(plan"));
  });

  it("está registrado no package.json e não contém exclusão de arquivos", () => {
    expect(packageJson.scripts["clean-music-folder"]).toBe("tsx scripts/clean-music-folder.ts");
    expect(source).not.toMatch(/\b(unlink|rm|rmdir)\s*\(/);
    expect(source).not.toMatch(/\.from\([^)]*\)\.delete\s*\(/);
    expect(source).not.toContain(".storage.from");
  });
});
