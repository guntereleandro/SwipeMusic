import type { Rating } from "@/types/song";

const labels: Record<Rating, string> = {
  LIKE: "Gostei",
  NEUTRAL: "Indiferente",
  DISLIKE: "Não gostei",
};

const styles: Record<Rating, string> = {
  LIKE: "border-emerald-400/20 bg-emerald-400/10 text-emerald-200",
  NEUTRAL: "border-zinc-400/20 bg-zinc-400/10 text-zinc-300",
  DISLIKE: "border-rose-400/20 bg-rose-400/10 text-rose-200",
};

export function RatingBadge({ rating }: { rating: Rating }) {
  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[rating]}`}>
      {labels[rating]}
    </span>
  );
}
