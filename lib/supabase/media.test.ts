import { beforeEach, describe, expect, it, vi } from "vitest";

describe("URLs de mídia", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://project.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "test-key");
  });

  it("gera o endpoint interno para um audio_path real", async () => {
    const { getAudioUrl } = await import("./media");
    const path = "6b4bb30cd5b64a526dd2c5ed7a752df6fbf16ce59cde23623e8e14bb4650da96.mp3";

    expect(getAudioUrl(path)).toBe(`/api/media/audio?path=${path}`);
  });

  it("usa a capa padrão para cover_path null ou vazio", async () => {
    const { DEFAULT_COVER_URL, getCoverUrl } = await import("./media");

    expect(getCoverUrl(null)).toBe(DEFAULT_COVER_URL);
    expect(getCoverUrl("")).toBe(DEFAULT_COVER_URL);
    expect(getCoverUrl("   ")).toBe(DEFAULT_COVER_URL);
  });

  it("gera a URL pública para um cover_path válido do Storage", async () => {
    const { getCoverUrl } = await import("./media");
    const path = "9e39fbb92b56fb3308a8318948246c601ae5ce2ae38e475b432d2f9fb4b70d5c.jpg";

    expect(getCoverUrl(path)).toBe(
      `https://project.supabase.co/storage/v1/object/public/covers/${path}`,
    );
  });
});
