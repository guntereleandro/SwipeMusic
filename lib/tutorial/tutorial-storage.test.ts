import { describe, expect, it } from "vitest";
import { hasCompletedTutorial, markTutorialCompleted, tutorialStorageKey } from "./tutorial-storage";

function memoryStorage() {
  const values = new Map<string, string>();
  return { getItem: (key: string) => values.get(key) ?? null, setItem: (key: string, value: string) => { values.set(key, value); } };
}

describe("persistência do tutorial", () => {
  it("considera pendente quando a chave não existe", () => {
    expect(hasCompletedTutorial("norair", memoryStorage())).toBe(false);
  });

  it("marca conclusão por slug sem afetar outra biblioteca", () => {
    const storage = memoryStorage();
    expect(markTutorialCompleted("Norair", storage)).toBe(true);
    expect(hasCompletedTutorial("norair", storage)).toBe(true);
    expect(hasCompletedTutorial("lito", storage)).toBe(false);
    expect(tutorialStorageKey(" LITO ")).toBe("swipemusic:tutorial:lito");
  });

  it("falha de forma segura sem localStorage ou quando ele lança erro", () => {
    expect(hasCompletedTutorial("norair", null)).toBe(false);
    expect(markTutorialCompleted("norair", null)).toBe(false);
    const broken = { getItem: () => { throw new Error("bloqueado"); }, setItem: () => { throw new Error("bloqueado"); } };
    expect(hasCompletedTutorial("norair", broken)).toBe(false);
    expect(markTutorialCompleted("norair", broken)).toBe(false);
  });
});
