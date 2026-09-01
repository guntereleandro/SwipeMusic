export const AUDIO_STORAGE_OBJECT_PATTERN = /^[a-f0-9]{64}\.mp3$/;

export function isValidAudioStoragePath(path: string | null): path is string {
  return typeof path === "string" && AUDIO_STORAGE_OBJECT_PATTERN.test(path);
}
