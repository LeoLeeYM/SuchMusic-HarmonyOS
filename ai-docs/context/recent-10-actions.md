# 最近操作

## 2026-10-27 GitHub 鸿蒙源码同步

- 内容：将当前鸿蒙版及共用源码同步到 LeoLeeYM/SuchMusic-HarmonyOS 的 main；在远端初始化提交上追加，不改原工作区 origin、不带入上游历史。
- 文件：README.md、README-Android.md、NOTICE、.gitignore、.env.example、spark.ts、Vite 配置、ai-docs；鸿蒙及共用源码首次纳入目标仓库。
- 状态：独立检出依赖恢复成功，50 项相关测试通过，Web/ArkTS 构建生成未签名 HAP；全量类型检查仍为既有 songExport.ts 未使用函数错误。
- 保护：本机备份 source-20261027-210537.tar.gz；AI 凭证迁移到忽略的 .env.local；证书/构建产物/设备截图不上传。
- 后续：维持已知功能限制；不代表市场发布或新增真机验收。

## 2026-10-24 21:25（Asia/Shanghai）逐字歌词静默生成与缓存复用

- 内容：自动生成移除弹窗/胶囊/toast/暂停/seek；缓存优先、网易源 YRC 次之、本地算法静默回退；在线缓存跨音质复用，清单写入串行化。
- 文件：karaokeService、karaokeStorage、onlineWordLyrics 及测试；netease/lyric、MobileKaraokeOverlay、MobilePlayerPage、ai-docs。
- 状态：50 项相关测试通过，Web/ArkTS 构建签名及覆盖安装成功。真机 3 次缓存恢复耗时 38/23/30ms，提示数量为 0；曲目/30 首队列/暂停状态/30001ms 进度保持不变。
- 备份：.local-backups/source-20261024-212158.tar.gz。
- 后续：新歌无源逐字数据时首次本地分析仍需时间；本轮接口未返回 YRC，真实命中样本待覆盖；原类型检查问题保留。

## 2026-10-24 21:18（Asia/Shanghai）鸿蒙逐字歌词适配

- 内容：缓存路径就绪触发生成、启动自动恢复、稳定曲目标识、切歌/取消竞态保护、原歌词恢复；逐字 DOM 重绑定、播放时钟插值、入口与阶段提示。
- 文件：karaokeService.ts/test、utils/lyric/timing.ts/test、MobilePlayerPage.vue、MobileKaraokeOverlay.vue、ai-docs。
- 状态：40 项相关测试通过，完整 Web/ArkTS 构建签名与真机安装成功；真实 MP3 V4 生成、持久化、重启恢复及高亮节点生效已验证。逐字开关已开启。
- 真机：先验收《嫁给爱情》，后用户切到《归零（原创旧版）》自动生成成功；保留用户当前 30 首队列及暂停状态，未用旧测试快照覆盖。
- 备份：.local-backups/source-20261024-211012.tar.gz。
- 后续：逐字时间为本地估算；更多编码、大文件/长期后台、最终版完整播放操控与精度需继续专项测试。原 songExport.ts 类型检查问题保留。

## 2026-10-24 21:04（Asia/Shanghai）撤销播控原生化

- 内容：定点恢复原生化前 8 个源码文件，移除 48 个专用文件及构建缓存残留；恢复 Web 底栏、播放页和队列。
- 文件：NativeBridge.ets、Index.ets、platform/harmonyos、MobileLayout.vue、PlayerBar.vue、MobilePlayerPage.vue、rawfile/icons、ai-docs。
- 状态：19 项测试通过，Web/ArkTS 构建签名和真机覆盖安装成功；首页/播放页检查通过，顶部 42、底部 28 CSS px 安全区保持。当前歌曲及 85 首队列不变，保持暂停。
- 保留：鸿蒙混合移植、原生音频内核、系统播控封面修复、沉浸式系统栏和其他已有修改。
- 备份：撤销前 source-20261024-210158.tar.gz；恢复来源 source-20261024-204405.tar.gz。
- 后续：长期后台队列仍依赖 Web，既有全量类型检查问题未改。

## 2026-10-24 20:55（Asia/Shanghai）核心播控原生化（已撤销）

- 内容：ArkUI 底部播放卡片/导航、全屏播放页、进度条、队列；原生选曲/已缓存文件连续播放、Web 状态同步、触摸区域隔离。
- 文件：NativePlayback.ets、PlaybackModel.ets、NativeBridge.ets、Index.ets、rawfile/icons、platform/harmonyos、MobileLayout.vue、PlayerBar.vue、MobilePlayerPage.vue、ai-docs。
- 状态：Web/ArkTS 编译签名及真机覆盖安装；23 项相关测试通过。真机完成播放暂停、seek、横屏、队列点选、单曲循环、Web 阻塞 8 秒后的本地自动切歌检查。
- 备份：.local-backups/source-20261024-204405.tar.gz；测试前保存设备播放数据，测试后恢复原歌曲/85 首队列/历史/进度/音量/暂停状态。
- 后续：未解析在线源仍依赖 Web；原生队列持久化、长期锁屏、其他机型和大字体待专项验证。全量类型检查仍有原 songExport.ts 未使用函数错误。

## 2026-10-24 20:41（Asia/Shanghai）控制中心歌曲封面修复

- 内容：接入 AVMetadata.mediaImage、专辑字段、原生图片加载/缩略/缓存/释放、异步代次校验；消除进度 tick 重建歌曲元数据。
- 文件：services/MediaArtwork.ets、NativeBridge.ets、platform/mobile/mediaSession.ts/test、platform/harmonyos/player.ts/test、ai-docs。
- 状态：构建、签名及覆盖安装成功；真机控制中心当前《嫁给爱情》显示专辑图；同图网络 HTTP 200 和 Base64（497600 字符）处理成功，无封面警告。测试后恢复原网络封面元数据，不修改曲目/队列。
- 检查：19 项相关单测通过；全量类型检查仍是已有 songExport.ts 未使用函数错误。
- 备份：.local-backups/source-20261024-203802.tar.gz。
- 后续：本地音频内嵌封面提取另行实现；沙箱封面/打包资源分支未做完整真机覆盖。

## 2026-10-24 20:35（Asia/Shanghai）状态栏与导航栏沉浸修复

- 内容：透明全屏窗口、原生安全区→CSS 同步、首页去重留白、播放页图标明暗覆盖与横屏避让。
- 文件：EntryAbility.ets、Index.ets、NativeBridge.ets、platform/harmonyos/bootstrap.js/test、platform/mobile/statusbar.ts、MobilePlayerPage.vue、mobile/theme.css、ai-docs。
- 状态：已构建签名 HAP 并覆盖安装真机；首页和播放页无白条，viewport 440×744，安全区顶部 42/底部 28 CSS px；旋转 744×440 后避让区更新，再转回恢复。系统栏图标随深浅色切换。
- 检查：15 项相关单测通过，Web/ArkTS 构建成功；全量类型检查仍保留既有 songExport.ts 未使用函数错误。
- 备份：.local-backups/source-20261024-203213.tar.gz。验证图位于 validation/harmonyos-immersive-*.png。临时主题/方向已恢复。
- 待处理：其他机型、三键导航、折叠切换验收。

## 2026-10-24 20:30（Asia/Shanghai）鸿蒙体验版移植完成

- 内容：新增 ArkTS/ArkWeb 工程、兼容桥接、原生播放/系统播控/后台任务及文件/HTTP 能力；修复白屏与播放生命周期问题。
- 文件：harmonyos/、platform/harmonyos/、vite.config.mobile.ts、audio-engine.ts、PlayerBar.vue、移动端音效/文件提示、scripts/、ai-docs/。
- 状态：签名 HAP 已覆盖安装到 HUAWEI Pura X View（API 26）；首页、真实接口、本地播放/暂停/seek/歌词、单曲重播/双曲切换、短时后台和系统播控按钮验证通过。
- 检查：Web/ArkTS 构建成功，13 项测试通过；全量类型检查仍有既有 songExport.ts 未使用函数错误。
- 清理：删除两份 WAV 与一份 LRC、清理对应播放历史/队列，停止播放并回到首页，移除 HDC 9229 调试转发；保留源码快照与验证截图。
- 后续：完整音源插件/在线播放/文件导入导出、长期锁屏后台、大文件与折叠屏验证；音效/悬浮歌词仍不支持。
- 详情：changelog/2026-10-24-harmonyos-port.md、validation/harmonyos-2026-10-24.md。

## 2026-10-24 20:13（Asia/Shanghai）鸿蒙移植评估

- 内容：检查移动端、Android 桥接、音频与插件，查阅鸿蒙平台文档，新增 ai-docs 文档基线及评估报告。
- 涉及文件：ai-docs/project-overview.md、architecture/、api/、operations/、context/、changelog/2026-10-24-harmonyos-feasibility.md。
- 状态：评估完成；未改业务源码、依赖或构建配置，未构建/部署鸿蒙应用。既有工作区修改保持原样。
- 验证：已有插件单测启动失败，缺少 @rollup/rollup-darwin-arm64；测试未执行。
- 待处理：确认目标机型/API；补齐统一脚本；恢复本机依赖；进行后台切歌、文件 URI、插件与歌词性能验证。
