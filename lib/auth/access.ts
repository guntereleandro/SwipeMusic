export const LOGIN_PATH = "/login";
export const ADMIN_HOME_PATH = "/admin";

export type AccessDecision =
  | { kind: "allow" }
  | { kind: "redirect"; destination: string };

export function isProtectedPath(pathname: string) {
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/importacao" ||
    pathname.startsWith("/importacao/")
  );
}

export function resolveRouteAccess(
  pathname: string,
  isAuthenticated: boolean,
): AccessDecision {
  if (isProtectedPath(pathname) && !isAuthenticated) {
    return { kind: "redirect", destination: LOGIN_PATH };
  }

  if (pathname === LOGIN_PATH && isAuthenticated) {
    return { kind: "redirect", destination: ADMIN_HOME_PATH };
  }

  return { kind: "allow" };
}

export function getPostLogoutPath() {
  return LOGIN_PATH;
}
