import { notFound } from "next/navigation";
import { TutorialGate } from "@/components/tutorial/tutorial-gate";
import { getLibraryBySlug } from "@/lib/supabase/repositories/libraries";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function LibraryPage({ params }: PageProps<"/[slug]">) {
  const { slug } = await params;
  const library = await getLibraryBySlug(slug, await createServerSupabaseClient());
  if (!library) notFound();
  return <TutorialGate libraryId={library.id} libraryName={library.name} librarySlug={library.slug} />;
}
