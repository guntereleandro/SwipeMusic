import { describe, expect, it } from "vitest";
import { isValidAudioStoragePath } from "./media-path";

describe("validação da rota de áudio", () => {
  const realPath = "6b4bb30cd5b64a526dd2c5ed7a752df6fbf16ce59cde23623e8e14bb4650da96.mp3";

  it("aceita o formato realmente salvo no banco e no bucket music", () => {
    expect(isValidAudioStoragePath(realPath)).toBe(true);
  });

  it.each([null, "", "music/file.mp3", "../file.mp3", `${"a".repeat(64)}.wav`])(
    "rejeita caminho inseguro ou incompatível: %s",
    (path) => {
      expect(isValidAudioStoragePath(path)).toBe(false);
    },
  );
});
