# HarmonyOS 原生桥接

入口：`window.SuchHarmony.postMessage(JSON.stringify({id, plugin, method, options}))`。

应答 `__suchHarmonyReply(id, ok, data)`；事件 `__suchHarmonyEvent(plugin, event, data)`。请求超时 120 秒；播放器 load 准备超时 30 秒。按 request ID 匹配并清理 Promise；监听器按 callback ID 移除。

| 插件 | 首版实现 |
| --- | --- |
| CapacitorHttp | HTTP/HTTPS，GET/POST/PUT/PATCH/DELETE/HEAD，文本或 Base64 二进制响应 |
| Filesystem | read/write/mkdir/readdir/stat/getUri/delete/rmdir，沙箱权限查询 |
| SuchLocalMusic | 沙箱音乐扫描、元数据、系统选择器导入、文本/插件文件选择、删除 |
| SuchPlayer | load/play/pause/stop/seek/volume/status，state 事件（state/positionMs/durationMs/error） |
| MediaSession | AVSession 创建、含 coverUrl→mediaImage 和 album 的元数据、系统播放/暂停/上一首/下一首/seek |
| App | backButton 事件、minimizeApp；根路由返回使应用进入后台 |
| AppPrefs | 屏幕方向 |
| FileExport | 系统保存选择器，文本或 sourcePath 导出 |
| StatusBar | 系统栏文字颜色、透明背景及全屏 overlay；原生避让区通过 __suchHarmonyInsets 同步到 CSS |
| FloatingLyric | 明确返回未支持，open 报错并引导使用应用内歌词 |

文件导入支持 mp3/flac/wav/m4a/aac/ogg/lrc；最多 100 个所选文件。文本文件单个最多 4 MiB；普通 readFile 最多 96 MiB；桥接输入 JSON 上限 32 MiB，Base64 膨胀使大音频写入/下载受限。

`chooseDirs` 为兼容原 Android 契约保留方法名，鸿蒙实际选择文件并复制到沙箱，不代表获得任意共享目录扫描能力。权限 granted 仅代表沙箱可用，不代表共享存储全盘授权。

限制：原生网络不自动提供浏览器 Cookie 管理；登录需专项验证。插件脚本与应用共享 Web 上下文，不能将参数遮蔽当成安全沙箱；仅加载可信插件。发布前需进一步权限隔离和数据大小策略。


2026-10-24：MediaSession.updateMetadata 的 coverUrl 支持 HTTP(S)、data:image/...;base64、已打包 assets 路径、应用 filesDir 内文件。网络图最大 8 MiB，缩略至最大边 512 px 后传给系统；默认图用于缺失/无效封面。网络封面及同图 Base64 路径已真机验证。此修复不增加本地音频内嵌封面的提取功能，仅处理前端已经传入的图片。
