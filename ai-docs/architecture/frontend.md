# 前端架构

Vue 3 + TypeScript + Pinia + Vue Router + Naive UI，源码在 `src/renderer`，手机页面在 `mobile/`。

## 鸿蒙首版（2026-10-24）

- `vite.config.mobile.ts` 在 `--mode harmonyos` 下定义 VITE_HARMONYOS 并在模块入口前内联 `platform/harmonyos/bootstrap.js`。
- 启动脚本注册 CapacitorCustomPlatform 和插件方法表，将 nativePromise/nativeCallback 转发为带 request ID 的 ArkWeb 异步调用；原移动 window.electron 兼容层继续复用。
- ArkWeb 使用本地拦截的 `https://suchmusic.local/` 稳定来源；Hash 路由、localStorage、Worker 和 WASM 保持同源。此域名无需公网服务器或 DNS。
- `platform/harmonyos/player.ts` 对接原生播放状态。`audio-engine.ts` 只在 HarmonyOS 路由到原生；Android/桌面原分支保留。
- 播放完成后按模式切歌，同 ID 单曲需要主动重新 load；重复 completed 事件去重。恢复状态后原生无音源时允许重新加载。
- HarmonyOS 禁用浏览器 MediaSession，避免和原生 AVSession 争用系统播控。
- 均衡器/高级音效页面显示明确的未支持提示；本地文件页面使用“导入音乐”提示。
- 移动构建是运行验证，未做完整 Android/Electron 回归。


## 系统栏沉浸修复（2026-10-24）

鸿蒙主窗口在 loadContent 前设置全屏布局和透明系统栏，ArkUI 根容器扩展到系统/挖孔安全区。NativeBridge 在页面加载、windowSizeChange、avoidAreaChange 时发送系统栏/挖孔/手势指示条各边最大避让尺寸（物理像素），bootstrap 按 innerWidth/windowRect.width 转换为 CSS 像素并设置 --safe-area-inset-*。不把键盘高度混入永久安全区，监听器在页面离开时移除。

页面复用原有 --sat/--sab/--sal/--sar；鸿蒙首页仅由外层消费顶部安全区，移除内层重复留白。横屏按实时返回的安全区处理，不假设固定状态栏高度。StatusBar 桥接的 overlay/background 方法现在执行实际窗口操作。

播放覆盖层可见时通过 appearance override 切换浅色系统栏图标；退出后恢复当前主题。覆盖只在 HarmonyOS 启用，Android 原样式路径不变。真机验证见 changelog/2026-10-24-harmonyos-immersive.md。

## 2026-10-24 逐字歌词

沿用 Web 歌词界面，音频由 OfflineAudioContext 解码、Worker 内 V3/V4 算法估算词时间并输出增强 LRC。服务初始化立即处理当前歌曲，身份为 source/id/filePath，缓存路径更新也触发处理。选曲代次与任务取消代次分开；旧曲任务允许落盘，但不可覆盖新曲。歌词替换后清理高亮 DOM 缓存，避免行数不变时引用旧节点。时间插值在暂停/加载切换时重置，超前最多 1 秒且不超歌曲时长。歌词页可直接打开逐字设置。

2026-10-24：自动逐字流程改为缓存→已有时间戳→音源 YRC→静默 Worker。自动关闭时不再请求用户生成；自动任务不展示全局浮层或通知、不控制播放位置。手动任务保留进度与取消。当前网络直取仅支持明确 wy/netease sourceSongId，4 秒超时、会话请求去重；其他来源静默回退。逐字菜单取消阻塞生成选项并区分手动重新生成。
