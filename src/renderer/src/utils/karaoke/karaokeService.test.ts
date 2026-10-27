import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, nextTick, reactive, type EffectScope } from 'vue'

interface Song { id: number; source: string; filePath?: string; title: string; lyrics: string }
interface Player { currentSong: Song | null; isPlaying: boolean; isLoading: boolean; positionMs: number; setLyrics(lrc: string): void; setPlaying(v: boolean): void; setPosition(v: number): void }
const f = vi.hoisted(() => ({
  player: null as unknown as Player,
  settings: null as unknown as { karaoke: { enabled: boolean; autoGenerate: boolean; genMode: string; afterGenPlay: string; lastAlgo: string } },
  online: vi.fn(), load: vi.fn(), has: vi.fn(), save: vi.fn(), remove: vi.fn(), read: vi.fn(), decode: vi.fn(), worker: vi.fn(),
  seek: vi.fn(), play: vi.fn(), pause: vi.fn()
}))
vi.mock('../../stores/playerStore', () => ({ usePlayerStore: () => f.player }))
vi.mock('../../stores/settingsStore', () => ({ useSettingsStore: () => f.settings }))
vi.mock('../../platform', () => ({ isNativeMobile: true }))
vi.mock('../../platform/mobile/fsUtils', () => ({ readTextFile: f.read }))
vi.mock('../../audio/audio-engine', () => ({ webAudioEngine: { seek: f.seek, play: f.play, pause: f.pause } }))
vi.mock('./karaokeStorage', () => ({ loadKaraokeFor: f.load, hasKaraokeFor: f.has, saveKaraokeFor: f.save, deleteKaraokeFor: f.remove }))
vi.mock('./onlineWordLyrics', () => ({ loadOnlineWordLyrics: f.online }))
vi.mock('./karaokeEngine', () => ({ decodeToMono: f.decode, runKaraokeWorker: f.worker }))
const line = '[00:01.00]你好\n[00:01.00]Hello'
const words = '[00:01.00]<00:01.00>你<00:01.50>好<00:02.00>\n[00:01.00]Hello'
let scope: EffectScope
const settle = async () => { for (let i = 0; i < 12; i++) await nextTick() }
function deferred<T>() { let resolve!: (v: T) => void; let reject!: (e: Error) => void; const promise = new Promise<T>((a, b) => { resolve = a; reject = b }); return { promise, resolve, reject } }
async function init() {
  const service = await import('./karaokeService')
  scope.run(() => service.initKaraokeService())
  await settle()
  return service
}
beforeEach(() => {
  vi.resetModules()
  vi.resetAllMocks()
  scope = effectScope()
  f.player = reactive<Player>({ currentSong: { id: 1, source: 'wy', filePath: '/a.mp3', title: 'A', lyrics: line }, isPlaying: false, isLoading: false, positionMs: 1500,
    setLyrics(lrc: string) { this.currentSong = { ...this.currentSong!, lyrics: lrc } }, setPlaying(v: boolean) { this.isPlaying = v }, setPosition(v: number) { this.positionMs = v } })
  f.settings = reactive({ karaoke: { enabled: true, autoGenerate: false, genMode: 'whilePlaying', afterGenPlay: 'continue', lastAlgo: 'v4' } })
  f.online.mockResolvedValue(null)
  f.has.mockResolvedValue(false)
  f.load.mockResolvedValue(null)
  f.read.mockResolvedValue(null)
  f.decode.mockResolvedValue(new Float32Array(32))
  f.save.mockResolvedValue(undefined)
  f.remove.mockResolvedValue(undefined)
})
afterEach(() => scope.stop())

describe('word lyrics lifecycle', () => {
  it('restores saved word lyrics for the song already loaded at startup', async () => {
    f.has.mockResolvedValue(true); f.load.mockResolvedValue(words)
    await init()
    expect(f.player.currentSong!.lyrics).toBe(words)
    expect(f.load).toHaveBeenCalledOnce()
    // The real Pinia store replaces the song object when updating metadata.
    f.player.currentSong = { ...f.player.currentSong! }
    await settle()
    expect(f.load).toHaveBeenCalledOnce()
  })
  it('starts generation when an online song receives its cached path without changing ID', async () => {
    f.player.currentSong!.filePath = undefined
    f.settings.karaoke.autoGenerate = true
    f.worker.mockReturnValue({ promise: Promise.resolve(words), cancel: vi.fn() })
    await init()
    expect(f.decode).not.toHaveBeenCalled()
    f.player.currentSong!.filePath = '/cache/a.mp3'
    await settle()
    expect(f.decode).toHaveBeenCalledWith('/cache/a.mp3')
    expect(f.player.currentSong!.lyrics).toBe(words)
  })
  it('ignores delayed cache lookup after switching provider with the same ID', async () => {
    const old = deferred<string | null>()
    f.has.mockResolvedValue(true)
    f.load.mockImplementation((path: string) => path === '/a.mp3' ? old.promise : Promise.resolve(null))
    const service = await init()
    f.player.currentSong = { id: 1, source: 'tx', filePath: '/b.mp3', title: 'B', lyrics: 'new lyrics' }
    await settle(); old.resolve(words); await settle()
    expect(f.player.currentSong.lyrics).toBe('new lyrics')
    expect(service.karaokeState.prompt).toBeNull()
  })
  it('disabling during generation cancels the job and never applies its result', async () => {
    const job = deferred<string | null>()
    const cancel = vi.fn(() => job.reject(new Error('CANCELLED')))
    f.worker.mockReturnValue({ promise: job.promise, cancel })
    const service = await init()
    const run = service.generateForCurrentSong('v4'); await settle()
    f.settings.karaoke.enabled = false; await settle()
    expect(await run).toBe(false)
    expect(cancel).toHaveBeenCalledOnce()
    expect(f.save).not.toHaveBeenCalled()
    expect(f.player.currentSong!.lyrics).toBe(line)
  })
  it('finishes an old song into cache without replacing the new song or its prompt', async () => {
    const job = deferred<string | null>()
    f.worker.mockReturnValue({ promise: job.promise, cancel: vi.fn() })
    const service = await init()
    const run = service.generateForCurrentSong('v4'); await settle()
    f.player.currentSong = { id: 2, source: 'wy', filePath: '/b.mp3', title: 'B', lyrics: 'new lyrics' }
    await settle(); job.resolve(words)
    expect(await run).toBe(true)
    expect(f.save).toHaveBeenCalledWith('/a.mp3', 'A', '', 'v4', words)
    expect(f.player.currentSong.lyrics).toBe('new lyrics')
    expect(service.karaokeState.prompt).toBeNull()
    expect(f.seek).not.toHaveBeenCalled()
  })
  it('clearing preserves the original lines and translations without a sidecar file', async () => {
    f.has.mockResolvedValue(true); f.load.mockResolvedValue(words)
    const service = await init()
    await service.clearCurrentKaraoke()
    expect(f.player.currentSong!.lyrics).toBe(line)
    expect(f.remove).toHaveBeenCalledWith('/a.mp3')
  })
  it('after restart disabling retains lyric text even when only enhanced LRC is available', async () => {
    f.player.currentSong!.lyrics = words
    const service = await init()
    expect(service.karaokeState.currentHasKaraoke).toBe(true)
    f.settings.karaoke.enabled = false; await settle()
    expect(f.player.currentSong!.lyrics).toBe(line)
  })
  it('a delayed restore cannot overwrite another song', async () => {
    f.player.currentSong!.lyrics = words
    await init()
    const read = deferred<string | null>(); f.read.mockReturnValue(read.promise)
    f.settings.karaoke.enabled = false; await settle()
    f.player.currentSong = { id: 2, source: 'wy', filePath: '/b.mp3', title: 'B', lyrics: 'B lyrics' }
    read.resolve(line); await settle()
    expect(f.player.currentSong.lyrics).toBe('B lyrics')
  })
  it('uses existing source word timings without decoding audio', async () => {
    f.online.mockResolvedValue(words)
    const service = await init()
    expect(f.player.currentSong!.lyrics).toBe(words)
    expect(f.decode).not.toHaveBeenCalled()
    expect(f.save).toHaveBeenCalledWith('/a.mp3', 'A', '', 'source-yrc', words)
    expect(service.karaokeState.notice).toBeNull()
  })
  it('automatic work is silent and does not pause or seek even with the old afterDone preference', async () => {
    f.settings.karaoke.autoGenerate = true
    f.settings.karaoke.genMode = 'afterDone'
    f.player.isPlaying = true
    const job = deferred<string | null>()
    f.worker.mockReturnValue({ promise: job.promise, cancel: vi.fn() })
    const service = await init()
    expect(service.karaokeState.generating).toBe(true)
    expect(service.karaokeState.silent).toBe(true)
    expect(service.karaokeState.blocking).toBe(false)
    expect(service.karaokeState.notice).toBeNull()
    job.resolve(words); await settle()
    expect(f.pause).not.toHaveBeenCalled()
    expect(f.seek).not.toHaveBeenCalled()
    expect(service.karaokeState.notice).toBeNull()
  })
  it('cached lyrics skip both source lookup and audio decoding on replay', async () => {
    f.load.mockResolvedValue(words)
    await init()
    expect(f.online).not.toHaveBeenCalled()
    expect(f.decode).not.toHaveBeenCalled()
  })

})
