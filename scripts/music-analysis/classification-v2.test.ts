import { describe, expect, it } from "vitest";
import { buildCompleteLinkageGroups, type Candidate } from "./analyze-library";
import { compareTracks } from "./classification";
import { normalizeArtist, normalizeTitle } from "./normalization";

function track(title: string, artist: string, durationSeconds: number | null) {
  return {
    normalizedTitle: normalizeTitle(title),
    normalizedArtist: normalizeArtist(artist),
    durationSeconds,
    titleTrusted: true,
    artistTrusted: true,
  };
}

describe("classificação de duplicatas V2", () => {
  it("classifica título/artista compatíveis e duração próxima como provável", () => {
    const result = compareTracks(
      track("Evidências", "Chitãozinho & Xororó", 220),
      track("Evidencias Official Audio", "Chitaozinho e Xororo", 223),
    );
    expect(result.duplicateStatus).toBe("LIKELY_DUPLICATE");
  });

  it("não agrupa artistas diferentes com o mesmo título", () => {
    expect(
      compareTracks(
        track("Hallelujah", "Leonard Cohen", 280),
        track("Hallelujah", "Jeff Buckley", 282),
      ).duplicateStatus,
    ).toBeNull();
  });

  it("não agrupa versões live ou remix automaticamente", () => {
    expect(compareTracks(
      track("Minha Música", "Minha Banda", 240),
      track("Minha Música Ao Vivo", "Minha Banda", 242),
    ).duplicateStatus).toBeNull();
    expect(compareTracks(
      track("Minha Música", "Minha Banda", 240),
      track("Minha Música Remix", "Minha Banda", 242),
    ).duplicateStatus).toBeNull();
  });

  it("não usa duração isoladamente e rejeita duração muito diferente", () => {
    expect(compareTracks(
      track("Canção A", "Artista A", 200),
      track("Canção B", "Artista B", 201),
    ).duplicateStatus).toBeNull();
    expect(compareTracks(
      track("Canção", "Artista", 200),
      track("Canção", "Artista", 260),
    ).duplicateStatus).toBeNull();
  });

  it("não usa metadado marcado como não confiável", () => {
    const result = compareTracks({
      ...track("Faixa 1", "DownSertanejo.net", 200),
      titleTrusted: false,
      artistTrusted: false,
    }, track("Faixa 1", "DownSertanejo.net", 201));
    expect(result.duplicateStatus).toBeNull();
  });

  it("não fecha grupos por mera transitividade A~B e B~C", () => {
    const edge = (left: number, right: number): Candidate => ({
      left,
      right,
      duplicateStatus: "LIKELY_DUPLICATE",
      confidence: 0.96,
      reasons: ["test"],
    });
    const groups = buildCompleteLinkageGroups(
      [edge(0, 1), edge(1, 2)],
      "LIKELY_DUPLICATE",
      new Set(),
    );
    expect(groups).toHaveLength(1);
    expect(groups[0]).toHaveLength(2);
  });

  it("não relaciona as músicas reais diferentes do grupo incorreto", () => {
    const titles = ["Seu Amor Ainda É Tudo", "Borbulhas De Amor", "Telefone Mudo", "Panela Velha"];
    for (let left = 0; left < titles.length; left += 1) {
      for (let right = left + 1; right < titles.length; right += 1) {
        expect(compareTracks(
          track(titles[left], "Artista", 200),
          track(titles[right], "Artista", 202),
        ).duplicateStatus).toBeNull();
      }
    }
  });
});
