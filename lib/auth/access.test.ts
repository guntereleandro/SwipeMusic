import { describe, expect, it } from "vitest";
import { getPostLogoutPath, isProtectedPath, resolveRouteAccess } from "./access";

describe("controle de acesso", () => {
  it.each(["/admin", "/admin/detalhes", "/importacao"])(
    "redireciona %s sem usuário para o login",
    (pathname) => {
      expect(resolveRouteAccess(pathname, false)).toEqual({ kind: "redirect", destination: "/login" });
    },
  );

  it.each(["/admin", "/importacao"])("permite %s com usuário", (pathname) => {
    expect(resolveRouteAccess(pathname, true)).toEqual({ kind: "allow" });
  });

  it("mantém a avaliação pública", () => {
    expect(isProtectedPath("/")).toBe(false);
    expect(resolveRouteAccess("/", false)).toEqual({ kind: "allow" });
  });

  it("mantém a API pública de áudio fora da proteção administrativa", () => {
    expect(isProtectedPath("/api/media/audio")).toBe(false);
    expect(resolveRouteAccess("/api/media/audio", false)).toEqual({ kind: "allow" });
  });

  it("manda usuário autenticado do login para o admin", () => {
    expect(resolveRouteAccess("/login", true)).toEqual({ kind: "redirect", destination: "/admin" });
  });

  it("define o destino esperado após logout", () => {
    expect(getPostLogoutPath()).toBe("/login");
  });
});
