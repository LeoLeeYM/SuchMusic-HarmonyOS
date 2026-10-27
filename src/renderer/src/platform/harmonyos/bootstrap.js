/* Loaded before the renderer modules, only in the HarmonyOS build. */
(() => {
  const pending = new Map()
  const listeners = new Map()
  let sequence = 0
  window.CapacitorCustomPlatform = { name: 'harmonyos' }
  document.documentElement.dataset.platform = 'harmonyos'
  let safeInsets = null
  const applyInsets = () => {
    if (!safeInsets || !(safeInsets.windowWidth > 0)) return
    // AvoidArea is in physical pixels; CSS pixels follow the Web viewport, not ArkUI vp.
    const scale = window.innerWidth / safeInsets.windowWidth
    if (!(scale > 0)) return
    for (const edge of ['top', 'right', 'bottom', 'left']) {
      document.documentElement.style.setProperty('--safe-area-inset-' + edge,
        Math.max(0, safeInsets[edge] * scale) + 'px')
    }
  }
  window.__suchHarmonyInsets = value => { safeInsets = value; applyInsets() }
  window.addEventListener('resize', applyInsets)
  window.__suchHarmonyReply = (id, ok, value) => {
    const call = pending.get(id)
    if (!call) return
    pending.delete(id)
    clearTimeout(call.timer)
    ok ? call.resolve(value) : call.reject(new Error(String(value)))
  }
  window.__suchHarmonyEvent = (plugin, event, data) => {
    for (const entry of listeners.values()) {
      if (entry.plugin === plugin && entry.event === event) entry.callback(data)
    }
  }
  const invoke = (plugin, method, options = {}) => new Promise((resolve, reject) => {
    const id = String(++sequence)
    const timer = setTimeout(() => { pending.delete(id); reject(new Error(plugin + '.' + method + ' 超时')) }, 120000)
    pending.set(id, { resolve, reject, timer })
    try {
      if (!window.SuchHarmony) throw new Error('鸿蒙原生桥接未就绪')
      window.SuchHarmony.postMessage(JSON.stringify({ id, plugin, method, options }))
    } catch (error) { clearTimeout(timer); pending.delete(id); reject(error) }
  })
  const methods = {
    CapacitorHttp: ['request', 'get', 'post', 'put', 'patch', 'delete'],
    Filesystem: ['readFile', 'writeFile', 'mkdir', 'readdir', 'stat', 'getUri', 'deleteFile', 'rmdir', 'checkPermissions', 'requestPermissions'],
    SuchLocalMusic: ['getMusicDir', 'checkStoragePermission', 'requestStoragePermission', 'scan', 'chooseDirs', 'deleteFiles', 'fsExists', 'getMeta', 'pickTextFiles'],
    MediaSession: ['start', 'stop', 'updateMetadata', 'updatePlayback'],
    SuchPlayer: ['load', 'play', 'pause', 'stop', 'seek', 'volume', 'status'],
    FloatingLyric: ['open', 'close', 'isOpen', 'updateLyrics', 'updateTime', 'updatePlaying', 'updateInfo', 'updateSettings', 'checkOverlayPermission'],
    AppPrefs: ['setOrientation'],
    FileExport: ['saveFiles'],
    StatusBar: ['setOverlaysWebView', 'setBackgroundColor', 'setStyle'],
    App: ['minimizeApp']
  }
  window.Capacitor = {
    PluginHeaders: Object.entries(methods).map(([name, names]) => ({
      name,
      methods: [...names.map(name => ({ name, rtype: 'promise' })), { name: 'addListener', rtype: 'callback' }, { name: 'removeListener', rtype: 'promise' }]
    })),
    nativePromise(plugin, method, options = {}) {
      if (method === 'removeListener') { listeners.delete(options.callbackId); return Promise.resolve() }
      if (plugin === 'CapacitorHttp' && method !== 'request') options = { ...options, method: method.toUpperCase() }
      return invoke(plugin, method, options)
    },
    nativeCallback(plugin, method, options, callback) {
      const id = String(++sequence)
      if (method === 'addListener') listeners.set(id, { plugin, event: options.eventName, callback })
      return id
    },
    convertFileSrc: path => path
  }
  window.addEventListener('error', event => console.error('[HarmonyWeb]', event.message))
  window.addEventListener('unhandledrejection', event => console.error('[HarmonyWeb]', String(event.reason)))
})()
