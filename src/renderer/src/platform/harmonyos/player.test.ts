import { beforeEach, describe, expect, it, vi } from 'vitest'

const fixtures = vi.hoisted(() => {
  const store = {
    currentSong: { id: 'one', durationMs: 8000 }, playMode: 'list', setPosition: vi.fn(), setDuration: vi.fn(),
    setPlaying: vi.fn(), playNext: vi.fn()
  }
  const native = {
    load: vi.fn().mockResolvedValue(undefined), play: vi.fn().mockResolvedValue(undefined),
    status: vi.fn(), addListener: vi.fn().mockResolvedValue({ remove: vi.fn() })
  }
  return { store, native }
})
vi.mock('@capacitor/core', () => ({ registerPlugin: () => fixtures.native }))
vi.mock('../../stores/playerStore', () => ({ usePlayerStore: () => fixtures.store }))

beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  fixtures.store.currentSong = { id: 'one', durationMs: 8000 }
  fixtures.store.playMode = 'list'
  fixtures.store.playNext.mockImplementation(() => {})
})

describe('Harmony native playback lifecycle', () => {
  it('restarts the same track once when completion is reported repeatedly', async () => {
    const { harmonyPlayer } = await import('./player')
    await harmonyPlayer.load('file:///music/one.wav', true)
    const listener = fixtures.native.addListener.mock.calls[0][1]
    const completed = { state: 'completed', positionMs: 8000, durationMs: 8000 }
    listener(completed)
    listener(completed)
    expect(fixtures.store.playNext).toHaveBeenCalledTimes(1)
    expect(fixtures.native.load).toHaveBeenCalledTimes(2)
    expect(fixtures.store.setPlaying).toHaveBeenCalledWith(false)
  })
  it('leaves a different next track to the shared song watcher', async () => {
    const { harmonyPlayer } = await import('./player')
    await harmonyPlayer.load('file:///music/one.wav', true)
    fixtures.store.playNext.mockImplementation(() => { fixtures.store.currentSong = { id: 'two', durationMs: 8000 } })
    fixtures.native.addListener.mock.calls[0][1]({ state: 'completed', positionMs: 8000, durationMs: 8000 })
    expect(fixtures.native.load).toHaveBeenCalledTimes(1)
  })
  it('reports missing native source so persisted songs can be reloaded', async () => {
    const { harmonyPlayer } = await import('./player')
    fixtures.native.status.mockResolvedValue({ state: 'idle' })
    expect(await harmonyPlayer.play()).toBe(false)
    expect(fixtures.native.play).not.toHaveBeenCalled()
  })
  it('does not recreate song metadata on every playback tick', async () => {
    const { harmonyPlayer } = await import('./player')
    await harmonyPlayer.load('file:///music/one.wav', true)
    const listener = fixtures.native.addListener.mock.calls[0][1]
    listener({ state: 'playing', positionMs: 100, durationMs: 8000 })
    listener({ state: 'playing', positionMs: 200, durationMs: 8000 })
    expect(fixtures.store.setDuration).not.toHaveBeenCalled()
    listener({ state: 'playing', positionMs: 300, durationMs: 9000 })
    expect(fixtures.store.setDuration).toHaveBeenCalledWith(9000)
  })

})
