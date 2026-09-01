import { describe, expect, it } from "vitest";
import { resolveCoverSourceAfterError } from "./cover-image";

describe("fallback da imagem de capa", () => {
  it("troca uma imagem que falhou pela capa padrão existente", () => {
    expect(resolveCoverSourceAfterError("https://example.com/inexistente.jpg")).toBe(
      "/covers/default.svg",
    );
  });

  it("mantém a capa padrão se o próprio fallback emitir erro", () => {
    expect(resolveCoverSourceAfterError("/covers/default.svg")).toBe(
      "/covers/default.svg",
    );
  });
});
