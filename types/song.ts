export type SongStatus = "PENDING" | "LIKE" | "NEUTRAL" | "DISLIKE";

export type Rating = Exclude<SongStatus, "PENDING">;

export type Song = {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
  audioUrl: string;
  status: SongStatus;
};
