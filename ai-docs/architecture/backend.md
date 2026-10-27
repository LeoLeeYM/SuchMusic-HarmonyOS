# 后端与原生宿主

- 客户端仓库未包含本次需部署的服务端。Electron 主进程在 src/main；Android 通过 Capacitor 和 Java 插件提供原生能力。
- 鸿蒙宿主在 `harmonyos/SuchMusic`：EntryAbility 保存 UIAbilityContext；Index 提供 ArkWeb 本地资源；NativeBridge 处理 HTTP、沙箱文件、系统选择器、AVPlayer、AVSession、后台音频任务和方向设置。
- 普通音频由原生 AVPlayer 解码，音频中断触发暂停；播放/暂停/切歌/seek 命令串行化。播放时申请 AUDIO_PLAYBACK 连续任务，暂停/停止时释放。
- 播放队列和音源解析仍在 Vue 层；短时后台可运行，长期挂后台或 Web 渲染进程冻结仍需专项验证，尚未迁移为完整原生队列。
- 外部推荐/排行榜数据及音乐搜索请求已在真机返回真实数据；账号登录、全部音源插件、在线完整播放未逐项验收。
- 桥接契约见 [harmonyos-bridge.md](../api/harmonyos-bridge.md)。


## 2026-10-24 播控封面

NativeBridge 的 MediaSession.updateMetadata 接收 coverUrl，并通过 MediaArtwork 读取 HTTP(S)、Base64 data URL、本地打包 Web 资源或应用沙箱图片，缩略为最大边 512 px 的 PixelMap 后写入 AVMetadata.mediaImage，同时补齐 album。此前只提交标题/歌手/时长，是控制中心缺图的根因。

切歌先使用默认图替换旧封面，再异步加载新封面；序号检查和串行元数据写入防止旧请求覆盖新曲目。解码源、网络请求和 PixelMap 均释放；缓存仅保存最近一张编码图片，下载/读取上限 8 MiB，像素总量上限 6400 万。网络连接/读取超时为 5/8 秒。图片失败保留默认图并记警告，不中断音乐播放。

前端对封面压缩添加代次校验；停止媒体会话后不再提交之前待处理的封面。HarmonyOS 播放进度回调只有时长实际变化才更新歌曲对象，避免每次 tick 引发封面元数据重建。
