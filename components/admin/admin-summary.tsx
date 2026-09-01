import type { AdminStats } from "@/lib/admin/admin-data";

const cards: Array<{ key: keyof AdminStats; label: string }> = [
  { key: "total", label: "Total de músicas" },
  { key: "evaluated", label: "Avaliadas" },
  { key: "remaining", label: "Restantes" },
  { key: "percentComplete", label: "Concluído" },
  { key: "like", label: "Gostei" },
  { key: "neutral", label: "Indiferente" },
  { key: "dislike", label: "Não gostei" },
];

export function AdminSummary({ stats }: { stats: AdminStats }) {
  return (
    <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7" aria-label="Resumo da biblioteca">
      {cards.map((card) => (
        <article key={card.key} className="rounded-2xl border border-white/[0.08] bg-[#1c1c1f] p-4 shadow-sm">
          <p className="text-xs font-medium text-zinc-500">{card.label}</p>
          <p className="mt-2 text-2xl font-bold tabular-nums text-zinc-100">
            {stats[card.key].toLocaleString("pt-BR")}
            {card.key === "percentComplete" ? "%" : ""}
          </p>
        </article>
      ))}
    </section>
  );
}
