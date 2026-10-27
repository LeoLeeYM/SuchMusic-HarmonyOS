# 鸿蒙手机移植可行性评估

评估日期：2026-10-24，Asia/Shanghai。对象为当前 SuchMusic-NG 工作区，包含未提交修改。

## 结论与范围

移植技术上可行，推荐“Vue 移动界面 + ArkWeb 容器 + 鸿蒙原生平台桥接 + 原生播放内核”。核心音乐功能可行性高；与 Android 1.5.0 全功能完全一致存在明显平台约束。当前结论是源码及平台文档分析，没有鸿蒙 HAP、真机验证或上架结果。

主要面向使用鸿蒙原生应用体系的手机。若目标设备本身仍支持现有 Android APK，应另做 APK 安装兼容测试；这与开发鸿蒙原生发行包是不同的工作范围。目标机型、系统版本和最低 API 尚未确定。

## 已核实的源码依据

| 位置 | 观察 | 迁移意义 |
|---|---|---|
| package.json、vite.config.mobile.ts | Vue 3 + Capacitor 8；renderer 可单独构建为 dist-mobile，相对资源路径 | 可以复用 Web 界面，不必从 Electron 整体移植 |
| src/renderer/src/mobile/ | 47 个文件，已有手机布局、设置、列表及播放器组件 | 页面和大部分交互可保留；字体、WebGL、滚动及安全区仍需实测 |
| src/renderer/src/platform/index.ts:8 | 平台判定只依赖 Capacitor.isNativePlatform() | 直接放入普通 ArkWeb 会被判为 desktop，移动 IPC 和页面选择都可能失效 |
| src/renderer/src/platform/mobile/ipc.ts | 将 window.electron 调用映射为移动能力 | 现有调用契约有复用价值，可新增鸿蒙实现 |
| src/renderer/src/platform/mobile/native.ts | 注册 SuchLocalMusic、MediaSession、FloatingLyric、AppPrefs、FileExport 五个自定义插件 | 均需鸿蒙实现或明确降级，不能运行 Java 插件 |
| android/app/src/main/java/com/suchmusic/app/plugins/ | 七个 Java 文件，共 1,794 行，另有 MainActivity | 原生代码规模有限，但权限、生命周期和播放语义差异比行数更重要 |
| src/renderer/src/audio/audio-engine.ts:710 | 在线默认 HTMLAudioElement 直出，音效开启时整曲下载解码；本地文件使用 Capacitor.convertFileSrc | 需要新的播放后端、文件映射及内存策略 |
| MainActivity.java:101、MediaPlaybackService.java | onPause 后恢复 WebView；前台服务和 WakeLock 支持后台活动 | Android 保活策略无法直接照搬 |
| platform/mobile/httpAdapter.ts、pluginHost/host.ts | Axios 与插件请求走 CapacitorHttp | 网络桥接是基础功能，不能仅把代码加载到 ArkWeb |
| platform/mobile/pluginHost/sandbox.ts:177 | new Function 执行用户插件，并遮蔽部分全局变量 | 可在 Web JavaScript 环境研究复用；不能直接转成 ArkTS；参数遮蔽不构成强安全沙箱 |
| utils/karaoke/karaokeEngine.ts | OfflineAudioContext 解码 + module Worker 执行对齐 | 算法可复用，Worker 加载、解码、内存和后台行为需验证 |
| utils/request.ts | 配置外部音乐 API，登录 Cookie 使用 localStorage | 客户端迁移不等于外部服务可用性已验证 |
| android/app/build.gradle、android/variables.gradle | 1.5.0 / 6，minSdk 24、compileSdk/targetSdk 36 | README 的旧版本和 Android 6.0 要求不能作为当前构建依据 |

## 三条路线

| 路线 | 复用情况 | 风险与选择 |
|---|---|---|
| 仅 ArkWeb 包装现有 Web 播放器 | 页面复用最多 | 仍需平台判定、网络、文件和后台接口；适合短期验证，后台切歌和音效链未证实可靠 |
| ArkWeb + 鸿蒙原生播放/桥接 | 界面、歌单、歌词解析、部分插件协议可复用 | 推荐。系统播控、文件与播放生命周期更可控；增加 Web/原生状态同步成本 |
| 全 ArkUI / ArkTS 重写 | 主要复用数据协议和算法思路 | 原生体验潜力更高，但 Vue 模板、CSS、Naive UI、DOM 动画、动态插件宿主均需重做；不作为首版默认选择 |

Capacitor 官方 v8 文档列出的官方目标是 Android、iOS、Web。仓库没有鸿蒙平台实现；不能假设存在可直接使用的官方 cap add harmonyos 流程。第三方适配层即使存在，也需要另行核对版本、插件覆盖和维护状态。

## 推荐架构及关键约束

Web 层保留移动页面、歌词渲染和业务交互；平台层显式区分 desktop/android/harmonyos/web。新增受控的异步桥接，以 requestId 对应结果和事件；不向插件直接暴露任意文件或原生调用能力。现有 Capacitor 调用并未完全集中在 native.ts，还散布在音频、存储、插件宿主和歌词目录，应统一抽象。

普通播放采用 AVPlayer；AVSession 接收系统播放/暂停/切歌/进度控制；按实际播放状态申请与释放 AUDIO_PLAYBACK 长时任务，处理音频焦点、耳机拔出和蓝牙变化。AVSession 是播控会话，不是播放器，也不是无限后台许可。

原生播放状态应为权威状态。后台队列、自动下一首和 URL 刷新不能仅依赖页面计时器：需要验证 Web 插件宿主在后台的执行能力，并设计预解析/预取及必要的原生调度。仅替换“播放 URL”接口，仍不足以保证完整后台播放链路。

原生 AVPlayer 不会自动继承 WebAudio 节点上的 EQ、人声消除、声像扩展及交叉淡入淡出。需要高级音效时，评估解码 + DSP + AudioRenderer 的独立路径，或明确首版功能边界，不应让开关显示启用但实际无效。

文件层使用用户授权的文件/目录 URI 与应用沙箱，替代 Android MediaStore、SAF、content:// 和路径假设。验证重启后的授权、同目录歌词读取、缓存、批量导出及标签改写；必要时采用导入副本方式。大音频使用文件句柄/URI，不经 JavaScript 桥反复传整曲 Base64。

网络层覆盖插件请求、Axios、二进制下载，以及单独使用 fetch 的路径（如 spark.ts）；验证 Cookie、Referer/User-Agent、重定向、Range、超时和 HTTPS。使用原生 HTTP 不意味着认证或服务端限制自动消失。

## 功能迁移矩阵

| 功能 | 评估 | 必要工作 |
|---|---|---|
| 首页、搜索、歌单、设置 | 高可行性 | 复用 Vue；修正平台识别、返回键、安全区与横竖屏 |
| 普通在线/本地播放 | 高可行性 | AVPlayer 适配，文件 URI、格式、请求头与失败恢复 |
| 锁屏/后台/耳机播控 | 可行但必须原生适配 | AVSession、长时任务、焦点、后台切歌与队列 |
| 应用内逐行/逐字歌词 | 高可行性 | 保留渲染，原生进度对时，验证掉帧和后台恢复 |
| 逐字歌词自动生成 | 中等风险 | OfflineAudioContext/Worker 兼容、取消任务和内存峰值 |
| 音源插件 | 中高风险 | 保留协议及转换器；重做 HTTP/文件桥；验证动态脚本生命周期与隔离 |
| EQ/人声消除/声场/淡入淡出 | 高工作量 | 原生 DSP 或经验证的 WebAudio 路径；音质、延迟与功耗验收 |
| 音乐扫描、缓存、标签与导出 | 中等风险 | 文件授权模型、元数据提取、写权限、存储迁移 |
| Android 式跨应用悬浮歌词 | 高限制 | 不列入首版等价承诺，采用应用内歌词；其他系统展示能力另做专项验证 |

devecocli 当前文档中 SYSTEM_FLOAT_WINDOW 属受限开放权限，列出的申请设备范围为 PC/2in1，不能据此承诺普通手机音乐应用可实现 Android 同类全局悬浮窗。画中画亦不能直接当作任意透明歌词悬浮窗。发布前需针对目标 SDK 和机型复核。

音频解码风险可量化：5 分钟、48kHz、双声道 Float32 PCM 约 115.2 MB（约 110 MiB），未含源文件、Base64、解码副本和歌词分析缓冲。当前整曲下载解码策略在长曲目和高采样率场景需要改进；这不是实测峰值。

## 建议投入与里程碑

以下为一名熟悉 Vue 与鸿蒙多媒体的开发者、可用真机/签名/测试音源条件下的粗估；不是工期承诺。范围扩大、第三方服务问题、权限审批和上架等待另计。

1. 技术验证：3–5 人日。运行移动页面，接通本地及在线播放、系统播控；熄屏 60 分钟并自动切换至少 10 首；验证一套实际插件、文件选择和逐字歌词 Worker。
2. 核心可用版：累计约 20–30 人日（4–6 工作周）。包括搜索/歌单、普通播放、文件导入、歌词、缓存、后台与蓝牙控制及基础回归；不含全量高级 DSP 和跨应用悬浮歌词。
3. 主要功能完善：累计约 40–60 人日（8–12 工作周）。补充可行的音效、插件兼容、导出/标签、耗电与性能优化、多机型回归；悬浮歌词等受限项仍不能承诺等价。
4. 全原生重写备选：约 60–100 人日（12–20 工作周）作为初步预算量级，需另行设计；不能沿用混合方案的时间预期。

如果技术验证阶段后台队列无法稳定推进，优先扩大原生调度和解析职责；若逐字生成造成明显卡顿或内存压力，限制并行任务/音频长度，或将解码与 DSP 迁到原生层。若原生深度体验是硬目标，再重新评估全 ArkUI 路线。

## 验收重点

- 真机：熄屏、后台、自动下一首、远程地址过期、重新回到界面后的状态一致性。
- 中断：电话/闹钟、其他媒体抢焦点、耳机拔出、蓝牙连接和断开。
- 数据：文件选择拒绝与撤销、重启持久授权、导入导出、缓存清理，旧路径不可直接迁移。
- 音频：MP3/FLAC/WAV 等实际样本、长音频、Seek、弱网、Range/重定向、音效真假生效。
- 性能：列表和歌词帧率、首播时间、内存、后台功耗；指标需在基线真机确定，不预设已达标。
- 插件：v1、lx、window.source 的代表样本、异常超时、可取消执行、桥接访问边界。
- 发布：保留现有 LICENSE/NOTICE/作者声明；音源使用、动态脚本、数据处理和实际分发方案需单独完成发布审查，本评估不确认上架通过。

## 本次验证与限制

已检查构建配置、移动页面目录、平台入口、音频内核、Java 插件、插件宿主、歌词引擎和关键存储/网络调用；通过 devecocli 查阅后台播放、Vue 交互、文件选择及受限权限文档，并核对 Capacitor 官方支持平台。

尝试执行仓库已有插件兼容测试：`npm run test:unit -- --run src/renderer/src/platform/mobile/pluginHost/pluginFormats.test.ts`。Vitest 在启动阶段因缺少 `@rollup/rollup-darwin-arm64` 失败，测试未执行。这是当前本机依赖不完整的证据，不是源码测试失败或鸿蒙不兼容的证据。本次未重装依赖、未执行构建、未访问真实账号、未验证外部 API、未部署设备。

## 平台依据

- [Capacitor 官方平台与环境说明](https://capacitorjs.com/docs/getting-started/environment-setup)，本次网页核对。
- [华为：后台播放](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/avsession-background-scene)，正文经 devecocli docs read 查阅，网页抓取超时。
- [华为：Web 页面调用应用侧函数](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/web-in-page-app-function-invoking)，配合 devecocli 的 Vue/React 交互 FAQ。
- [华为：受限开放权限](https://developer.huawei.com/consumer/cn/doc/harmonyos-guides/restricted-permissions)，正文经 devecocli docs read 查阅；须按目标发布 SDK 再复核。
- [华为：文件选择器](https://developer.huawei.com/consumer/cn/doc/harmonyos-references/js-apis-file-picker)，通过 devecocli 检索本地 API 文档。
