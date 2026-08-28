"use client";

import { useState } from "react";
import { CheckIcon, UndoIcon } from "@/components/icons";
import { RatingActions } from "@/components/rating-actions";
import { SwipeableMusicCard } from "@/components/swipeable-music-card";
import type { Rating, Song } from "@/types/song";

type MusicRaterProps = {
  initialSongs: Song[];
};

export function MusicRater({ initialSongs }: MusicRaterProps) {
  const [songs, setSongs] = useState(initialSongs);
  const [history, setHistory] = useState<string[]>([]);

  const currentSong = songs.find((song) => song.status === "PENDING");
  const evaluatedCount = songs.filter((song) => song.status !== "PENDING").length;

  function rateCurrentSong(rating: Rating) {
    if (!currentSong) return;

    setSongs((currentSongs) =>
      currentSongs.map((song) =>
        song.id === currentSong.id ? { ...song, status: rating } : song,
      ),
    );
    setHistory((currentHistory) => [...currentHistory, currentSong.id]);
  }

  function undoLastRating() {
    const lastSongId = history.at(-1);
    if (!lastSongId) return;

    setSongs((currentSongs) =>
      currentSongs.map((song) =>
        song.id === lastSongId ? { ...song, status: "PENDING" } : song,
      ),
    );
    setHistory((currentHistory) => currentHistory.slice(0, -1));
  }

  return (
    <main className="min-h-[100svh] overflow-x-hidden bg-[#111113] px-3 py-4 text-zinc-50 sm:px-6 sm:py-6">
      <div className="mx-auto flex min-h-[calc(100svh-2rem)] w-full max-w-[460px] flex-col sm:min-h-[calc(100svh-3rem)]">
        <header className="mb-3.5 flex items-center justify-between px-1 sm:mb-4">
          <div className="flex items-center gap-2.5">
            <span className="grid size-8 place-items-center rounded-lg bg-amber-600 text-sm font-black text-white shadow-sm">
              S
            </span>
            <h1 className="text-[15px] font-bold tracking-tight text-zinc-100">
              SwipeMusic
            </h1>
          </div>
          <p className="text-xs font-medium tabular-nums text-zinc-400" aria-live="polite">
            <strong className="text-zinc-100">{evaluatedCount}</strong> de {songs.length}{" "}
            avaliadas
          </p>
        </header>

        {currentSong ? (
          <div className="flex flex-1 flex-col justify-center">
            <SwipeableMusicCard
              key={currentSong.id}
              song={currentSong}
              onSwipe={rateCurrentSong}
            >
              <RatingActions onRate={rateCurrentSong} />
            </SwipeableMusicCard>
          </div>
        ) : (
          <section className="my-auto rounded-[1.75rem] border border-white/[0.08] bg-[#1c1c1f] p-8 text-center shadow-[0_24px_70px_-28px_rgba(0,0,0,0.8)]">
            <div className="mx-auto grid size-14 place-items-center rounded-full bg-emerald-400/10 text-emerald-300 ring-1 ring-emerald-400/20">
              <CheckIcon className="size-8" />
            </div>
            <h2 className="mt-5 text-2xl font-bold tracking-tight text-zinc-50">
              Tudo avaliado!
            </h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              Você concluiu as {songs.length} músicas desta biblioteca.
            </p>
          </section>
        )}

        <footer className="mt-2.5 flex min-h-9 justify-center sm:mt-3">
          {history.length > 0 && (
            <button
              type="button"
              onClick={undoLastRating}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-zinc-500 transition hover:bg-white/[0.06] hover:text-zinc-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 active:scale-[0.98]"
            >
              <UndoIcon className="size-4" />
              Desfazer última avaliação
            </button>
          )}
        </footer>
      </div>
    </main>
  );
}
