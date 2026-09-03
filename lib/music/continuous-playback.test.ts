import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import {
  continuousPlaybackAfterManualAction,
  INITIAL_CONTINUOUS_PLAYBACK,
  isCurrentPlaybackRequest,
  shouldAutoPlayReplacement,
} from "./continuous-playback";

describe("reprodução contínua", () => {
  it("começa desativada em uma nova montagem ou reload", () => {
    expect(INITIAL_CONTINUOUS_PLAYBACK).toBe(false);
  });

  it("Play manual ativa e Pause manual desativa", () => {
    expect(continuousPlaybackAfterManualAction("PLAY")).toBe(true);
    expect(continuousPlaybackAfterManualAction("PAUSE")).toBe(false);
  });

  it.each(["LIKE", "DISLIKE", "NEUTRAL"] as const)(
    "inicia a próxima música após %s quando a continuidade está ativa",
    () => {
      expect(shouldAutoPlayReplacement(true)).toBe(true);
    },
  );

  it.each(["LIKE", "DISLIKE", "NEUTRAL"] as const)(
    "mantém a próxima música pausada após %s quando a continuidade está desativada",
    () => {
      expect(shouldAutoPlayReplacement(false)).toBe(false);
    },
  );

  it("aplica ao Desfazer a mesma preferência atual da sessão", () => {
    expect(shouldAutoPlayReplacement(true)).toBe(true);
    expect(shouldAutoPlayReplacement(false)).toBe(false);
  });

  it("não quebra nem desativa a preferência quando play() é rejeitado", () => {
    const preferenceAfterManualPlay = continuousPlaybackAfterManualAction("PLAY");
    const preferenceAfterRejectedPromise = preferenceAfterManualPlay;

    expect(preferenceAfterRejectedPromise).toBe(true);
  });

  it("ignora uma tentativa antiga depois da troca rápida de música", () => {
    expect(isCurrentPlaybackRequest(1, 2, false)).toBe(false);
    expect(isCurrentPlaybackRequest(2, 2, true)).toBe(false);
    expect(isCurrentPlaybackRequest(2, 2, false)).toBe(true);
  });

  it("mantém um único player entre músicas, sem keys dependentes da música", async () => {
    const [rater, card, player] = await Promise.all([
      readFile(new URL("../../components/music-rater.tsx", import.meta.url), "utf8"),
      readFile(new URL("../../components/music-card.tsx", import.meta.url), "utf8"),
      readFile(new URL("../../components/audio-player.tsx", import.meta.url), "utf8"),
    ]);
    expect(rater).not.toContain("key={currentSong.id}");
    expect(card).not.toContain("key={song.id}");
    expect(player.match(/<audio\b/g)).toHaveLength(1);
    expect(player).toContain("audio.load()");
    expect(player).toContain("playsInline");
    expect(player).not.toContain('addEventListener("canplay"');
  });
});
