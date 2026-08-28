import Image from "next/image";
import type { ReactNode } from "react";
import { AudioPlayer } from "@/components/audio-player";
import type { Song } from "@/types/song";

type MusicCardProps = {
  song: Song;
  children: ReactNode;
};

export function MusicCard({ song, children }: MusicCardProps) {
  return (
    <article className="overflow-hidden rounded-[1.75rem] border border-white/[0.08] bg-[#1c1c1f] p-3 shadow-[0_24px_70px_-28px_rgba(0,0,0,0.8)] sm:p-4">
      <div className="relative aspect-square overflow-hidden rounded-[1.25rem] bg-zinc-800 shadow-[0_12px_35px_-18px_rgba(0,0,0,0.9)]">
        <Image
          src={song.coverUrl}
          alt={`Capa de ${song.title}`}
          draggable={false}
          fill
          priority
          sizes="(max-width: 640px) calc(100vw - 48px), 428px"
          className="object-cover"
        />
      </div>

      <div className="px-2 pb-1 pt-4 text-center sm:pt-5">
        <h2 className="truncate text-[1.4rem] font-bold tracking-[-0.025em] text-zinc-50 sm:text-2xl">
          {song.title}
        </h2>
        <p className="mt-0.5 truncate text-sm font-medium text-zinc-400 sm:text-base">
          {song.artist}
        </p>
      </div>

      <div
        className="mt-3.5"
        data-swipe-ignore="true"
        style={{ touchAction: "auto" }}
      >
        <AudioPlayer key={song.id} src={song.audioUrl} title={song.title} />
      </div>

      <div
        className="mt-3 border-t border-white/[0.07] pt-3"
        data-swipe-ignore="true"
        style={{ touchAction: "manipulation" }}
      >
        {children}
      </div>
    </article>
  );
}
