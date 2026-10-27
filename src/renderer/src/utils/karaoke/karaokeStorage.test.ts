import { beforeEach, describe, expect, it, vi } from 'vitest'
const f = vi.hoisted(() => ({ files: new Map<string,string>() }))
vi.mock('@capacitor/filesystem', () => ({ Directory: { Data:'DATA' }, Encoding:{ UTF8:'utf8' }, Filesystem: {
  mkdir: vi.fn(),
  readFile: async ({path}:{path:string}) => { if(!f.files.has(path)) throw Error('missing'); return { data:f.files.get(path)! } },
  writeFile: async ({path,data}:{path:string;data:string}) => { f.files.set(path,data) },
  deleteFile: async ({path}:{path:string}) => { f.files.delete(path) }
} }))
import { loadKaraokeFor, saveKaraokeFor, listKaraoke, karaokeIdentityOf, deleteKaraokeFor } from './karaokeStorage'
beforeEach(()=> f.files.clear())
describe('word lyric cache reuse',()=>{
 it('reads legacy path-keyed entries across online cache quality and extension changes',async()=>{
  f.files.set('karaoke-lyrics/index.json',JSON.stringify([{key:'legacy',filePath:'/files/online-cache/wy_123_128k.mp3'}]))
  f.files.set('karaoke-lyrics/legacy.lrc','words')
  expect(await loadKaraokeFor('/files/online-cache/wy_123_flac.flac')).toBe('words')
  await saveKaraokeFor('/files/online-cache/wy_123_320k.mp3','title','artist','v4','updated')
  expect(await listKaraoke()).toHaveLength(1)
  expect(f.files.get('karaoke-lyrics/legacy.lrc')).toBe('updated')
  await deleteKaraokeFor('/files/online-cache/wy_123_128k.mp3')
  expect(await listKaraoke()).toHaveLength(0)
 })
 it('keeps local recordings and different providers separate',()=>{
  expect(karaokeIdentityOf('/music/wy_123_128k.mp3')).toBe('/music/wy_123_128k.mp3')
  expect(karaokeIdentityOf('/files/online-cache/wy_123_128k.mp3')).not.toBe(karaokeIdentityOf('/files/online-cache/tx_123_128k.mp3'))
 })
 it('serializes simultaneous source and generated cache writes without losing entries',async()=>{
  await Promise.all([saveKaraokeFor('/a.mp3','A','','v4','A'),saveKaraokeFor('/b.mp3','B','','source-yrc','B')])
  expect(await listKaraoke()).toHaveLength(2)
 })
})
