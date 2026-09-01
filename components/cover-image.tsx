"use client";

import Image from "next/image";
import { useState } from "react";
import { DEFAULT_COVER_URL } from "../lib/supabase/media";

type CoverImageProps = {
  src: string;
  title: string;
};

export function resolveCoverSourceAfterError(currentSrc: string) {
  return currentSrc === DEFAULT_COVER_URL ? currentSrc : DEFAULT_COVER_URL;
}

export function CoverImage({ src, title }: CoverImageProps) {
  const [currentSrc, setCurrentSrc] = useState(src || DEFAULT_COVER_URL);

  return (
    <Image
      src={currentSrc}
      alt={`Capa de ${title}`}
      draggable={false}
      fill
      priority
      sizes="(max-width: 640px) calc(100vw - 48px), 428px"
      className="object-cover"
      onError={() => {
        setCurrentSrc(resolveCoverSourceAfterError(currentSrc));
      }}
    />
  );
}
