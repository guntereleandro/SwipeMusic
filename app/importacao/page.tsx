import Link from "next/link";
import { ImportReview } from "@/components/import-review/import-review";
import { ImportSummary } from "@/components/import-review/import-summary";
import { getLatestImportPlan } from "@/lib/import-plan/read-import-plan";

export const dynamic = "force-dynamic";

export default async function ImportacaoPage() {
  const result = await getLatestImportPlan();

  return (
    <main className="min-h-screen bg-[#111113] px-3 py-5 text-zinc-50 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-[1500px]">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <Link href="/" className="text-xs font-semibold text-amber-400 transition hover:text-amber-300">← Voltar para avaliação</Link>
            <h1 className="mt-3 text-2xl font-bold tracking-tight sm:text-3xl">Revisão do plano de importação</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-zinc-500">Visualização somente leitura. Esta tela não importa, exclui ou modifica músicas.</p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-zinc-400">SwipeMusic · Biblioteca</span>
        </header>

        {result.status === "empty" ? (
          <section className="mt-10 rounded-3xl border border-white/[0.08] bg-[#1c1c1f] p-10 text-center">
            <h2 className="text-xl font-bold">Nenhum plano de importação foi gerado ainda.</h2>
            <p className="mt-2 text-sm text-zinc-500">Execute o comando com <code className="text-zinc-300">--plan</code> e recarregue esta página.</p>
          </section>
        ) : result.status === "error" ? (
          <section className="mt-10 rounded-3xl border border-rose-400/20 bg-rose-400/[0.07] p-8 text-center">
            <h2 className="text-xl font-bold text-rose-200">Não foi possível abrir o plano</h2>
            <p className="mt-2 text-sm text-rose-200/70">O relatório mais recente está inválido ou incompatível.</p>
            <p className="mt-3 text-xs text-zinc-500">{result.message}</p>
          </section>
        ) : (
          <div className="mt-7">
            <ImportSummary report={result.report} />
            <ImportReview report={result.report} />
          </div>
        )}
      </div>
    </main>
  );
}
