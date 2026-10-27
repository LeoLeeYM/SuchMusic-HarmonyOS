import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
const native = vi.hoisted(() => ({
  start: vi.fn().mockResolvedValue(undefined), stop: vi.fn().mockResolvedValue(undefined),
  updateMetadata: vi.fn().mockResolvedValue(undefined)
}))
vi.mock('./native', () => ({ MediaSession: native }))
vi.mock('./emitter', () => ({ emitChannel: vi.fn() }))
let pendingImages: Array<{ onerror: () => void }> = []
beforeEach(() => {
  vi.resetModules()
  vi.clearAllMocks()
  pendingImages = []
  vi.stubGlobal('Image', class {
    onerror = () => {}
    set src(_value: string) { pendingImages.push(this) }
  })
})
afterEach(() => vi.unstubAllGlobals())
const largeCover = 'data:image/png;base64,' + 'A'.repeat(160001)

describe('media metadata artwork ordering', () => {
  it('preserves the song cover and album in native metadata', async () => {
    const { updateMediaMetadata } = await import('./mediaSession')
    const song = { title: 'Current', artist: 'Artist', album: 'Album', coverUrl: 'https://example.test/cover.jpg' }
    await updateMediaMetadata(song)
    expect(native.updateMetadata).toHaveBeenCalledWith(song)
  })
  it('does not submit an old song after slow cover decoding finishes', async () => {
    const { updateMediaMetadata } = await import('./mediaSession')
    const old = updateMediaMetadata({ title: 'Old', artist: '', coverUrl: largeCover })
    await vi.waitFor(() => expect(pendingImages).toHaveLength(1))
    await updateMediaMetadata({ title: 'New', artist: '', coverUrl: 'https://example.test/new.jpg' })
    pendingImages[0].onerror()
    await old
    expect(native.updateMetadata).toHaveBeenCalledTimes(1)
    expect(native.updateMetadata.mock.calls[0][0].title).toBe('New')
  })
  it('does not republish pending artwork after the session stops', async () => {
    const { updateMediaMetadata, stopMediaSession } = await import('./mediaSession')
    const pending = updateMediaMetadata({ title: 'Old', artist: '', coverUrl: largeCover })
    await vi.waitFor(() => expect(pendingImages).toHaveLength(1))
    await stopMediaSession()
    pendingImages[0].onerror()
    await pending
    expect(native.updateMetadata).not.toHaveBeenCalled()
  })
})
