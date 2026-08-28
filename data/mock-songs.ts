import type { Song } from "@/types/song";

export const mockSongs: Song[] = [
  {
    id: "aurora-lenta",
    title: "Aurora Lenta",
    artist: "Marina Vale",
    coverUrl: "/covers/aurora-lenta.svg",
    audioUrl: "/audio/aurora-lenta.mp3",
    status: "PENDING",
  },
  {
    id: "cidade-em-azul",
    title: "Cidade em Azul",
    artist: "Caio Norte",
    coverUrl: "/covers/cidade-em-azul.svg",
    audioUrl: "/audio/cidade-em-azul.mp3",
    status: "PENDING",
  },
  {
    id: "entre-estacoes",
    title: "Entre Estações",
    artist: "Clara Dias",
    coverUrl: "/covers/entre-estacoes.svg",
    audioUrl: "/audio/entre-estacoes.mp3",
    status: "PENDING",
  },
  {
    id: "passos-de-luz",
    title: "Passos de Luz",
    artist: "Horizonte Sul",
    coverUrl: "/covers/passos-de-luz.svg",
    audioUrl: "/audio/passos-de-luz.mp3",
    status: "PENDING",
  },
];
