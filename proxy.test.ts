import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { unstable_doesMiddlewareMatch, getRedirectUrl } from "next/experimental/testing/server";
import { config, proxy } from "./proxy";

let authenticated = false;

vi.mock("@supabase/ssr", () => ({
  createServerClient: () => ({
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: authenticated ? { id: "admin-user" } : null },
        error: null,
      })),
    },
  }),
}));

describe("proxy de autenticação", () => {
  beforeEach(() => {
    authenticated = false;
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY = "test-publishable-key";
  });

  afterEach(() => {
    delete process.env.NEXT_PUBLIC_SUPABASE_URL;
    delete process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  });

  it.each(["/admin", "/admin/detalhes", "/importacao", "/importacao/revisao"])(
    "executa no Next.js 16 para %s",
    (url) => {
      expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(true);
    },
  );

  it.each(["/", "/api/media/audio", "/_next/static/chunk.js", "/covers/default.svg"])(
    "não intercepta a rota pública %s",
    (url) => {
      expect(unstable_doesMiddlewareMatch({ config, nextConfig: {}, url })).toBe(false);
    },
  );

  it.each(["/admin", "/importacao"])(
    "visitante sem cookie recebe 307 de %s para /login",
    async (path) => {
      const response = await proxy(new NextRequest(`http://localhost${path}`));
      expect(response.status).toBe(307);
      expect(getRedirectUrl(response)).toBe("http://localhost/login");
    },
  );

  it("usuário validado por getUser consegue acessar /admin", async () => {
    authenticated = true;
    const response = await proxy(new NextRequest("http://localhost/admin"));
    expect(response.status).toBe(200);
    expect(getRedirectUrl(response)).toBeNull();
  });
});
