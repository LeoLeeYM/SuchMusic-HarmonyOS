// 逐字歌词服务：切歌监听、自动/手动生成、应用与清空
// - 开启「逐字歌词」后，每首歌（有本地音频文件）优先使用已生成的逐字歌词；
//   未生成则按偏好自动生成（边播放边生成 / 等生成完后再播放）
// - 生成结果持久化于 karaokeStorage（应用私有目录，可设置页管理）
import { reactive, watch } from 'vue'
import { usePlayerStore } from '../../stores/playerStore'
import { useSettingsStore } from '../../stores/settingsStore'
import { webAudioEngine } from '../../audio/audio-engine'
import { isNativeMobile } from '../../platform'
import { readTextFile } from '../../platform/mobile/fsUtils'
import { decodeToMono, runKaraokeWorker, type KaraokeJob } from './karaokeEngine'
import { loadKaraokeFor, saveKaraokeFor, deleteKaraokeFor } from './karaokeStorage'
import { loadOnlineWordLyrics } from './onlineWordLyrics'
import type { KaraokeAlgo } from './aligner'

const WORD_TAG_RE = /<\d{1,2}:\d{2}(?:[.:]\d{1,3})?>/

/** 内容是否已是逐字（卡拉OK）歌词 */
export function looksKaraoke(content: string): boolean {
  return WORD_TAG_RE.test(content)
}

export const karaokeState = reactive({
  /** 当前歌曲是否有可用的逐字歌词 */
  currentHasKaraoke: false,
  /** 是否有生成任务进行中（全局单任务） */
  generating: false,
  /** Automatic work never shows overlays or notifications. */
  silent: false,
  /** 阻塞式生成（全屏转圈遮罩） */
  blocking: false,
  /** 生成遮罩已最小化为顶部悬浮提示 */
  minimized: false,
  /** 当前生成阶段提示 */
  stage: '',
  /** 正在生成的歌曲标题 */
  songTitle: '',
  /** 消息通知（由播放页桥接到 naive-ui message） */
  notice: null as null | { kind: 'success' | 'error' | 'info'; text: string; ts: number },
  /** 「是否生成逐字歌词」询问（开启逐字歌词且自动生成关闭时弹出） */
  prompt: null as null | { songId: string | number | null; filePath: string; title: string },
  /** 正在生成的目标文件路径（用于避免生成期间重复询问/重复触发） */
  generatingFor: null as string | null
})

function notify(kind: 'success' | 'error' | 'info', text: string): void {
  karaokeState.notice = { kind, text, ts: Date.now() }
}

/** 由音频文件路径推导同名 .lrc 歌词路径 */
function lrcPathOf(filePath: string): string {
  return filePath.replace(/\.[^./\\]+$/, '') + '.lrc'
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms))
}

let inited = false
let genToken = 0 // Only cancellation/new jobs invalidate generation
let selectionToken = 0 // Async selection/cache lookups must not affect a later song
let appliedFor: string | null = null
let originalFor = ''
let originalContent = ''

function songKey(song: { id?: string | number | null; source?: string; filePath?: string } | null): string {
  return song ? JSON.stringify([song.source || '', song.id, song.filePath || '']) : ''
}
let appliedContent = ''
let activeJob: KaraokeJob | null = null

export function initKaraokeService(): void {
  if (inited || !isNativeMobile) return
  inited = true
  const player = usePlayerStore()
  const settings = useSettingsStore()

  // 切歌 → 应用或自动生成逐字歌词
  watch(
    () => songKey(player.currentSong),
    () => {
      void onSongChange()
    },
    { immediate: true }
  )

  // 开关变化：开启时立即处理当前歌曲；关闭时恢复逐行歌词
  watch(
    () => settings.karaoke.enabled,
    (v) => {
      if (v) void onSongChange()
      else {
        selectionToken++
        cancelGeneration()
        void restoreLineLyrics()
      }
    }
  )

  // 已应用逐字歌词后，若歌词被异步覆盖（如 PlayerBar 的 meta/在线歌词回写），重新应用
  watch(
    () => player.currentSong?.lyrics,
    (lrc) => {
      if (
        appliedFor !== null &&
        songKey(player.currentSong) === appliedFor &&
        lrc &&
        lrc !== appliedContent &&
        !looksKaraoke(lrc)
      ) {
        player.setLyrics(appliedContent)
      }
    }
  )
}

/** 关闭时恢复原逐行歌词；异步读取期间切歌不能覆盖新歌。 */
async function restoreLineLyrics(): Promise<void> {
  const player = usePlayerStore()
  karaokeState.prompt = null
  const song = player.currentSong
  appliedFor = null
  if (!song) return
  const key = songKey(song)
  const line = await resolveLineLyrics(song)
  if (songKey(player.currentSong) === key && !useSettingsStore().karaoke.enabled && line) {
    player.setLyrics(line)
  }
}

/** 取消当前正在进行的生成任务 */
export function cancelGeneration(): void {
  if (!karaokeState.generating) return
  genToken++ // 作废旧任务结果
  activeJob?.cancel()
}

async function onSongChange(): Promise<void> {
  const player = usePlayerStore()
  const settings = useSettingsStore()
  const song = player.currentSong
  karaokeState.currentHasKaraoke = false
  karaokeState.prompt = null
  appliedFor = null
  // 切歌时把阻塞遮罩降级（旧任务在后台继续，结果仍落盘缓存）
  if (karaokeState.blocking) karaokeState.blocking = false
  const token = ++selectionToken
  if (!song) return
  if (!song.filePath) {
    karaokeState.currentHasKaraoke = looksKaraoke(song.lyrics || '')
    return
  }

  try {
    const existing = await loadKaraokeFor(song.filePath)
    if (token !== selectionToken) return
    karaokeState.currentHasKaraoke = !!existing || looksKaraoke(song.lyrics || '')
    if (!settings.karaoke.enabled) return
    // 正在为该歌曲生成：不要重复询问/重复触发，生成完成后会自动应用
    if (karaokeState.generatingFor === song.filePath) return
    if (token !== selectionToken) return
    if (existing) {
      applyKaraoke(song, existing)
      return
    }
    // 若当前歌词本身已是逐字格式（如用户自备 karaoke lrc），直接使用
    if (song.lyrics && looksKaraoke(song.lyrics)) return
    // Prefer real source word timings; no audio decoding is needed for a hit.
    const online = await loadOnlineWordLyrics(song)
    if (token !== selectionToken || !settings.karaoke.enabled) return
    if (online) {
      applyKaraoke(song, online)
      karaokeState.currentHasKaraoke = true
      await saveKaraokeFor(song.filePath, song.title || '', song.artist || '', 'source-yrc', online)
      return
    }
    // Opting out of automatic generation means no work and no repeated prompts.
    if (!settings.karaoke.autoGenerate) return
    await autoGenerate(song.filePath, songKey(song), song.title || '', song.artist || '', token)
  } catch (e) {
    console.warn('[karaoke] 切歌处理失败', e)
  }
}

/** 用户确认生成（来自「是否生成逐字歌词」询问） */
export function acceptKaraokePrompt(): void {
  const prompt = karaokeState.prompt
  if (!prompt) return
  karaokeState.prompt = null
  const player = usePlayerStore()
  // 以文件路径为准判断是否仍是同一首歌（id 可能因缓存回写而变化）
  if (player.currentSong?.filePath !== prompt.filePath) return
  void generateForCurrentSong(useSettingsStore().karaoke.lastAlgo)
}

/** 用户拒绝生成（来自「是否生成逐字歌词」询问） */
export function dismissKaraokePrompt(): void {
  karaokeState.prompt = null
}

function applyKaraoke(song: { id: string | number | null; source?: string; filePath?: string }, content: string): void {
  const player = usePlayerStore()
  const key = songKey(song)
  if (songKey(player.currentSong) !== key) return
  const current = player.currentSong?.lyrics || ''
  if (current && !looksKaraoke(current)) {
    originalFor = key
    originalContent = current
  }
  appliedFor = key
  appliedContent = content
  if (current !== content) player.setLyrics(content)
}

/**
 * 外部更新了当前歌词内容（如注入/清空 AI 译文）后同步缓存，
 * 避免异步歌词回写把旧内容又套回来。
 */
export function syncAppliedKaraokeContent(
  songId: string | number | null,
  content: string
): void {
  if (appliedFor === null || usePlayerStore().currentSong?.id !== songId ||
    songKey(usePlayerStore().currentSong) !== appliedFor) return
  appliedContent = content
}

/** 解析当前可用的逐行歌词：优先内存中非逐字歌词，其次旁挂 .lrc 文件 */
async function resolveLineLyrics(song: {
  id?: string | number | null
  source?: string
  filePath?: string
  lyrics?: string
}): Promise<string | null> {
  const cur = song.lyrics
  if (cur && !looksKaraoke(cur)) return cur
  if (songKey(song) === originalFor && originalContent) return originalContent
  if (song.filePath) {
    const side = await readTextFile(lrcPathOf(song.filePath))
    if (side && !looksKaraoke(side)) return side
  }
  // Restarted cached songs may have no sidecar; retain the text instead of clearing it.
  return cur && looksKaraoke(cur) ? cur.replace(/<\d{1,2}:\d{2}(?:[.:]\d{1,3})?>/g, '') : null
}

/** 等待当前歌曲的逐行歌词就绪（PlayerBar 异步加载旁挂/在线歌词） */
async function waitLineLyrics(key: string, token: number, timeoutMs: number): Promise<string | null> {
  const player = usePlayerStore()
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    const cur = player.currentSong
    if (!cur || songKey(cur) !== key || token !== selectionToken) return null
    const lrc = await resolveLineLyrics(cur)
    if (lrc) return lrc
    await sleep(500)
  }
  return null
}

async function autoGenerate(
  filePath: string,
  key: string,
  title: string,
  artist: string,
  token: number
): Promise<void> {
  const settings = useSettingsStore()
  if (karaokeState.generating) return
  const lrc = await waitLineLyrics(key, token, 20000)
  if (token !== selectionToken || !lrc) return
  // Automatic generation must never pause, seek, toast, or open an overlay.
  await generateAndSave(filePath, title, artist, settings.karaoke.lastAlgo, false, lrc, true)
}

/** 手动生成当前歌曲逐字歌词（菜单入口，弹全屏转圈遮罩） */
export async function generateForCurrentSong(algo: KaraokeAlgo): Promise<boolean> {
  const player = usePlayerStore()
  const settings = useSettingsStore()
  karaokeState.prompt = null
  const song = player.currentSong
  if (!song?.filePath) {
    notify('info', '请先播放并缓存这首歌曲，再生成逐字歌词')
    return false
  }
  if (karaokeState.generating) {
    notify('info', '正在生成中，请稍候')
    return false
  }
  const existing = await resolveLineLyrics(song)
  if (!existing) {
    notify('info', '当前歌曲没有逐行歌词，无法生成逐字歌词')
    return false
  }
  if (songKey(player.currentSong) !== songKey(song)) return false
  settings.karaoke.enabled = true
  settings.karaoke.lastAlgo = algo
  const wasPlaying = player.isPlaying
  const ok = await generateAndSave(song.filePath, song.title || '', song.artist || '', algo, true, existing)
  if (!ok) return false
  // 手动生成同样遵循「生成完后」设置（restart=从头播放 continue=接着播放）
  if (player.currentSong?.filePath !== song.filePath) return true
  if (settings.karaoke.afterGenPlay === 'restart') {
    webAudioEngine.seek(0)
    player.setPosition(0)
  }
  if (wasPlaying && !player.isPlaying) {
    const played = await webAudioEngine.play()
    if (played) player.setPlaying(true)
  }
  return true
}

/**
 * 用指定的逐行歌词（如包含 AI 翻译的合并歌词）重新生成逐字歌词。
 * 用于 AI 翻译完成后用户选择「重新生成逐字歌词」的场景。
 */
export async function regenerateKaraokeWithLyrics(
  song: { filePath?: string; title?: string; artist?: string },
  lyrics: string,
  algo?: KaraokeAlgo
): Promise<boolean> {
  const player = usePlayerStore()
  const settings = useSettingsStore()
  karaokeState.prompt = null
  if (!song.filePath) {
    notify('info', '请先播放并缓存这首歌曲，再生成逐字歌词')
    return false
  }
  if (karaokeState.generating) {
    notify('info', '正在生成中，请稍候')
    return false
  }
  if (!lyrics.trim()) {
    notify('info', '没有可用于生成逐字歌词的歌词')
    return false
  }
  const useAlgo = algo || settings.karaoke.lastAlgo
  settings.karaoke.lastAlgo = useAlgo
  const wasPlaying = player.isPlaying
  const ok = await generateAndSave(
    song.filePath,
    song.title || '',
    song.artist || '',
    useAlgo,
    true,
    lyrics
  )
  if (!ok) return false
  if (player.currentSong?.filePath !== song.filePath) return true
  if (settings.karaoke.afterGenPlay === 'restart') {
    webAudioEngine.seek(0)
    player.setPosition(0)
  }
  if (wasPlaying && !player.isPlaying) {
    const played = await webAudioEngine.play()
    if (played) player.setPlaying(true)
  }
  return true
}

async function generateAndSave(
  filePath: string,
  title: string,
  artist: string,
  algo: KaraokeAlgo,
  blocking: boolean,
  lyricsOverride?: string,
  silent = false
): Promise<boolean> {
  const player = usePlayerStore()
  if (karaokeState.generating) return false
  const token = ++genToken
  karaokeState.generating = true
  karaokeState.silent = silent
  karaokeState.generatingFor = filePath
  karaokeState.blocking = blocking
  karaokeState.minimized = false
  karaokeState.stage = '解码音频'
  karaokeState.songTitle = title
  karaokeState.prompt = null
  try {
    const pcm = await decodeToMono(filePath)
    if (token !== genToken) return false
    const lrc =
      lyricsOverride ||
      (await resolveLineLyrics(
        player.currentSong?.filePath === filePath ? player.currentSong : { filePath }
      ))
    if (!lrc) {
      if (!silent) notify('info', '未找到可用的逐行歌词')
      return false
    }
    const job = runKaraokeWorker(pcm, lrc, algo, (s) => {
      karaokeState.stage = s
    })
    activeJob = job
    const out = await job.promise
    if (!out) {
      if (!silent) notify('info', '歌词内容为空，无法生成逐字歌词')
      return false
    }
    if (token !== genToken) return false
    await saveKaraokeFor(filePath, title, artist, algo, out)
    if (token !== genToken) return false
    // 以文件路径判断是否仍是当前歌曲（id 可能因缓存回写/对象重建而变化）
    if (token === genToken && useSettingsStore().karaoke.enabled && player.currentSong?.filePath === filePath) {
      karaokeState.prompt = null
      karaokeState.currentHasKaraoke = true
      applyKaraoke(player.currentSong, out)
      if (!silent) notify('success', '逐字歌词已生成并应用')
    } else {
      if (!silent) notify('success', '逐字歌词已生成')
    }
    return true
  } catch (e) {
    if (e instanceof Error && e.message === 'CANCELLED') {
      if (!silent) notify('info', '已取消生成')
      return false
    }
    console.error('[karaoke] 生成失败', e)
    if (!silent) notify('error', '逐字歌词生成失败，请重试')
    return false
  } finally {
    activeJob = null
    karaokeState.generating = false
    karaokeState.silent = false
    karaokeState.generatingFor = null
    karaokeState.blocking = false
    karaokeState.minimized = false
    karaokeState.stage = ''
    if (token === genToken && useSettingsStore().karaoke.enabled &&
      player.currentSong?.filePath !== filePath) void onSongChange()
  }
}

/** 清空当前歌曲的逐字歌词（删除生成文件并恢复逐行歌词） */
export async function clearCurrentKaraoke(): Promise<boolean> {
  const player = usePlayerStore()
  const song = player.currentSong
  if (!song?.filePath) return false
  if (karaokeState.generatingFor === song.filePath) cancelGeneration()
  const line = await resolveLineLyrics(song)
  await deleteKaraokeFor(song.filePath)
  if (songKey(player.currentSong) === songKey(song)) {
    karaokeState.currentHasKaraoke = false
    appliedFor = null
    if (line) player.setLyrics(line)
  }
  notify('success', '已清空逐字歌词')
  return true
}

/** 检查指定歌曲是否已有逐字歌词（供界面查询） */
export { loadKaraokeFor, looksKaraoke as isKaraokeContent }
