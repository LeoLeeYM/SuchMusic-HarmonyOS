# Task Summary

## 本次目标

按用户要求尝试将现有 SuchMusic 手机端移植到鸿蒙，并安装到已连接手机完成核心链路验证。

## 修改文件

- harmonyos/SuchMusic/：ArkTS 工程、EntryAbility、Index、NativeBridge、权限、资源、构建模板。
- src/renderer/src/platform/harmonyos/：Capacitor 兼容桥、原生播放器适配及 6 项单测。
- vite.config.mobile.ts：harmonyos 构建模式及入口注入。
- src/renderer/src/audio/audio-engine.ts：鸿蒙原生播放分流。
- src/renderer/src/components/layout/PlayerBar.vue：原生来源恢复及单一系统媒体会话。
- src/renderer/src/mobile/components/MobileEqPanel.vue、MobileFxPanel.vue：未支持音效提示。
- src/renderer/src/mobile/views/MobileLocalMusicView.vue、settings/panels/LocalPanel.vue、PlaybackPanel.vue：鸿蒙文件/音效提示。
- scripts/*.sh、.gitignore：统一构建/安装/日志/备份/回滚/设备调试入口及生成物忽略。
- ai-docs/：架构、接口、部署、决策、已知问题、操作说明、验证记录与截图。

原工作区已有多处修改，本列表仅描述本次移植增量，不代表其他 Git diff 均由本次产生。

## 修改内容

- 复用 Vue 手机界面，以 ArkWeb 原生资源拦截提供稳定 HTTPS 来源，修复 ES module/WASM 白屏。
- 实现异步请求/事件桥接、沙箱文件、系统文件选择、导出、原生 HTTP 和屏幕方向。
- 使用 AVPlayer + AVSession + AUDIO_PLAYBACK 连续任务提供播放、歌词位置同步及系统播控。
- 修复单曲结束、重复完成事件、相同歌曲恢复、原生/浏览器媒体会话竞争。
- 调试签名安装至 HUAWEI Pura X View；真实推荐/搜索接口、本地播放/seek、短时后台、自动切歌及控制中心按钮已验证。
- 13 项相关单测通过；Web 与原生构建通过。完整结果见 [验证记录](../validation/harmonyos-2026-10-24.md)。

## 风险影响

- 体验版未达全功能发布验收。高级音效/悬浮歌词未支持；长期后台、完整音源与文件流程仍需验证。
- 动态插件与 Web 同一上下文；大文件受 Base64/桥接内存限制；当前构建开启 Web 调试。
- 初始中文源码路径不可直接用于 Hvigor，缓存工程必须经脚本同步；签名仅本机保存。
- 全量 Vue 类型检查存在原有 songExport.ts 未使用函数错误；本次不删除既有代码。
- 不修改外部服务/数据库，不默认卸载清除用户数据；测试文件及历史已清理。

## 回滚方案

移植前源码快照：.local-backups/source-20261024-201420.tar.gz。通过 `./scripts/rollback.sh <archive> <new-directory>` 恢复到新目录核对，不覆盖原工作区。当前为首个鸿蒙 HAP，无历史鸿蒙包可自动回退；避免 git reset 或无条件卸载。

## 部署方式

```sh
./scripts/deploy.sh --device <serial>
./scripts/start.sh --foreground
./scripts/logs.sh --keyword SuchMusic --level E --from 5m --tail 50
```

签名 HAP 位于 ~/.cache/suchmusic-harmonyos/SuchMusic/entry/build/default/outputs/default/entry-default-signed.hap。源码、Web 资源和命令入口均保留，可复现构建；调试签名不适用任意未授权设备。
