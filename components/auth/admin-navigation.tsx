import Link from "next/link";
import { logoutAction } from "@/app/login/actions";

export function AdminNavigation({ current }: { current: "admin" | "importacao" }) {
  const common = "rounded-full border px-3 py-2 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500";
  const active = "border-amber-500/40 bg-amber-500/15 text-amber-200";
  const inactive = "border-white/10 text-zinc-400 hover:bg-white/[0.06] hover:text-zinc-200";

  return (
    <nav className="flex flex-wrap gap-2" aria-label="Navegação administrativa">
      <Link href="/" className={`${common} ${inactive}`}>Avaliar</Link>
      <Link href="/admin" aria-current={current === "admin" ? "page" : undefined} className={`${common} ${current === "admin" ? active : inactive}`}>Admin</Link>
      <Link href="/importacao" aria-current={current === "importacao" ? "page" : undefined} className={`${common} ${current === "importacao" ? active : inactive}`}>Importação</Link>
      <form action={logoutAction}>
        <button type="submit" className={`${common} ${inactive}`}>Sair</button>
      </form>
    </nav>
  );
}
