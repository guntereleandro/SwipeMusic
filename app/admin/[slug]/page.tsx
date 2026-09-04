import { notFound } from "next/navigation";
import { AdminDashboard } from "@/components/admin/admin-dashboard";
import { AdminNavigation } from "@/components/auth/admin-navigation";
import { requireAuthenticatedUser } from "@/lib/auth/session";
import { getLibraryBySlug } from "@/lib/supabase/repositories/libraries";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LibraryAdminPage({ params }: PageProps<"/admin/[slug]">) {
  await requireAuthenticatedUser();
  const { slug } = await params;
  const library = await getLibraryBySlug(slug, await createServerSupabaseClient());
  if (!library) notFound();
  return <main className="min-h-screen bg-[#111113] px-3 py-5 text-zinc-50 sm:px-6 lg:px-8"><div className="mx-auto w-full max-w-[1280px]">
    <header className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold text-amber-400">SwipeMusic</p><h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{library.name}</h1><p className="mt-1 text-sm text-zinc-500">Avaliações e progresso desta biblioteca.</p></div><AdminNavigation current="admin" /></header>
    <AdminDashboard libraryId={library.id} />
  </div></main>;
}
