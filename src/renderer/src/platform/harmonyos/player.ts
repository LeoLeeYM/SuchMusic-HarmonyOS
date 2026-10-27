import { registerPlugin } from '@capacitor/core'
import { usePlayerStore } from '../../stores/playerStore'

export const isHarmonyOS = import.meta.env.VITE_HARMONYOS === 'true'
interface NativeState { state: string; positionMs: number; durationMs: number; error?: string }
interface NativePlayer {
  load(options: { url: string; autoPlay: boolean; volume: number }): Promise<void>
  play(): Promise<void>
  pause(): Promise<void>
  stop(): Promise<void>
  seek(options: { positionMs: number }): Promise<void>
  volume(options: { value: number }): Promise<void>
  status(): Promise<NativeState>
  addListener(event: string, listener: (data: NativeState) => void): Promise<{ remove(): void }>
}
const player = registerPlugin<NativePlayer>('SuchPlayer')
let bound = false
let lastUrl = ''
let lastVolume = 1
let completionHandled = false
function bind(): void {
  if (bound) return
  bound = true
  void player.addListener('state', state => {
    const store = usePlayerStore()
    store.setPosition(state.positionMs)
    if (state.durationMs > 0 && store.currentSong?.durationMs !== state.durationMs) store.setDuration(state.durationMs)
    if (state.state === 'playing') { completionHandled = false; store.setPlaying(true) }
    if (['paused', 'stopped', 'error'].includes(state.state)) store.setPlaying(false)
    if (state.state === 'completed' && !completionHandled) {
      completionHandled = true
      store.setPlaying(false)
      const previousId = store.currentSong?.id
      if (store.playMode !== 'loop') store.playNext()
      // The shared song watcher only reloads when the song ID changes.
      if (store.currentSong?.id === previousId && lastUrl) {
        void harmonyPlayer.load(lastUrl, true).catch(console.error)
      }
    }
    if (state.error) console.error('[HarmonyPlayer]', state.error)
  })
}
export const harmonyPlayer = {
  async load(url: string, autoPlay: boolean): Promise<void> {
    bind()
    lastUrl = url
    await player.load({ url, autoPlay, volume: lastVolume })
  },
  async play(): Promise<boolean> {
    const state = await player.status()
    if (['idle', 'released', 'error'].includes(state.state)) return false
    if (state.state === 'completed') {
      if (!lastUrl) return false
      await harmonyPlayer.load(lastUrl, true)
    } else await player.play()
    return true
  },
  async needsSource(): Promise<boolean> {
    return ['idle', 'released', 'error'].includes((await player.status()).state)
  },
  pause: () => player.pause(),
  stop: () => { void player.stop().catch(console.error) },
  seek: (positionMs: number) => { void player.seek({ positionMs }).catch(console.error) },
  volume(value: number): void { lastVolume = value; void player.volume({ value }).catch(console.error) }
}
