import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { findMp3Files } from "./analyze-library";

const created: string[] = [];
afterEach(async () => { await Promise.all(created.splice(0).map((path) => rm(path, { recursive: true, force: true }))); });

describe("scanner compartilhado", () => {
  it("ignora _duplicatas_removidas em análise, importação e reruns da limpeza", async () => {
    const root = await mkdtemp(join(tmpdir(), "swipemusic-áudio-"));
    created.push(root);
    await mkdir(join(root, "_duplicatas_removidas", "sub"), { recursive: true });
    await writeFile(join(root, "mantida.mp3"), "x");
    await writeFile(join(root, "_duplicatas_removidas", "sub", "movida.mp3"), "x");
    await expect(findMp3Files(root)).resolves.toEqual([join(root, "mantida.mp3")]);
  });
});
