import { describe, expect, it } from "vitest";
import { normalizeArtist, normalizeTitle, removeDiacritics } from "./normalization";

describe("normalização para comparação", () => {
  it("remove acentos e diacríticos", () => {
    expect(removeDiacritics("Evidências Acústico")).toBe("Evidencias Acustico");
  });

  it("normaliza título, pontuação, espaços e extensão", () => {
    expect(normalizeTitle("  Evidências___!!!.mp3 ")).toBe("evidencias");
  });

  it("trata & e e como equivalentes em artistas", () => {
    expect(normalizeArtist("Chitãozinho & Xororó")).toBe(
      normalizeArtist("Chitaozinho e Xororo"),
    );
  });

  it("remove prefixos numéricos de faixa", () => {
    expect(normalizeTitle("01 - Evidências.mp3")).toBe("evidencias");
    expect(normalizeTitle("001 Evidencias")).toBe("evidencias");
  });

  it("remove apenas termos acessórios", () => {
    expect(normalizeTitle("Evidências (Official Audio) 320kbps")).toBe("evidencias");
    expect(normalizeTitle("Evidências Lyric Video")).toBe("evidencias");
  });

  it("preserva informações de versão musicalmente relevantes", () => {
    expect(normalizeTitle("Evidências Ao Vivo")).toContain("ao vivo");
    expect(normalizeTitle("Evidências Remix")).toContain("remix");
    expect(normalizeTitle("Evidências feat. Convidado")).toContain("feat convidado");
  });
});
