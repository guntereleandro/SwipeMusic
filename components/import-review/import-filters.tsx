import type { ImportFilter, ImportSortKey } from "@/lib/import-plan/filter-import-plan";

const filters: Array<[ImportFilter, string]> = [
  ["ALL", "Todos"], ["IMPORT", "Importar"], ["IGNORE", "Ignorar"],
  ["EXACT", "Exact"], ["LIKELY", "Likely"], ["POSSIBLE", "Possible"], ["REVIEW", "Needs Review"],
];

export function ImportFilters(props: {
  filter: ImportFilter;
  query: string;
  sort: ImportSortKey;
  onFilter: (filter: ImportFilter) => void;
  onQuery: (query: string) => void;
  onSort: (sort: ImportSortKey) => void;
}) {
  return (
    <section className="mt-6 space-y-3 rounded-2xl border border-white/[0.08] bg-[#1c1c1f] p-3">
      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map(([value, label]) => (
          <button key={value} type="button" onClick={() => props.onFilter(value)} className={`shrink-0 rounded-full border px-3 py-2 text-xs font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 ${props.filter === value ? "border-amber-500/40 bg-amber-500/15 text-amber-200" : "border-white/10 text-zinc-400 hover:bg-white/[0.06]"}`}>
            {label}
          </button>
        ))}
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_13rem]">
        <input value={props.query} onChange={(event) => props.onQuery(event.target.value)} placeholder="Buscar título, artista, filename ou pasta" className="min-w-0 rounded-xl border border-white/10 bg-black/20 px-3 py-2.5 text-sm text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-amber-500/50" />
        <select value={props.sort} onChange={(event) => props.onSort(event.target.value as ImportSortKey)} className="rounded-xl border border-white/10 bg-[#171719] px-3 py-2.5 text-sm text-zinc-300 outline-none focus:border-amber-500/50">
          <option value="action">Ordenar por ação</option><option value="title">Título</option><option value="artist">Artista</option><option value="duplicate">Duplicidade</option><option value="metadata">Metadados</option><option value="bitrate">Bitrate</option><option value="group">Grupo</option>
        </select>
      </div>
    </section>
  );
}
