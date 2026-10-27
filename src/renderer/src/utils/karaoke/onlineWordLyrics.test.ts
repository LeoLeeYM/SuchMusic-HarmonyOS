import { describe, it, expect, vi } from 'vitest'
import { parseLrc } from '../lyric/ParseLrc'
const fetchLyric = vi.hoisted(() => vi.fn())
vi.mock('../../apis/netease/lyric', () => ({ fetchNewLyric: fetchLyric }))
import { yrcToEnhancedLrc, loadOnlineWordLyrics } from './onlineWordLyrics'
const yrc = '[1000,2000](1000,500,0)你(1700,600,0)好'
describe('source word lyrics', () => {
  it('keeps supplied timing, gaps and translation', () => {
    const parsed = parseLrc(yrcToEnhancedLrc(yrc, '[00:01.00]Hello')!)
    const words = parsed[0].words.filter(w => w.word.trim())
    expect(words.map(w => [w.word, w.startTime, w.endTime])).toEqual([['你',1000,1500],['好',1700,2300]])
    expect(parsed[0].translatedLyric).toBe('Hello')
  })
  it('does not pretend plain or malformed lyrics contain word timing', () => {
    expect(yrcToEnhancedLrc('[00:01.00]你好')).toBeNull()
    expect(yrcToEnhancedLrc('[1000,500](2000,500,0)你(1000,500,0)好')).toBeNull()
  })
  it('deduplicates source requests using the source ID, ignoring audio quality', async () => {
    fetchLyric.mockResolvedValue({ yrc: { lyric: yrc } })
    const song = { id: 'ui-id', source: 'wy', sourceSongId: 123 }
    const [a,b] = await Promise.all([loadOnlineWordLyrics(song),loadOnlineWordLyrics(song)])
    expect(a).toBe(b); expect(a).not.toBeNull()
    expect(fetchLyric).toHaveBeenCalledTimes(1)
    expect(fetchLyric).toHaveBeenCalledWith('123',4000)
  })
  it('does not look up another platform with a coincidentally equal ID', async () => {
    expect(await loadOnlineWordLyrics({ id:123, source:'tx' })).toBeNull()
    expect(fetchLyric).toHaveBeenCalledTimes(1)
  })
})
