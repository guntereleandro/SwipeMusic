import { describe, expect, it } from "vitest";
import { isSuspiciousMetadataValue, parseFilename, resolveMetadata } from "./metadata-resolution";

describe("detecção de ID3 lixo", () => {
  it.each([
    "UNKNOWN", "Unknown Artist", "Faixa", "Faixa 1", "Track", "Track 01",
    "0", "1", "www.SapoDownloads.net", "DownSertanejo.net",
    "www.TONOBUTECO.com", "sistemasertanejo", "musicasparabaixar",
  ])("marca %s como suspeito", (value) => {
    expect(isSuspiciousMetadataValue(value)).toBe(true);
  });
});

describe("resolução conservadora de metadados", () => {
  it("não confia no ID3 lixo de Seu Amor Ainda É Tudo", () => {
    const resolved = resolveMetadata({
      fileName: "05 - Seu Amor Ainda É Tudo.mp3",
      sourceFolder: "Sertanejao/Album",
      id3Title: "Faixa 1",
      id3Artist: "DownSertanejo.net",
      id3Album: null,
    });
    expect(resolved.resolvedTitle).toBe("Seu Amor Ainda É Tudo");
    expect(resolved.titleSource).toBe("FILENAME");
    expect(resolved.artistSource).not.toBe("ID3");
  });

  it("extrai artista e música sem inverter o filename", () => {
    const parsed = parseFilename("24 - Gino e Geno - Voa sabiá.mp3");
    expect(parsed.artist).toBe("Gino e Geno");
    expect(parsed.title).toBe("Voa sabiá");

    const resolved = resolveMetadata({
      fileName: "24 - Gino e Geno - Voa sabiá.mp3",
      sourceFolder: null,
      id3Title: "H",
      id3Artist: null,
      id3Album: null,
    });
    expect(resolved.resolvedTitle).toBe("Voa sabiá");
    expect(resolved.resolvedArtist).toBe("Gino e Geno");
    expect(resolved.titleSource).toBe("FILENAME");
    expect(resolved.artistSource).toBe("FILENAME");
  });

  it("infere artista de uma pasta específica", () => {
    const resolved = resolveMetadata({
      fileName: "11 - Fio de Cabelo.mp3",
      sourceFolder: "Sertanejao/Chitaozinho e Xororo",
      id3Title: null,
      id3Artist: null,
      id3Album: null,
    });
    expect(resolved.resolvedTitle).toBe("Fio de Cabelo");
    expect(resolved.resolvedArtist).toBe("Chitaozinho e Xororo");
    expect(resolved.artistSource).toBe("FOLDER");
    expect(resolved.artistConfidence).toBe("MEDIUM");
  });

  it("não trata pasta de coletânea como artista", () => {
    const resolved = resolveMetadata({
      fileName: "01 Música.mp3",
      sourceFolder: "00 - Modão de Buteco",
      id3Title: null,
      id3Artist: null,
      id3Album: null,
    });
    expect(resolved.resolvedArtist).toBeNull();
    expect(resolved.metadataStatus).toBe("NEEDS_REVIEW");
  });
});
