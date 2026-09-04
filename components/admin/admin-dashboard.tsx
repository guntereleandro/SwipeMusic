"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminControls } from "@/components/admin/admin-controls";
import { AdminRatingList } from "@/components/admin/admin-rating-list";
import { AdminSummary } from "@/components/admin/admin-summary";
import {
  calculateAdminStats,
  filterAdminRatings,
  joinRatingsWithSongs,
  paginateAdminRatings,
  sortAdminRatings,
  type AdminRatingFilter,
  type AdminRatingItem,
  type AdminRatingSort,
  type AdminStats,
} from "@/lib/admin/admin-data";
import { listRatings } from "@/lib/supabase/repositories/ratings";
import { listSongs } from "@/lib/supabase/repositories/songs";

const PAGE_SIZE = 50;

type DashboardData = {
  items: AdminRatingItem[];
  stats: AdminStats;
};

async function fetchDashboardData(libraryId: string): Promise<DashboardData> {
  const [songs, ratings] = await Promise.all([listSongs(libraryId), listRatings(libraryId)]);
  const items = joinRatingsWithSongs(songs, ratings);
  return { items, stats: calculateAdminStats(songs.length, items) };
}

export function AdminDashboard({ libraryId }: { libraryId: string }) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<AdminRatingFilter>("ALL");
  const [sort, setSort] = useState<AdminRatingSort>("NEWEST");
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;

    void fetchDashboardData(libraryId)
      .then((result) => {
        if (cancelled) return;
        setData(result);
      })
      .catch((loadError: unknown) => {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar o painel.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [libraryId]);

  const filteredItems = useMemo(() => {
    if (!data) return [];
    return sortAdminRatings(filterAdminRatings(data.items, filter, query), sort);
  }, [data, filter, query, sort]);

  const pagination = paginateAdminRatings(filteredItems, page, PAGE_SIZE);

  async function retry() {
    setIsLoading(true);
    setError(null);
    try {
      setData(await fetchDashboardData(libraryId));
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Não foi possível carregar o painel.");
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return <section className="mt-16 text-center" aria-live="polite"><span className="mx-auto block size-8 animate-spin rounded-full border-2 border-white/15 border-t-amber-500" /><p className="mt-4 text-sm text-zinc-400">Carregando biblioteca completa...</p></section>;
  }

  if (error || !data) {
    return (
      <section className="mt-10 rounded-3xl border border-rose-400/20 bg-rose-400/[0.07] p-8 text-center">
        <h2 className="text-xl font-bold text-rose-200">Não foi possível carregar o admin</h2>
        <p className="mt-2 text-sm text-rose-200/70">{error ?? "Erro desconhecido."}</p>
        <button type="button" onClick={() => void retry()} className="mt-5 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-amber-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400">Tentar novamente</button>
      </section>
    );
  }

  return (
    <div className="mt-7">
      <AdminSummary stats={data.stats} />
      <AdminControls
        filter={filter}
        query={query}
        sort={sort}
        onFilter={(value) => { setFilter(value); setPage(1); }}
        onQuery={(value) => { setQuery(value); setPage(1); }}
        onSort={(value) => { setSort(value); setPage(1); }}
      />

      <div className="mt-4 flex items-center justify-between text-xs text-zinc-500">
        <span>{filteredItems.length.toLocaleString("pt-BR")} avaliações</span>
        <span>Página {pagination.currentPage} de {pagination.totalPages}</span>
      </div>

      {pagination.items.length ? (
        <AdminRatingList items={pagination.items} />
      ) : (
        <section className="mt-4 rounded-2xl border border-white/[0.08] bg-[#1c1c1f] p-10 text-center text-sm text-zinc-500">
          {data.items.length === 0 ? "Nenhuma música foi avaliada ainda." : "Nenhuma avaliação corresponde à busca ou ao filtro."}
        </section>
      )}

      {filteredItems.length > 0 && (
        <nav className="mt-5 flex justify-center gap-2" aria-label="Paginação das avaliações">
          <button type="button" disabled={pagination.currentPage === 1} onClick={() => setPage(pagination.currentPage - 1)} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/[0.05] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 disabled:opacity-30">Anterior</button>
          <button type="button" disabled={pagination.currentPage === pagination.totalPages} onClick={() => setPage(pagination.currentPage + 1)} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300 transition hover:bg-white/[0.05] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 disabled:opacity-30">Próxima</button>
        </nav>
      )}
    </div>
  );
}
