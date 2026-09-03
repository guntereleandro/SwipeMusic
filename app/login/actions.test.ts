import { beforeEach, describe, expect, it, vi } from "vitest";

const signInWithPassword = vi.fn();
const redirect = vi.fn((destination: string) => {
  throw new Error(`NEXT_REDIRECT:${destination}`);
});

vi.mock("../../lib/supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({ auth: { signInWithPassword } })),
}));
vi.mock("next/navigation", () => ({ redirect }));

describe("loginAction", () => {
  beforeEach(() => {
    signInWithPassword.mockReset();
    redirect.mockClear();
  });

  it("deixa NEXT_REDIRECT escapar após autenticação bem-sucedida", async () => {
    signInWithPassword.mockResolvedValue({ error: null });
    const { loginAction } = await import("./actions");
    const form = new FormData();
    form.set("email", "admin@example.com");
    form.set("password", "senha-de-teste");

    await expect(loginAction({ error: null }, form)).rejects.toThrow("NEXT_REDIRECT:/admin");
    expect(signInWithPassword).toHaveBeenCalledOnce();
    expect(redirect).toHaveBeenCalledWith("/admin");
  });

  it("retorna mensagem segura quando signInWithPassword falha", async () => {
    signInWithPassword.mockResolvedValue({ error: { code: "invalid_credentials" } });
    const { loginAction } = await import("./actions");
    const form = new FormData();
    form.set("email", "admin@example.com");
    form.set("password", "incorreta");

    await expect(loginAction({ error: null }, form)).resolves.toEqual({ error: "E-mail ou senha inválidos." });
    expect(redirect).not.toHaveBeenCalled();
  });
});
