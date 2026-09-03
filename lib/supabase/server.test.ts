import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const set = vi.fn();
let cookieAdapter: { setAll: (cookies: Array<{ name: string; value: string; options: object }>) => void } | null = null;

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({ getAll: vi.fn(() => []), set })),
}));
vi.mock("@supabase/ssr", () => ({
  createServerClient: vi.fn((_url, _key, options) => {
    cookieAdapter = options.cookies;
    return { auth: {} };
  }),
}));

describe("cliente Supabase SSR", () => {
  beforeEach(() => {
    set.mockReset();
    cookieAdapter = null;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  });

  it("propaga cookies emitidos por signInWithPassword para next/headers", async () => {
    const { createServerSupabaseClient } = await import("./server");
    await createServerSupabaseClient();
    cookieAdapter!.setAll([{ name: "sb-session", value: "redacted", options: { httpOnly: true } }]);
    expect(set).toHaveBeenCalledWith("sb-session", "redacted", { httpOnly: true });
  });
});
