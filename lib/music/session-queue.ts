type QueueSong = {
  id: string;
  artist: string | null;
  status: string;
};

const UNKNOWN_ARTIST = "__unknown_artist__";

export function normalizeQueueArtist(artist: string | null) {
  return artist?.trim().toLocaleLowerCase() || UNKNOWN_ARTIST;
}

function shuffled<T>(items: readonly T[], random: () => number) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

export function buildSessionQueue<Song extends QueueSong>(
  songs: readonly Song[],
  random: () => number = Math.random,
): Song[] {
  const pending = songs.filter((song) => song.status === "PENDING");
  const grouped = new Map<string, Song[]>();

  for (const song of shuffled(pending, random)) {
    const artist = normalizeQueueArtist(song.artist);
    const group = grouped.get(artist) ?? [];
    group.push(song);
    grouped.set(artist, group);
  }

  const groups = shuffled(
    [...grouped].map(([artist, items]) => ({ artist, items: shuffled(items, random) })),
    random,
  );
  const queue: Song[] = [];
  let previousArtist: string | null = null;

  while (queue.length < pending.length) {
    const alternatives = groups.filter(
      (group) => group.items.length > 0 && group.artist !== previousArtist,
    );
    const candidates = alternatives.length
      ? alternatives
      : groups.filter((group) => group.items.length > 0);
    const largestSize = Math.max(...candidates.map((group) => group.items.length));
    const largest = candidates.filter((group) => group.items.length === largestSize);
    const selected = largest[Math.floor(random() * largest.length)];
    const song = selected.items.pop();
    if (!song) throw new Error("Grupo de fila inconsistente.");
    queue.push(song);
    previousArtist = selected.artist;
  }

  return queue;
}

export function restoreSongForUndo<Song extends { id: string; status: string }>(
  songs: readonly Song[],
  songId: string,
): Song[] {
  const restored = songs.find((song) => song.id === songId);
  if (!restored) return [...songs];
  return [
    { ...restored, status: "PENDING" },
    ...songs.filter((song) => song.id !== songId),
  ];
}
