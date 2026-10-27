# Task Summary

## 本次目标

修复鸿蒙真机状态栏、导航栏未沉浸导致的上下白条，同时确保文字/按钮避让系统区域。

## 修改文件

- harmonyos/SuchMusic/entry/src/main/ets/entryability/EntryAbility.ets
- harmonyos/SuchMusic/entry/src/main/ets/pages/Index.ets
- harmonyos/SuchMusic/entry/src/main/ets/services/NativeBridge.ets
- src/renderer/src/platform/harmonyos/bootstrap.js、bootstrap.test.ts
- src/renderer/src/platform/mobile/statusbar.ts
- src/renderer/src/mobile/views/MobilePlayerPage.vue
- src/renderer/src/mobile/theme.css
- ai-docs/architecture/frontend.md、deployment.md、api/harmonyos-bridge.md、context/、validation/

## 修改内容

- 页面加载前设置全屏窗口和透明系统栏；根容器扩展到系统/挖孔区域。
- 监听原生安全区与窗口尺寸变化，按 Web 视口比例把物理像素转换为 CSS 安全区变量；排除键盘区，页面离开解除监听。
- 修复首页双重顶部 padding，横屏使用实时安全区。
- 播放页采用浅色系统栏图标，关闭后恢复当前主题。

## 验证

- Web、ArkTS 和签名 HAP 构建通过；已同签名覆盖安装 HUAWEI Pura X View API 26。
- 15 项相关单测通过，其中新增两项验证安全区像素换算、缩放、旋转时清除旧方向尺寸。
- 首页视口 440×744、DPR 3；上/下安全区为 42/28 CSS px；首标题容器 y=42，底部导航按钮 bottom≈705.7，小于手势区起点 716。
- 播放页背景覆盖 440×744 全屏；内容 padding 52px 22px 38px，关闭按钮 y=52；白条消失且状态栏图标为白色。
- 深色主题实测系统栏白图标、背景透明；随后恢复原主题。
- 横屏视口 744×440，原生返回顶部 0、左侧 23.33、底部 28 CSS px；恢复竖屏后回到 42/0/28/0。设置页横屏截图正常避让。
- 最后 5 分钟 SuchMusic E 级日志无输出。全量类型检查仍为已有 songExport.ts:108 未使用 looksLikeAudio 错误，非本次引入。
- 截图：[首页](../validation/harmonyos-immersive-home.png)、[播放页](../validation/harmonyos-immersive-player.png)、[横屏](../validation/harmonyos-immersive-landscape.png)。播放页未播放音频。

## 风险影响

只在 HarmonyOS 注入/覆盖布局与播放页图标模式，Android 原主题行为保持。未变更 API 服务、权限、数据库、签名或 SDK。其他机型、三键导航与折叠状态未验收。安全区依据原生可用区域，系统短时隐藏栏时可能返回零。

## 回滚方案

本次开始前快照 `.local-backups/source-20261024-203213.tar.gz`。通过 scripts/rollback.sh 恢复到新目录核对后选择性恢复上列文件，不能 reset 整个已有工作区。重新完整构建并同签名覆盖安装，不卸载清数据。

## 部署方式

```sh
./scripts/build.sh
./scripts/start.sh
./scripts/logs.sh --keyword SuchMusic --level E --from 5m --tail 25
```

缓存 HAP 路径不变：~/.cache/suchmusic-harmonyos/SuchMusic/entry/build/default/outputs/default/entry-default-signed.hap。
