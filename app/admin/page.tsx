import Link from "next/link";
import { AdminNavigation } from "@/components/auth/admin-navigation";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { listLibraries } from "@/lib/supabase/repositories/libraries";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  await requireAuthenticatedUser();
  const client = await createServerSupabaseClient();
  const libraries = await listLibraries(client);
  const summaries = await Promise.all(libraries.map(async (library) => {
    const [{ count: songs }, { count: ratings }] = await Promise.all([
      client.from("songs").select("id", { count: "exact", head: true }).eq("library_id", library.id),
      client.from("ratings").select("id, songs!inner(library_id)", { count: "exact", head: true }).eq("songs.library_id", library.id),
    ]);
    return { ...library, songs: songs ?? 0, ratings: ratings ?? 0 };
  }));

  return (
    <main className="min-h-screen bg-[#111113] px-3 py-5 text-zinc-50 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1280px]">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold text-amber-400">SwipeMusic</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Bibliotecas</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">Escolha uma biblioteca para acompanhar suas avaliações.</p>
          </div>
          <AdminNavigation current="admin" />
        </header>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{summaries.map((library) => (
          <article key={library.id} className="rounded-2xl border border-white/10 bg-[#1c1c1f] p-6">
            <h2 className="text-xl font-bold">{library.name}</h2>
            <p className="mt-3 text-sm text-zinc-400">{library.songs.toLocaleString("pt-BR")} músicas</p>
            <p className="mt-1 text-sm text-zinc-400">{library.ratings.toLocaleString("pt-BR")} avaliadas</p>
            <Link href={`/admin/${library.slug}`} className="mt-5 inline-flex rounded-xl bg-amber-600 px-4 py-2 text-sm font-bold text-white hover:bg-amber-500">Abrir</Link>
          </article>
        ))}</div>
      </div>
    </main>
  );
}
