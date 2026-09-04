"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CheckIcon, UndoIcon } from "@/components/icons";
import { RatingActions } from "@/components/rating-actions";
import { SwipeableMusicCard } from "@/components/swipeable-music-card";
import type { RatingRow, SongRow } from "@/lib/supabase/database.types";
import {
  listRatings,
  saveRating,
  undoLastRating as deleteLastRating,
} from "@/lib/supabase/repositories/ratings";
import { listSongs } from "@/lib/supabase/repositories/songs";
import { getAudioUrl, getCoverUrl } from "@/lib/supabase/media";
import { getLibraryProgress } from "@/lib/music/library";
import { buildSessionQueue, restoreSongForUndo } from "@/lib/music/session-queue";
import {
  continuousPlaybackAfterManualAction,
  INITIAL_CONTINUOUS_PLAYBACK,
  shouldAutoPlayReplacement,
} from "@/lib/music/continuous-playback";
import type { Rating, Song, SongStatus } from "@/types/song";

type OperationError = {
  kind: "LOAD" | "SAVE" | "UNDO";
  message: string;
};

function isRating(value: string): value is Rating {
  return value === "LIKE" || value === "NEUTRAL" || value === "DISLIKE";
}

function toSong(song: SongRow, rating?: RatingRow): Song {
  const status: SongStatus = rating && isRating(rating.rating) ? rating.rating : "PENDING";

  return {
    id: song.id,
    title: song.title,
    artist: song.artist ?? "Artista desconhecido",
    coverUrl: getCoverUrl(song.cover_path),
    audioUrl: getAudioUrl(song.audio_path),
    status,
  };
}

async function fetchMusicLibrary(libraryId: string) {
  const [songRows, ratingRows] = await Promise.all([listSongs(libraryId), listRatings(libraryId)]);
  const ratingBySongId = new Map(ratingRows.map((rating) => [rating.song_id, rating]));

  const songs = songRows.map((song) => toSong(song, ratingBySongId.get(song.id)));
  const pendingQueue = buildSessionQueue(songs);
  const ratedSongs = songs.filter((song) => song.status !== "PENDING");

  return {
    songs: [...pendingQueue, ...ratedSongs],
    history: ratingRows.map((rating) => rating.song_id),
  };
}

function getErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function MusicRater({ libraryId, libraryName, onOpenTutorial }: { libraryId: string; libraryName: string; onOpenTutorial?: () => void }) {
  const operationLock = useRef(false);
  const [songs, setSongs] = useState<Song[]>([]);
  const [history, setHistory] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [continuousPlaybackEnabled, setContinuousPlaybackEnabled] = useState(
    INITIAL_CONTINUOUS_PLAYBACK,
  );
  const [error, setError] = useState<OperationError | null>(null);

  const currentSong = songs.find((song) => song.status === "PENDING");
  const progress = getLibraryProgress(songs);

  const loadLibrary = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const library = await fetchMusicLibrary(libraryId);
      setSongs(library.songs);
      setHistory(library.history);
    } catch (loadError) {
      setError({
        kind: "LOAD",
        message: getErrorMessage(loadError, "Não foi possível carregar a biblioteca."),
      });
    } finally {
      setIsLoading(false);
    }
  }, [libraryId]);

  useEffect(() => {
    let cancelled = false;

    void fetchMusicLibrary(libraryId)
      .then((library) => {
        if (cancelled) return;
        setSongs(library.songs);
        setHistory(library.history);
      })
      .catch((loadError: unknown) => {
        if (cancelled) return;
        setError({
          kind: "LOAD",
          message: getErrorMessage(loadError, "Não foi possível carregar a biblioteca."),
        });
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [libraryId]);

  async function rateCurrentSong(rating: Rating): Promise<boolean> {
    if (!currentSong || operationLock.current) return false;

    operationLock.current = true;
    setIsSaving(true);
    setError(null);

    try {
      await saveRating(currentSong.id, rating, libraryId);
      setSongs((currentSongs) =>
        currentSongs.map((song) =>
          song.id === currentSong.id ? { ...song, status: rating } : song,
        ),
      );
      setHistory((currentHistory) => [...currentHistory, currentSong.id]);
      return true;
    } catch (saveError) {
      setError({
        kind: "SAVE",
        message: getErrorMessage(saveError, "Não foi possível salvar a avaliação."),
      });
      return false;
    } finally {
      operationLock.current = false;
      setIsSaving(false);
    }
  }

  async function undoLastRating() {
    if (operationLock.current) return;

    operationLock.current = true;
    setIsSaving(true);
    setError(null);

    try {
      const undoneRating = await deleteLastRating(libraryId);
      if (!undoneRating) return;

      setSongs((currentSongs) => restoreSongForUndo(currentSongs, undoneRating.song_id));
      setHistory((currentHistory) => currentHistory.slice(0, -1));
    } catch (undoError) {
      setError({
        kind: "UNDO",
        message: getErrorMessage(undoError, "Não foi possível desfazer a avaliação."),
      });
    } finally {
      operationLock.current = false;
      setIsSaving(false);
    }
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
              {libraryName}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            {onOpenTutorial && <button type="button" onClick={onOpenTutorial} className="min-h-11 rounded-lg px-2 text-xs font-semibold text-zinc-500 hover:bg-white/[0.05] hover:text-zinc-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500">Como funciona?</button>}
            <p className="text-xs font-medium tabular-nums text-zinc-400" aria-live="polite">
              <strong className="text-zinc-100">{progress.evaluated}</strong> de {progress.total}{" "}
              avaliadas
            </p>
          </div>
        </header>

        {isLoading ? (
          <section className="my-auto text-center" aria-live="polite">
            <span className="mx-auto block size-8 animate-spin rounded-full border-2 border-white/15 border-t-amber-500" />
            <p className="mt-4 text-sm text-zinc-400">Carregando músicas...</p>
          </section>
        ) : error?.kind === "LOAD" ? (
          <section className="my-auto rounded-[1.75rem] border border-rose-400/20 bg-[#1c1c1f] p-7 text-center shadow-[0_24px_70px_-28px_rgba(0,0,0,0.8)]">
            <h2 className="text-xl font-bold text-zinc-50">Falha ao carregar</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">{error.message}</p>
            <button
              type="button"
              onClick={() => void loadLibrary()}
              className="mt-5 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-amber-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400"
            >
              Tentar novamente
            </button>
          </section>
        ) : currentSong ? (
          <div className="flex flex-1 flex-col justify-center">
            <SwipeableMusicCard
              song={currentSong}
              disabled={isSaving}
              autoPlayOnMount={shouldAutoPlayReplacement(continuousPlaybackEnabled)}
              onManualPlaybackChange={(isPlaying) =>
                setContinuousPlaybackEnabled(
                  continuousPlaybackAfterManualAction(isPlaying ? "PLAY" : "PAUSE"),
                )
              }
              onSwipe={rateCurrentSong}
            >
              <RatingActions disabled={isSaving} onRate={rateCurrentSong} />
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

        {error && error.kind !== "LOAD" && (
          <p
            role="alert"
            className="mt-3 rounded-xl border border-rose-400/20 bg-rose-400/10 px-3 py-2 text-center text-xs leading-5 text-rose-200"
          >
            {error.message} Tente novamente.
          </p>
        )}

        <footer className="mt-2.5 flex min-h-9 justify-center sm:mt-3">
          {!isLoading && history.length > 0 && (
            <button
              type="button"
              data-swipe-ignore="true"
              disabled={isSaving}
              onClick={() => void undoLastRating()}
              className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-semibold text-zinc-500 transition hover:bg-white/[0.06] hover:text-zinc-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 active:scale-[0.98] disabled:cursor-wait disabled:opacity-50"
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
