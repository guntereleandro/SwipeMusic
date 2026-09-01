"use client";

import { useEffect, useRef, useState } from "react";
import { PauseIcon, PlayIcon } from "@/components/icons";
import { isCurrentPlaybackRequest } from "@/lib/music/continuous-playback";

type AudioPlayerProps = {
  src: string;
  title: string;
  autoPlayOnMount: boolean;
  onManualPlaybackChange: (isPlaying: boolean) => void;
};

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

export function AudioPlayer({
  src,
  title,
  autoPlayOnMount,
  onManualPlaybackChange,
}: AudioPlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const autoPlayOnMountRef = useRef(autoPlayOnMount);
  const playbackRequestRef = useRef(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [hasError, setHasError] = useState(false);
  const progress = duration ? (currentTime / duration) * 100 : 0;

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    let cancelled = false;
    const requestId = ++playbackRequestRef.current;

    async function startFromBeginning() {
      const currentAudio = audioRef.current;
      if (
        !currentAudio ||
        currentAudio !== audio ||
        !isCurrentPlaybackRequest(requestId, playbackRequestRef.current, cancelled)
      ) {
        return;
      }

      currentAudio.currentTime = 0;

      try {
        await currentAudio.play();
        if (!isCurrentPlaybackRequest(requestId, playbackRequestRef.current, cancelled)) {
          currentAudio.pause();
        }
      } catch {
        if (isCurrentPlaybackRequest(requestId, playbackRequestRef.current, cancelled)) {
          setIsPlaying(false);
        }
      }
    }

    if (autoPlayOnMountRef.current) {
      if (audio.readyState >= 2) {
        void startFromBeginning();
      } else {
        audio.addEventListener("canplay", startFromBeginning, { once: true });
      }
    }

    return () => {
      cancelled = true;
      playbackRequestRef.current += 1;
      audio.removeEventListener("canplay", startFromBeginning);
      audio.pause();
      audio.currentTime = 0;
    };
  }, [src]);

  async function togglePlayback() {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      const requestId = ++playbackRequestRef.current;
      onManualPlaybackChange(true);
      try {
        await audio.play();
        if (
          audioRef.current !== audio ||
          !isCurrentPlaybackRequest(requestId, playbackRequestRef.current, false)
        ) {
          audio.pause();
        }
      } catch {
        if (
          audioRef.current === audio &&
          isCurrentPlaybackRequest(requestId, playbackRequestRef.current, false)
        ) {
          setIsPlaying(false);
        }
      }
    } else {
      playbackRequestRef.current += 1;
      onManualPlaybackChange(false);
      audio.pause();
    }
  }

  function seek(value: number) {
    const audio = audioRef.current;
    if (!audio) return;

    audio.currentTime = value;
    setCurrentTime(value);
  }

  return (
    <div
      className="rounded-2xl bg-white/[0.055] px-4 py-3.5"
      data-swipe-ignore="true"
    >
      <audio
        ref={audioRef}
        src={src}
        preload="metadata"
        onLoadedMetadata={(event) => {
          setDuration(event.currentTarget.duration);
          setHasError(false);
        }}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
        onError={() => setHasError(true)}
      />

      <div className="flex items-center gap-3.5">
        <button
          type="button"
          onClick={togglePlayback}
          disabled={hasError}
          aria-label={isPlaying ? `Pausar ${title}` : `Reproduzir ${title}`}
          className="grid size-11 shrink-0 place-items-center rounded-full bg-amber-600 text-white shadow-sm transition duration-200 hover:bg-amber-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-400 active:scale-95 disabled:cursor-not-allowed disabled:bg-white/15 disabled:text-white/40"
        >
          {isPlaying ? (
            <PauseIcon className="size-5" />
          ) : (
            <PlayIcon className="ml-0.5 size-5" />
          )}
        </button>

        <div className="min-w-0 flex-1">
          <input
            type="range"
            min={0}
            max={duration || 0}
            step="0.1"
            value={Math.min(currentTime, duration || 0)}
            onChange={(event) => seek(Number(event.target.value))}
            disabled={!duration}
            aria-label={`Posição de reprodução de ${title}`}
            style={{
              background: `linear-gradient(to right, #d97706 ${progress}%, #4b4b50 ${progress}%)`,
            }}
            className="audio-range w-full cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
          />
          <div className="mt-2 flex justify-between font-mono text-[11px] tabular-nums text-zinc-400">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
      </div>

      {hasError && (
        <p className="mt-2 text-center text-[11px] text-zinc-500" role="status">
          Não foi possível carregar o áudio desta música.
        </p>
      )}
    </div>
  );
}
