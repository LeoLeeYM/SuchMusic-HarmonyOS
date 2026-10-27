import { common, wantAgent } from '@kit.AbilityKit';
import { webview } from '@kit.ArkWeb';
import { fileIo as fs, picker } from '@kit.CoreFileKit';
import { http } from '@kit.NetworkKit';
import { util } from '@kit.ArkTS';
import { media } from '@kit.MediaKit';
import { audio } from '@kit.AudioKit';
import { avSession } from '@kit.AVSessionKit';
import { backgroundTaskManager } from '@kit.BackgroundTasksKit';
import { window } from '@kit.ArkUI';
import { hilog } from '@kit.PerformanceAnalysisKit';
import { image } from '@kit.ImageKit';
import { MediaArtwork } from './MediaArtwork';

export class Runtime {
  static context: common.UIAbilityContext | undefined = undefined;
}
class ExportFile {
  name: string = '';
  text?: string;
  sourcePath?: string;
}
class Options {
  url: string = '';
  method: string = 'GET';
  headers: Object = new Object();
  data: string = '';
  responseType: string = '';
  connectTimeout: number = 30000;
  readTimeout: number = 60000;
  path: string = '';
  directory: string = '';
  encoding: string = '';
  recursive: boolean = false;
  paths: string[] = [];
  files: ExportFile[] = [];
  autoPlay: boolean = true;
  volume: number = 1;
  value: number = 1;
  positionMs: number = 0;
  durationMs: number = 0;
  title: string = 'SuchMusic';
  artist: string = '';
  album: string = '';
  coverUrl: string = '';
  playing: boolean = false;
  mode: string = '';
  style: string = '';
  overlay: boolean = true;
  color: string = '#00000000';
}
class Request {
  id: string = '';
  plugin: string = '';
  method: string = '';
  options: Options = new Options();
}
class FileInfo {
  name: string = '';
  type: string = 'file';
  size: number = 0;
  mtime: number = 0;
  ctime: number = 0;
  uri: string = '';
}
class Track {
  id: string = '';
  name: string = '';
  filePath: string = '';
  artist: string = '本地音乐';
  album: string = '导入的音乐';
}
class TextFile {
  name: string = '';
  content: string = '';
}
class ScanResult {
  rootDir: string = '';
  rootDirs: string[] = [];
  tracks: Track[] = [];
}
class TextResult {
  canceled: boolean = false;
  files: TextFile[] = [];
}
class Result {
  path?: string;
  uri?: string;
  data?: string;
  status?: number;
  headers?: Object;
  url?: string;
  granted?: boolean;
  exists?: boolean;
  canceled?: boolean;
  open?: boolean;
  dirs?: string[];
  files?: FileInfo[];
  size?: number;
  type?: string;
  mtime?: number;
  ctime?: number;
  title?: string;
  artist?: string;
  album?: string;
  durationMs?: number;
  deletedCount?: number;
  failedCount?: number;
  count?: number;
  failed?: number;
  location?: string;
  publicStorage?: string;
}
class SafeInsets {
  top: number = 0;
  right: number = 0;
  bottom: number = 0;
  left: number = 0;
  windowWidth: number = 0;
}
class PlayerState {
  state: string = '';
  positionMs: number = 0;
  durationMs: number = 0;
  error?: string;
}
class Control {
  action: string = '';
  positionMs?: number;
}

export class NativeBridge {
  private controller: webview.WebviewController | undefined = undefined;
  private player: media.AVPlayer | undefined = undefined;
  private session: avSession.AVSession | undefined = undefined;
  private file: fs.File | undefined = undefined;
  private background: boolean = false;
  private sessionReady: Promise<void> | undefined = undefined;
  private artwork: MediaArtwork = new MediaArtwork();
  private metadataRevision: number = 0;
  private metadataWrites: Promise<void> = Promise.resolve();
  private lastSessionReport: number = 0;
  private lastState: string = "";
  private serial: Promise<void> = Promise.resolve();
  private volume: number = 1;

  private appWindow: window.Window | undefined = undefined;
  private avoidChanged = (event: window.AvoidAreaOptions): void => {
    if (event.type !== window.AvoidAreaType.TYPE_KEYBOARD) this.syncSafeArea();
  };
  private sizeChanged = (_size: window.Size): void => { this.syncSafeArea(); };

  async syncSafeArea(): Promise<void> {
    try {
      if (!this.appWindow) {
        this.appWindow = await window.getLastWindow(this.context());
        this.appWindow.on('avoidAreaChange', this.avoidChanged);
        this.appWindow.on('windowSizeChange', this.sizeChanged);
      }
      const win = this.appWindow;
      const insets = new SafeInsets();
      insets.windowWidth = win.getWindowProperties().windowRect.width;
      const areas: window.AvoidArea[] = [
        win.getWindowAvoidArea(window.AvoidAreaType.TYPE_SYSTEM),
        win.getWindowAvoidArea(window.AvoidAreaType.TYPE_CUTOUT),
        win.getWindowAvoidArea(window.AvoidAreaType.TYPE_NAVIGATION_INDICATOR)
      ];
      for (const area of areas) {
        insets.top = Math.max(insets.top, area.topRect.height);
        insets.right = Math.max(insets.right, area.rightRect.width);
        insets.bottom = Math.max(insets.bottom, area.bottomRect.height);
        insets.left = Math.max(insets.left, area.leftRect.width);
      }
      await this.controller?.runJavaScript('window.__suchHarmonyInsets && window.__suchHarmonyInsets(' + JSON.stringify(insets) + ')');
    } catch (error) {
      hilog.warn(0x1234, 'SuchMusic', 'Safe area update failed: %{public}s', JSON.stringify(error));
    }
  }
  detachWindow(): void {
    this.appWindow?.off('avoidAreaChange', this.avoidChanged);
    this.appWindow?.off('windowSizeChange', this.sizeChanged);
    this.appWindow = undefined;
  }

  attach(controller: webview.WebviewController): void { this.controller = controller; }
  private context(): common.UIAbilityContext {
    const ctx = Runtime.context;
    if (!ctx) throw new Error('Ability context unavailable');
    return ctx;
  }
  private emit(plugin: string, event: string, data: Object): void {
    const script = 'window.__suchHarmonyEvent && window.__suchHarmonyEvent(' + JSON.stringify(plugin) + ',' + JSON.stringify(event) + ',' + JSON.stringify(data) + ')';
    this.controller?.runJavaScript(script).catch(() => {});
  }
  private reply(id: string, ok: boolean, data: Object | string): void {
    const script = 'window.__suchHarmonyReply && window.__suchHarmonyReply(' + JSON.stringify(id) + ',' + String(ok) + ',' + JSON.stringify(data) + ')';
    this.controller?.runJavaScript(script).catch(() => {});
  }
  postMessage(raw: string): void {
    if (raw.length > 32 * 1024 * 1024) return;
    let request: Request;
    try { request = JSON.parse(raw); } catch (_) { return; }
    if (!request.id || !request.plugin || !request.method) return;
    const execute = async (): Promise<void> => {
      try { this.reply(request.id, true, await this.dispatch(request)); }
      catch (err) {
        const message = err instanceof Error ? err.message : JSON.stringify(err);
        hilog.error(0x1234, 'SuchMusic', '%{public}s.%{public}s: %{public}s', request.plugin, request.method, message);
        this.reply(request.id, false, message);
      }
    };
    if (request.plugin === 'SuchPlayer') this.serial = this.serial.then(execute);
    else execute();
  }
  private path(options: Options): string {
    const root = this.context().filesDir;
    let value = options.path || '';
    if (value.startsWith('file://')) value = value.substring(7);
    if (value.split('/').includes('..')) throw new Error('不允许访问此路径');
    if (value.startsWith('/')) {
      if (!value.startsWith(root + '/')) throw new Error('仅支持访问已导入的应用文件');
      return value;
    }
    return root + '/' + value;
  }
  private ensureDir(path: string): void {
    if (!fs.accessSync(path)) fs.mkdirSync(path, true);
  }
  private musicDir(): string {
    const path = this.context().filesDir + '/music';
    this.ensureDir(path);
    return path;
  }
  handleBack(): void { this.emit('App', 'backButton', new Result()); }
  private async dispatch(r: Request): Promise<Object> {
    const o = r.options;
    const result = new Result();
    if (r.plugin === 'CapacitorHttp') return await this.requestHttp(o);
    if (r.plugin === 'Filesystem') return this.filesystem(r.method, o);
    if (r.plugin === 'SuchLocalMusic') return await this.localMusic(r.method, o);
    if (r.plugin === 'SuchPlayer') return await this.playerCommand(r.method, o);
    if (r.plugin === 'MediaSession') {
      await this.ensureSession();
      if (r.method === 'updateMetadata') {
        await this.updateSessionMetadata(o);
      }
      if (r.method === 'stop') { this.metadataRevision++; await this.setBackground(false); }
      return result;
    }
    if (r.plugin === 'FloatingLyric') {
      if (r.method === 'open') throw new Error('鸿蒙首版暂不支持跨应用悬浮歌词，请使用应用内歌词');
      result.open = false; result.granted = false;
      return result;
    }
    if (r.plugin === 'App' && r.method === 'minimizeApp') { await this.context().moveAbilityToBackground(); return result; }
    if (r.plugin === 'FileExport') return await this.exportFiles(o);
    if (r.plugin === 'AppPrefs') {
      const win = await window.getLastWindow(this.context());
      const orientation = o.mode === 'portrait' ? window.Orientation.PORTRAIT : o.mode === 'landscape' ? window.Orientation.LANDSCAPE : window.Orientation.AUTO_ROTATION;
      await win.setPreferredOrientation(orientation);
      return result;
    }
    if (r.plugin === 'StatusBar') {
      const win = await window.getLastWindow(this.context());
      if (r.method === 'setStyle') {
        await win.setWindowSystemBarProperties({ statusBarColor: '#00000000', navigationBarColor: '#00000000', statusBarContentColor: o.style === 'LIGHT' ? '#ffffff' : '#111111', navigationBarContentColor: o.style === 'LIGHT' ? '#ffffff' : '#111111' });
      } else if (r.method === 'setOverlaysWebView') {
        await win.setWindowLayoutFullScreen(o.overlay !== false);
        await this.syncSafeArea();
      } else if (r.method === 'setBackgroundColor') {
        await win.setWindowSystemBarProperties({ statusBarColor: o.color, navigationBarColor: o.color });
      }
      return result;
    }
    throw new Error('尚未支持接口: ' + r.plugin + '.' + r.method);
  }
  private async requestHttp(o: Options): Promise<Result> {
    if (!/^https?:\/\//.test(o.url)) throw new Error('仅支持 HTTP/HTTPS');
    const client = http.createHttp();
    let method = http.RequestMethod.GET;
    switch ((o.method || 'GET').toUpperCase()) {
      case 'POST': method = http.RequestMethod.POST; break;
      case 'PUT': method = http.RequestMethod.PUT; break;
      case 'DELETE': method = http.RequestMethod.DELETE; break;
      case 'PATCH': method = http.RequestMethod.PATCH; break;
      case 'HEAD': method = http.RequestMethod.HEAD; break;
    }
    const options: http.HttpRequestOptions = { method: method, header: o.headers || new Object(), expectDataType: o.responseType === 'arraybuffer' ? http.HttpDataType.ARRAY_BUFFER : http.HttpDataType.STRING, connectTimeout: Math.min(o.connectTimeout || 30000, 60000), readTimeout: Math.min(o.readTimeout || 60000, 120000) };
    if (o.data) options.extraData = typeof o.data === 'string' ? o.data : JSON.stringify(o.data);
    try {
      const response = await client.request(o.url, options);
      const result = new Result();
      result.status = response.responseCode; result.headers = response.header; result.url = o.url;
      if (response.result instanceof ArrayBuffer) result.data = new util.Base64Helper().encodeToStringSync(new Uint8Array(response.result));
      else result.data = typeof response.result === 'string' ? response.result : JSON.stringify(response.result);
      return result;
    } finally { client.destroy(); }
  }
  private filesystem(method: string, o: Options): Result {
    const result = new Result();
    if (method === 'checkPermissions' || method === 'requestPermissions') { result.publicStorage = 'granted'; return result; }
    const path = this.path(o);
    switch (method) {
      case 'getUri': result.uri = path; break;
      case 'mkdir': this.ensureDir(path); break;
      case 'readFile': {
        const stat = fs.statSync(path);
        if (stat.size > 96 * 1024 * 1024) throw new Error('文件超过首版桥接读取限制，请直接播放');
        if (o.encoding) result.data = fs.readTextSync(path);
        else {
          const f = fs.openSync(path, fs.OpenMode.READ_ONLY);
          try { const buffer = new ArrayBuffer(stat.size); fs.readSync(f.fd, buffer); result.data = new util.Base64Helper().encodeToStringSync(new Uint8Array(buffer)); }
          finally { fs.closeSync(f); }
        }
        break;
      }
      case 'writeFile': {
        if (o.recursive) this.ensureDir(path.substring(0, path.lastIndexOf('/')));
        const f = fs.openSync(path, fs.OpenMode.CREATE | fs.OpenMode.WRITE_ONLY | fs.OpenMode.TRUNC);
        try {
          if (o.encoding) fs.writeSync(f.fd, o.data);
          else { const bytes = new util.Base64Helper().decodeSync(o.data); fs.writeSync(f.fd, bytes.buffer); }
        } finally { fs.closeSync(f); }
        result.uri = path; break;
      }
      case 'stat': { const stat = fs.statSync(path); result.size = stat.size; result.type = stat.isDirectory() ? 'directory' : 'file'; result.mtime = stat.mtime * 1000; result.ctime = stat.ctime * 1000; result.uri = path; break; }
      case 'readdir': {
        result.files = [];
        for (const name of fs.listFileSync(path)) {
          const info = new FileInfo(); const stat = fs.statSync(path + '/' + name);
          info.name = name; info.uri = path + '/' + name; info.size = stat.size; info.type = stat.isDirectory() ? 'directory' : 'file'; info.mtime = stat.mtime * 1000; info.ctime = stat.ctime * 1000;
          result.files.push(info);
        }
        break;
      }
      case 'deleteFile': fs.unlinkSync(path); break;
      case 'rmdir': fs.rmdirSync(path); break;
      default: throw new Error('不支持的文件操作: ' + method);
    }
    return result;
  }
  private async localMusic(method: string, o: Options): Promise<Object> {
    const result = new Result();
    const root = this.musicDir();
    if (method === 'getMusicDir') { result.path = root; return result; }
    if (method === 'checkStoragePermission' || method === 'requestStoragePermission') { result.granted = true; return result; }
    if (method === 'fsExists') { result.exists = fs.accessSync(this.path(o)); return result; }
    if (method === 'getMeta') {
      const path = this.path(o); result.title = path.substring(path.lastIndexOf('/') + 1); result.artist = '本地音乐';
      const extractor = await media.createAVMetadataExtractor();
      const f = fs.openSync(path, fs.OpenMode.READ_ONLY);
      try {
        extractor.fdSrc = { fd: f.fd, offset: 0, length: fs.statSync(path).size };
        const meta = await extractor.fetchMetadata();
        result.title = meta.title || result.title; result.artist = meta.artist || '本地音乐'; result.album = meta.album || ''; result.durationMs = Number(meta.duration || 0);
      } finally { await extractor.release(); fs.closeSync(f); }
      return result;
    }
    if (method === 'scan') {
      const scan = new ScanResult(); scan.rootDir = root; scan.rootDirs = [root];
      for (const name of fs.listFileSync(root)) {
        if (!/\.(mp3|flac|wav|m4a|aac|ogg)$/i.test(name)) continue;
        const track = new Track(); track.id = root + '/' + name; track.filePath = track.id; track.name = name.replace(/\.[^.]+$/, ''); scan.tracks.push(track);
      }
      return scan;
    }
    if (method === 'chooseDirs' || method === 'pickTextFiles') {
      const select = new picker.DocumentViewPicker(this.context());
      const uris = await select.select({ maxSelectNumber: method === 'pickTextFiles' ? 10 : 100 });
      if (method === 'pickTextFiles') {
        const texts = new TextResult(); texts.canceled = uris.length === 0;
        for (const uri of uris) {
          const f = fs.openSync(uri, fs.OpenMode.READ_ONLY);
          try {
            const size = fs.statSync(f.fd).size;
            if (size > 4 * 1024 * 1024) throw new Error('插件或文本文件过大');
            const buffer = new ArrayBuffer(size); fs.readSync(f.fd, buffer);
            const entry = new TextFile(); entry.name = decodeURIComponent(uri.substring(uri.lastIndexOf('/') + 1)); entry.content = new util.TextDecoder().decodeToString(new Uint8Array(buffer)); texts.files.push(entry);
          } finally { fs.closeSync(f); }
        }
        return texts;
      }
      for (const uri of uris) {
        const name = decodeURIComponent(uri.substring(uri.lastIndexOf('/') + 1)).replace(/[\\/]/g, '_');
        if (!/\.(mp3|flac|wav|m4a|aac|ogg|lrc)$/i.test(name)) continue;
        if (fs.accessSync(root + '/' + name)) throw new Error('已存在同名文件，请重命名后导入: ' + name);
        const f = fs.openSync(uri, fs.OpenMode.READ_ONLY);
        try { fs.copyFileSync(f.fd, root + '/' + name); } finally { fs.closeSync(f); }
      }
      result.canceled = uris.length === 0; result.dirs = [root]; return result;
    }
    if (method === 'deleteFiles') {
      result.deletedCount = 0; result.failedCount = 0;
      for (const path of o.paths) {
        const opt = new Options(); opt.path = path;
        try { fs.unlinkSync(this.path(opt)); result.deletedCount++; } catch (_) { result.failedCount++; }
      }
      return result;
    }
    throw new Error('不支持的音乐文件操作');
  }
  private async exportFiles(o: Options): Promise<Result> {
    const result = new Result(); result.count = 0; result.failed = 0;
    const select = new picker.DocumentViewPicker(this.context());
    const uris = await select.save({ newFileNames: o.files.map((entry: ExportFile) => entry.name) });
    result.canceled = uris.length === 0;
    for (let i = 0; i < uris.length && i < o.files.length; i++) {
      const item = o.files[i];
      const target = fs.openSync(uris[i], fs.OpenMode.WRITE_ONLY | fs.OpenMode.TRUNC);
      try {
        if (item.text !== undefined) fs.writeSync(target.fd, item.text);
        else if (item.sourcePath) {
          const opt = new Options(); opt.path = item.sourcePath;
          const source = fs.openSync(this.path(opt), fs.OpenMode.READ_ONLY);
          try { fs.copyFileSync(source.fd, target.fd); } finally { fs.closeSync(source); }
        }
        result.count++;
      } catch (_) { result.failed++; } finally { fs.closeSync(target); }
    }
    return result;
  }
  private async publishMetadata(options: Options, bitmap: image.PixelMap, revision: number): Promise<void> {
    const metadata: avSession.AVMetadata = {
      assetId: options.title || 'suchmusic', title: options.title || 'SuchMusic',
      artist: options.artist || '', album: options.album || '', duration: options.durationMs || 0,
      mediaImage: bitmap
    };
    const write = this.metadataWrites.then(async () => {
      if (revision === this.metadataRevision) await this.session?.setAVMetadata(metadata);
    });
    this.metadataWrites = write.catch(() => {});
    try { await write; } finally { await bitmap.release(); }
  }
  private async updateSessionMetadata(options: Options): Promise<void> {
    const revision = ++this.metadataRevision;
    // Clear the previous track's artwork immediately, even when the new URL fails.
    const placeholder = await this.artwork.placeholder(this.context());
    await this.publishMetadata(options, placeholder, revision);
    if (!options.coverUrl || revision !== this.metadataRevision) return;
    try {
      const bitmap = await this.artwork.load(options.coverUrl, this.context());
      await this.publishMetadata(options, bitmap, revision);
    } catch (error) {
      if (revision === this.metadataRevision) hilog.warn(0x1234, 'SuchMusic', 'Media artwork unavailable: %{public}s', JSON.stringify(error));
    }
  }
  private async ensureSession(): Promise<void> {
    if (!this.sessionReady) this.sessionReady = this.createSession();
    try { await this.sessionReady; } catch (error) { this.sessionReady = undefined; throw new Error(JSON.stringify(error)); }
  }
  private async createSession(): Promise<void> {
    if (this.session) return;
    const session = await avSession.createAVSession(this.context(), 'SuchMusic', 'audio');
    this.session = session;
    session.on('play', () => { this.enqueueControl('play'); });
    session.on('pause', () => { this.enqueueControl('pause'); });
    session.on('playNext', () => { this.control('next'); });
    session.on('playPrevious', () => { this.control('prev'); });
    session.on('seek', (position: number) => {
      const o = new Options(); o.positionMs = position;
      this.serial = this.serial.then(async () => { await this.playerCommand('seek', o); }).catch(() => {});
    });
    await session.activate();
  }
  private enqueueControl(action: string): void {
    this.serial = this.serial.then(async () => { await this.playerCommand(action, new Options()); }).catch(() => {});
  }
  private control(action: string): void { const c = new Control(); c.action = action; this.emit('MediaSession', 'control', c); }
  private async setBackground(enabled: boolean): Promise<void> {
    if (enabled === this.background) return;
    if (enabled) {
      const agent = await wantAgent.getWantAgent({ wants: [{ bundleName: 'com.suchmusic.app', abilityName: 'EntryAbility' }], operationType: wantAgent.OperationType.START_ABILITY, requestCode: 0, wantAgentFlags: [wantAgent.WantAgentFlags.UPDATE_PRESENT_FLAG] });
      await backgroundTaskManager.startBackgroundRunning(this.context(), backgroundTaskManager.BackgroundMode.AUDIO_PLAYBACK, agent);
      this.background = true;
    } else {
      await backgroundTaskManager.stopBackgroundRunning(this.context()); this.background = false;
    }
  }
  private state(): PlayerState {
    const state = new PlayerState(); state.state = this.player?.state || 'idle'; state.positionMs = this.player?.currentTime || 0; state.durationMs = this.player?.duration || 0; return state;
  }
  private report(): void {
    const state = this.state(); this.emit('SuchPlayer', 'state', state);
    if (Date.now() - this.lastSessionReport < 1000 && this.lastState === state.state) return;
    this.lastSessionReport = Date.now(); this.lastState = state.state;
    const playing = state.state === 'playing';
    this.session?.setAVPlaybackState({ state: playing ? avSession.PlaybackState.PLAYBACK_STATE_PLAY : avSession.PlaybackState.PLAYBACK_STATE_PAUSE, position: { elapsedTime: state.positionMs, updateTime: Date.now() }, speed: 1 }).catch(() => {});
  }
  private async playerCommand(method: string, o: Options): Promise<Object> {
    if (method === 'status') return this.state();
    if (method === 'volume') { this.volume = Math.max(0, Math.min(1, o.value)); if (this.player && ['prepared', 'playing', 'paused'].includes(this.player.state)) this.player.setVolume(this.volume); return new Result(); }
    if (method === 'load') {
      await this.ensureSession();
      await this.setBackground(false);
      if (this.player) { await this.player.release(); this.player = undefined; }
      if (this.file) { fs.closeSync(this.file); this.file = undefined; }
      const player = await media.createAVPlayer(); this.player = player; this.volume = o.volume;
      await new Promise<void>((resolve, reject) => {
        let settled = false;
        const timeout = setTimeout(() => { if (!settled) { settled = true; reject(new Error('音频准备超时')); } }, 30000);
        player.on('error', (error) => {
          clearTimeout(timeout);
          const state = this.state(); state.state = 'error'; state.error = error.message; this.emit('SuchPlayer', 'state', state);
          if (!settled) { settled = true; reject(new Error(error.message)); }
        });
        player.on('stateChange', async (state: string) => {
          try {
            if (state === 'initialized') {
              player.audioRendererInfo = { usage: audio.StreamUsage.STREAM_USAGE_MUSIC, rendererFlags: 0 };
              await player.prepare();
            }
            if (state === 'prepared') {
              player.setVolume(this.volume);
              if (o.autoPlay) { await player.play(); await this.setBackground(true); }
              clearTimeout(timeout); if (!settled) { settled = true; resolve(); }
            }
            if (this.player === player) {
              if (state === 'completed') await this.setBackground(false);
              this.report();
            }
          } catch (err) { clearTimeout(timeout); if (!settled) { settled = true; reject(err); } }
        });
        player.on('timeUpdate', () => { if (this.player === player) this.report(); });
        player.on('audioInterrupt', (event: audio.InterruptEvent) => {
          if (event.hintType === audio.InterruptHint.INTERRUPT_HINT_PAUSE || event.hintType === audio.InterruptHint.INTERRUPT_HINT_STOP) this.enqueueControl('pause');
        });
        if (/^https?:\/\//.test(o.url)) player.url = o.url;
        else {
          const opt = new Options(); opt.path = o.url;
          const path = this.path(opt); this.file = fs.openSync(path, fs.OpenMode.READ_ONLY);
          player.fdSrc = { fd: this.file.fd, offset: 0, length: fs.statSync(path).size };
        }
      });
      return this.state();
    }
    const player = this.player;
    if (!player) return new Result();
    if (method === 'play') { if (player.state !== 'playing') await player.play(); await this.setBackground(true); }
    else if (method === 'pause') { if (player.state === 'playing') await player.pause(); await this.setBackground(false); }
    else if (method === 'stop') { await player.release(); this.player = undefined; if (this.file) { fs.closeSync(this.file); this.file = undefined; } await this.setBackground(false); }
    else if (method === 'seek') player.seek(Math.max(0, o.positionMs), media.SeekMode.SEEK_CLOSEST);
    else throw new Error('不支持的播放操作');
    this.report(); return new Result();
  }
}
