import { fetchNewLyric } from '../../apis/netease/lyric'
import { parseLrc } from '../lyric/ParseLrc'

function timeTag(ms: number): string {
  const value = Math.max(0, Math.round(ms))
  return `${String(Math.floor(value / 60000)).padStart(2, '0')}:${String(Math.floor(value / 1000) % 60).padStart(2, '0')}.${String(value % 1000).padStart(3, '0')}`
}

/** Preserve supplied word durations (including gaps), rather than estimating them. */
export function yrcToEnhancedLrc(yrc: string, translation = ''): string | null {
  if (!yrc || yrc.length > 256 * 1024) return null
  const translated = parseLrc(translation)
  const result: string[] = []
  for (const row of yrc.split(/\r?\n/)) {
    const line = row.match(/^\[(\d+),(\d+)\]/)
    if (!line) continue
    const tags = [...row.matchAll(/\((\d+),(\d+),(\d+)\)/g)]
    if (!tags.length) continue
    let text = ''
    let lastEnd = -1
    for (let i = 0; i < tags.length; i++) {
      const tag = tags[i]
      const start = Number(tag[1])
      const end = start + Number(tag[2])
      const word = row.slice(tag.index! + tag[0].length, tags[i + 1]?.index ?? row.length)
      if (start < lastEnd || !word) { text = ''; break }
      if (lastEnd >= 0 && start > lastEnd) text += ' '
      text += `<${timeTag(start)}>${word}<${timeTag(end)}>`
      lastEnd = end
    }
    if (!text) continue
    const start = Number(tags[0][1])
    result.push(`[${timeTag(start)}]${text}`)
    const t = translated.find((item) => Math.abs(item.startTime - Number(line[1])) <= 50)
    if (t) result.push(`[${timeTag(start)}]${t.words.map((w) => w.word).join('')}`)
  }
  return result.length ? result.join('\n') : null
}

// Deduplicate a source lookup, including a miss, for this session; bound memory.
const lookups = new Map<string, Promise<string | null>>()
export function loadOnlineWordLyrics(song: { id?: string | number | null; sourceSongId?: string | number; source?: string }): Promise<string | null> {
  if (!['wy', 'netease'].includes(song.source || '')) return Promise.resolve(null)
  const id = song.sourceSongId ?? song.id
  if (id === null || id === undefined || !/^\d+$/.test(String(id))) return Promise.resolve(null)
  const key = String(id)
  let request = lookups.get(key)
  if (!request) {
    request = fetchNewLyric(key, 4000).then((r) => yrcToEnhancedLrc(r.yrc?.lyric || '', r.ytlrc?.lyric || '')).catch(() => null)
    if (lookups.size >= 100) lookups.delete(lookups.keys().next().value!)
    lookups.set(key, request)
  }
  return request
}
