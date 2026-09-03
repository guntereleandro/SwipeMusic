import { beforeEach, describe, expect, it, vi } from "vitest";

const getUser = vi.fn();
const redirect = vi.fn((destination: string) => {
  throw new Error(`NEXT_REDIRECT:${destination}`);
});

vi.mock("../supabase/server", () => ({
  createServerSupabaseClient: vi.fn(async () => ({ auth: { getUser } })),
}));
vi.mock("next/navigation", () => ({ redirect }));

describe("guarda server-side", () => {
  beforeEach(() => {
    getUser.mockReset();
    redirect.mockClear();
  });

  it("valida a sessão com auth.getUser(), não getSession()", async () => {
    getUser.mockResolvedValue({ data: { user: { id: "admin-user" } }, error: null });
    const { requireAuthenticatedUser } = await import("./session");
    await expect(requireAuthenticatedUser()).resolves.toMatchObject({ id: "admin-user" });
    expect(getUser).toHaveBeenCalledOnce();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("redireciona no servidor quando getUser não retorna usuário", async () => {
    getUser.mockResolvedValue({ data: { user: null }, error: null });
    const { requireAuthenticatedUser } = await import("./session");
    await expect(requireAuthenticatedUser()).rejects.toThrow("NEXT_REDIRECT:/login");
    expect(redirect).toHaveBeenCalledWith("/login");
  });
});
