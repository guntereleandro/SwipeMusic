"use client";

import { useMemo, useState } from "react";
import { ImportFilters } from "@/components/import-review/import-filters";
import { ImportTable } from "@/components/import-review/import-table";
import { filterImportDecisions, sortImportDecisions, type ImportFilter, type ImportSortKey } from "@/lib/import-plan/filter-import-plan";
import type { ImportPlanReport } from "@/types/import-plan";

const PAGE_SIZE = 50;

export function ImportReview({ report }: { report: ImportPlanReport }) {
  const [filter, setFilter] = useState<ImportFilter>("ALL");
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<ImportSortKey>("action");
  const [page, setPage] = useState(1);
  const filtered = useMemo(() => sortImportDecisions(filterImportDecisions(report.decisions, filter, query), sort), [filter, query, report.decisions, sort]);
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const legacyReport = report.decisions.length > 0 && report.decisions.every((decision) => !decision.resolved_title && !decision.resolved_artist);

  return (
    <>
      {legacyReport && <p className="mt-5 rounded-xl border border-amber-400/20 bg-amber-400/[0.07] px-4 py-3 text-sm leading-6 text-amber-200">Este plano foi gerado no formato anterior. Ações, grupos e qualidade estão disponíveis, mas título/artista resolvidos exigem gerar novamente o comando <code>--plan</code>.</p>}
      <ImportFilters filter={filter} query={query} sort={sort} onFilter={(value) => { setFilter(value); setPage(1); }} onQuery={(value) => { setQuery(value); setPage(1); }} onSort={(value) => { setSort(value); setPage(1); }} />
      <div className="mt-4 flex items-center justify-between text-xs text-zinc-500"><span>{filtered.length.toLocaleString("pt-BR")} resultados</span><span>Página {currentPage} de {totalPages}</span></div>
      {pageRows.length ? <ImportTable decisions={pageRows} allDecisions={report.decisions} groups={report.duplicate_groups} /> : <div className="mt-4 rounded-2xl border border-white/[0.08] bg-[#1c1c1f] p-8 text-center text-sm text-zinc-500">Nenhuma música corresponde aos filtros.</div>}
      <nav className="mt-5 flex justify-center gap-2" aria-label="Paginação">
        <button type="button" disabled={currentPage === 1} onClick={() => setPage(Math.max(1, currentPage - 1))} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:bg-white/[0.05] disabled:opacity-30">Anterior</button>
        <button type="button" disabled={currentPage === totalPages} onClick={() => setPage(Math.min(totalPages, currentPage + 1))} className="rounded-xl border border-white/10 px-4 py-2 text-sm text-zinc-300 hover:bg-white/[0.05] disabled:opacity-30">Próxima</button>
      </nav>
    </>
  );
}
