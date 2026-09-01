export const INITIAL_CONTINUOUS_PLAYBACK = false;

export type ManualPlaybackAction = "PLAY" | "PAUSE";

export function continuousPlaybackAfterManualAction(action: ManualPlaybackAction) {
  return action === "PLAY";
}

export function shouldAutoPlayReplacement(continuousPlaybackEnabled: boolean) {
  return continuousPlaybackEnabled;
}

export function isCurrentPlaybackRequest(
  requestId: number,
  latestRequestId: number,
  cancelled: boolean,
) {
  return !cancelled && requestId === latestRequestId;
}
