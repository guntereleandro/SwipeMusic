import { describe, expect, it } from "vitest";
import { buildSessionQueue, normalizeQueueArtist, restoreSongForUndo } from "./session-queue";

type TestSong = { id: string; artist: string | null; status: string };
const song = (id: string, artist: string | null, status = "PENDING"): TestSong => ({ id, artist, status });
const deterministicRandom = () => 0.42;

describe("fila embaralhada da sessão", () => {
  it("contém exatamente todas as músicas pendentes, sem duplicar ou perder", () => {
    const input = [song("1", "A"), song("2", "B"), song("3", "A"), song("4", "C")];
    const queue = buildSessionQueue(input, deterministicRandom);
    expect(queue).toHaveLength(input.length);
    expect(new Set(queue.map((item) => item.id)).size).toBe(input.length);
    expect(queue.map((item) => item.id).sort()).toEqual(input.map((item) => item.id).sort());
  });

  it("exclui músicas já avaliadas", () => {
    const queue = buildSessionQueue([
      song("pending", "A"), song("like", "B", "LIKE"), song("neutral", "C", "NEUTRAL"),
    ], deterministicRandom);
    expect(queue.map((item) => item.id)).toEqual(["pending"]);
  });

  it("evita artistas consecutivos quando há alternativas", () => {
    const queue = buildSessionQueue([
      song("a1", " Artista A "), song("a2", "artista a"), song("a3", "ARTISTA A"),
      song("b1", "B"), song("b2", "b"), song("c1", "C"),
    ], deterministicRandom);
    for (let index = 1; index < queue.length; index += 1) {
      expect(normalizeQueueArtist(queue[index].artist)).not.toBe(normalizeQueueArtist(queue[index - 1].artist));
    }
  });

  it("funciona quando só existe um artista", () => {
    const input = [song("1", "Único"), song("2", " único "), song("3", "ÚNICO")];
    expect(buildSessionQueue(input, deterministicRandom)).toHaveLength(3);
  });

  it("trata artist null e vazio de forma segura", () => {
    const input = [song("1", null), song("2", ""), song("3", "A")];
    const queue = buildSessionQueue(input, deterministicRandom);
    expect(queue).toHaveLength(3);
    expect(new Set(queue.map((item) => item.id))).toEqual(new Set(["1", "2", "3"]));
  });

  it("produz uma ordem estável depois de construída", () => {
    const queue = buildSessionQueue([song("1", "A"), song("2", "B"), song("3", "C")], deterministicRandom);
    const sameSessionReference = queue;
    expect(sameSessionReference).toBe(queue);
    expect(sameSessionReference.map((item) => item.id)).toEqual(queue.map((item) => item.id));
  });
});

describe("Undo", () => {
  it("restaura a música na frente sem duplicá-la e preserva o restante da fila", () => {
    const input = [song("next", "B"), song("rated", "A", "LIKE"), song("later", "C")];
    const restored = restoreSongForUndo(input, "rated");
    expect(restored.map((item) => item.id)).toEqual(["rated", "next", "later"]);
    expect(restored[0].status).toBe("PENDING");
    expect(new Set(restored.map((item) => item.id)).size).toBe(input.length);
  });
});
