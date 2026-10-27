# Task Summary

> 历史记录：本轮原生界面与队列改造已按用户要求撤销，当前状态见 `changelog/2026-10-24-revert-native-player.md`。本文及截图仅保留用于审计。

## 本次目标

按用户授权逐步原生化核心播控，并提升真机 UI 质感。交付 ArkUI 底部播放卡片、五项导航、沉浸式播放页及播放队列；保留现有首页、搜索、歌词、评论和插件功能。

## 修改文件

- harmonyos/SuchMusic/entry/src/main/ets/components/NativePlayback.ets
- harmonyos/SuchMusic/entry/src/main/ets/services/PlaybackModel.ets、NativeBridge.ets
- harmonyos/SuchMusic/entry/src/main/ets/pages/Index.ets
- harmonyos/SuchMusic/entry/src/main/resources/rawfile/icons/*.svg
- src/renderer/src/platform/harmonyos/nativeUI.ts、bootstrap.js、player.ts、player.test.ts
- src/renderer/src/layout/MobileLayout.vue
- src/renderer/src/components/layout/PlayerBar.vue
- src/renderer/src/mobile/views/MobilePlayerPage.vue
- ai-docs/architecture、api、context、validation

## 修改内容

- 原生浮动播放卡片展示封面、歌曲、歌手和独立播放/下一首；导航增加文字，适配深浅色。
- 原生播放页采用专辑背景、暗色渐变、圆角大封面、原生 Slider、大尺寸播放按钮；横屏采用封面/操作双栏。
- 原生队列显示总数、序号、时长和当前高亮；支持列表循环、单曲循环、随机播放、点选和前后切歌。
- AVPlayer 是原生界面进度和播放状态来源；Web 只同步曲目/队列/布局，不逐帧向原生界面推送进度。
- 原生已知文件路径可直接载入下一首，避免 Web 主线程忙碌阻断本地连续播放；未解析在线歌曲仍由现有 Web 插件获取音源。
- 曲目身份使用音源+歌曲 ID，下载缓存路径变化不会改变身份；原生选曲标记避免 Web watcher 再加载一次；旧歌曲进度被忽略，过期排队请求按请求代次跳过；显式加载不依赖 UI 快照先到达，避免恢复时序竞态。
- 原生界面按覆盖区域拦截触摸，解决真机发现的点击穿透到 Web 歌单问题。系统返回先关闭队列，再收起播放页。
- “歌词与更多”保留原 Web 播放功能，返回时回到原生播放页。其他平台保留原界面；原生初始化失败时仍保留 Web 底栏。
- 独立原生图标组件响应状态变化，避免 Builder 值参数导致暂停图标延迟刷新。

## 验证

- Web 构建、ArkTS 编译、调试签名完成；通过 scripts/start.sh 同签名覆盖安装 HUAWEI Pura X View（API 26）。
- 23 项测试通过：bootstrap 5、player 8、mediaSession 3、pluginFormats 7。
- 真机检查原生页面、封面、85 首队列、暂停/播放、进度跳转、队列点选、单曲重播、横屏双栏、安全区与返回行为；原生导航和 Web 搜索框分别点击可用，歌词关闭动画结束后恢复原生页。
- 复用设备已有缓存音乐临时构造 A/B 两项验收队列，A 剩余 2 秒时阻塞 Web 主线程 8 秒；B 在原生端自动播放，恢复后 AVPlayer 与 Web 均为 B，B 已播放约 8.4 秒。该短时测试不等同于长期锁屏/系统冻结/进程回收验收。
- 测试前保存原状态，测试后恢复《嫁给爱情》、85 首队列、历史、176023 ms 进度、原音量和暂停状态；未删除任何用户音乐。
- 全量 typecheck:web 仍只有既有 songExport.ts:108 的未使用 looksLikeAudio 错误，本次未改动该文件。

## 风险影响

- 首轮完成核心播控原生化，歌词渲染、评论、设置、首页/搜索和插件界面仍为 Web。
- 原生队列为当前进程内镜像与执行状态；重启仍由原 Web 持久化数据恢复，没有新增原生持久化库。
- 在线音源解析仍依赖 Web，已缓存音源和本地文件可直接切换。长期后台、进程冻结、系统回收和跨设备尚未验收。
- UI 仅实测当前 API 26 手机横竖屏；超大字体、其他机型、最低 API 22 待覆盖。
- 没有新增依赖、权限、服务、网络端口或数据库结构。既有用户改动保留。

## 回滚方案

变更前快照：`.local-backups/source-20261024-204405.tar.gz`。
用 scripts/rollback.sh 将快照解压到新目录；核对后仅恢复本记录涉及的代码文件，再完整构建与同签名覆盖安装。不要 git reset 整个工作区，不卸载应用，不改变 https://suchmusic.local 来源。

## 部署方式

```sh
./scripts/build.sh
./scripts/start.sh --device <serial>
./scripts/logs.sh --keyword SuchMusic --level E --from 5m --tail 50
```

包含 Web 修改，不能仅用 --native-only 完成首次部署。后续仅 ArkTS 视觉调整可复用已构建 Web 资源。

最终视觉与交互证据：[真机验收](../validation/harmonyos-native-2026-10-24.md)。已恢复 auto 方向偏好和 light 主题；临时测试队列条目为 0，手机留在原生播放页、保持暂停。
