import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const tutorial = readFileSync(resolve(process.cwd(), "components/tutorial/music-tutorial.tsx"), "utf8");
const card = readFileSync(resolve(process.cwd(), "components/tutorial/tutorial-card.tsx"), "utf8");
const gate = readFileSync(resolve(process.cwd(), "components/tutorial/tutorial-gate.tsx"), "utf8");

describe("isolamento do tutorial", () => {
  it("não importa repositories, mídia, áudio ou Supabase", () => {
    expect(`${tutorial}\n${card}`).not.toMatch(/repositories|supabase|AudioPlayer|getAudioUrl|signed/i);
  });

  it("mantém o MusicRater desmontado até a decisão local de hidratação", () => {
    expect(gate.indexOf("if (!hydrated)")).toBeLessThan(gate.indexOf("return <MusicRater"));
    expect(gate).toContain("hasCompletedTutorial(librarySlug)");
  });

  it("permite reabrir manualmente sem apagar a preferência", () => {
    expect(gate).toContain('onOpenTutorial={() => setMode("OPEN")}');
    expect(gate).not.toMatch(/removeItem|clear\(/);
  });
});
