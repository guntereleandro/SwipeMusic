import type { AdminRatingFilter, AdminRatingSort } from "@/lib/admin/admin-data";

const filters: Array<[AdminRatingFilter, string]> = [
  ["ALL", "Todas"],
  ["LIKE", "Gostei"],
  ["NEUTRAL", "Indiferente"],
  ["DISLIKE", "Não gostei"],
];

export function AdminControls(props: {
  filter: AdminRatingFilter;
  query: string;
  sort: AdminRatingSort;
  onFilter: (filter: AdminRatingFilter) => void;
  onQuery: (query: string) => void;
  onSort: (sort: AdminRatingSort) => void;
}) {
  return (
    <section className="mt-6 space-y-3 rounded-2xl border border-white/[0.08] bg-[#1c1c1f] p-3" aria-label="Busca e filtros">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => props.onFilter(value)}
            className={`shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 ${props.filter === value ? "border-amber-500/40 bg-amber-500/15 text-amber-200" : "border-white/10 text-zinc-400 hover:bg-white/[0.06]"}`}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_14rem]">
        <input
          value={props.query}
          onChange={(event) => props.onQuery(event.target.value)}
          placeholder="Buscar por título ou artista"
          aria-label="Buscar avaliações"
          className="min-w-0 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-amber-500/50"
        />
        <select
          value={props.sort}
          onChange={(event) => props.onSort(event.target.value as AdminRatingSort)}
          aria-label="Ordenar avaliações"
          className="rounded-xl border border-white/10 bg-[#171719] px-3 py-2.5 text-sm text-zinc-300 outline-none focus:border-amber-500/50"
        >
          <option value="NEWEST">Mais recentes primeiro</option>
          <option value="OLDEST">Mais antigas primeiro</option>
          <option value="TITLE_ASC">Título A–Z</option>
          <option value="TITLE_DESC">Título Z–A</option>
        </select>
      </div>
    </section>
  );
}
