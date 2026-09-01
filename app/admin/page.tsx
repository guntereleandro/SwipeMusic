import Link from "next/link";
import { AdminDashboard } from "@/components/admin/admin-dashboard";

export default function AdminPage() {
  return (
    <main className="min-h-screen bg-[#111113] px-3 py-5 text-zinc-50 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1280px]">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-amber-400">SwipeMusic</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Acompanhamento da biblioteca</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">Visão somente leitura das avaliações e do progresso geral.</p>
          </div>
          <nav className="flex flex-wrap gap-2" aria-label="Navegação principal">
            <Link href="/" className="rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-400 transition hover:bg-white/[0.06] hover:text-zinc-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500">Avaliar músicas</Link>
            <Link href="/admin" aria-current="page" className="rounded-full border border-amber-500/40 bg-amber-500/15 px-3 py-2 text-xs font-semibold text-amber-200">Admin</Link>
            <Link href="/importacao" className="rounded-full border border-white/10 px-3 py-2 text-xs font-semibold text-zinc-400 transition hover:bg-white/[0.06] hover:text-zinc-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500">Importação</Link>
          </nav>
        </header>

        <AdminDashboard />
      </div>
    </main>
  );
}
