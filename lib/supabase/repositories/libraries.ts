import type { SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseClient } from "../client";
import type { Database, LibraryRow } from "../database.types";
import { listAllPages } from "./pagination";

export async function listLibraries(suppliedClient?: SupabaseClient<Database>): Promise<LibraryRow[]> {
  const client = suppliedClient ?? getSupabaseClient();
  return listAllPages(async (from, to) => {
    const { data, error } = await client.from("libraries").select("*")
      .order("created_at", { ascending: true }).order("id", { ascending: true }).range(from, to);
    if (error) throw new Error(`Não foi possível listar as bibliotecas: ${error.message}`);
    return data;
  });
}

export async function getLibraryBySlug(slug: string, suppliedClient?: SupabaseClient<Database>): Promise<LibraryRow | null> {
  const client = suppliedClient ?? getSupabaseClient();
  const { data, error } = await client.from("libraries").select("*").eq("slug", slug).maybeSingle();
  if (error) throw new Error(`Não foi possível carregar a biblioteca: ${error.message}`);
  return data;
}
