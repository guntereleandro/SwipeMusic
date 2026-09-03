import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { AdminNavigation } from "@/components/auth/admin-navigation";
import { requireAuthenticatedUser } from "@/lib/auth/session";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAuthenticatedUser();

  return (
    <main className="min-h-screen bg-[#111113] px-3 py-5 text-zinc-50 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1280px]">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-amber-400">SwipeMusic</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Acompanhamento da biblioteca</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">Visão somente leitura das avaliações e do progresso geral.</p>
          </div>
          <AdminNavigation current="admin" />
        </header>

        <AdminDashboard />
      </div>
    </main>
  );
}
