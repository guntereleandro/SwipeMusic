import { notFound } from "next/navigation";
import { MusicRater } from "@/components/music-rater";
import { getLibraryBySlug } from "@/lib/supabase/repositories/libraries";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LibraryPage({ params }: PageProps<"/[slug]">) {
  const { slug } = await params;
  const library = await getLibraryBySlug(slug, await createServerSupabaseClient());
  if (!library) notFound();
  return <MusicRater libraryId={library.id} libraryName={library.name} />;
}
