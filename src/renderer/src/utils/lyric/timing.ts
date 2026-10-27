/** Interpolate between native progress events without advancing through a long stall. */
export function lyricTimeSeconds(
  positionMs: number,
  elapsedMs: number,
  playing: boolean,
  loading: boolean,
  durationMs = 0
): number {
  const ahead = playing && !loading ? Math.min(1000, Math.max(0, elapsedMs)) : 0
  const time = Math.max(0, positionMs + ahead)
  return (durationMs > 0 ? Math.min(time, durationMs) : time) / 1000
}

export function wordProgress(time: number, start: number, end: number): number {
  if (time < start) return 0
  if (end <= start) return 100
  return Math.round(Math.min(1, (time - start) / (end - start)) * 1000) / 10
}
