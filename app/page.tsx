import { MusicRater } from "@/components/music-rater";
import { mockSongs } from "@/data/mock-songs";

export default function Home() {
  return <MusicRater initialSongs={mockSongs} />;
}
