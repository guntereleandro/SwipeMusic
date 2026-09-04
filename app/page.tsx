import Link from "next/link";
import { listLibraries } from "@/lib/supabase/repositories/libraries";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function Home() {
  const libraries = await listLibraries(await createServerSupabaseClient());
  return <main className="min-h-screen bg-[#111113] px-4 py-12 text-zinc-50"><div className="mx-auto max-w-3xl">
    <p className="text-sm font-semibold text-amber-400">SwipeMusic</p>
    <h1 className="mt-3 text-3xl font-bold tracking-tight">Qual biblioteca você deseja acessar?</h1>
    <div className="mt-8 grid gap-4 sm:grid-cols-2">{libraries.map((library) => (
      <Link key={library.id} href={`/${library.slug}`} className="rounded-2xl border border-white/10 bg-[#1c1c1f] p-6 transition hover:border-amber-500/40 hover:bg-[#222225]">
        <h2 className="text-xl font-bold">{library.name}</h2><p className="mt-1 text-sm text-zinc-500">Abrir biblioteca →</p>
      </Link>
    ))}</div>
  </div></main>;
}
