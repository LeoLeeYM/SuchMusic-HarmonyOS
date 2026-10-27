# SuchMusic HarmonyOS

SuchMusic 社区版的鸿蒙移植版本，基于 Vue 移动界面 + ArkWeb + ArkTS 原生媒体内核。当前版本 **1.5.0（1500001）**，包名 `com.suchmusic.app`，属于核心链路体验版。

## 当前功能

- 原生 AVPlayer 播放、AVSession 系统播控、控制中心专辑封面和后台音频任务。
- 保留 Web 首页、播放器、队列和歌词界面；沉浸式状态栏/导航栏与安全区适配。
- 逐字歌词缓存复用、网易 YRC 读取和无数据时静默本地生成；首次本地分析仍需时间。
- 原生 HTTP、沙箱文件和系统文件选择器桥接。

已撤销此前实验性的 ArkUI 播放器界面；原生音频内核继续保留。API 26 真机做过核心链路验证，最低 API 22、长期锁屏、完整插件/登录/导入导出仍待专项验收。高级 DSP、跨应用悬浮歌词暂不支持，详见[已知问题](ai-docs/context/known-issues.md)。

## 构建与调试

以下流程在 macOS + Node.js 22 + DevEco Studio/CLI 环境使用，项目 SDK 为 `26.0.0`，最低声明版本 `6.0.2(22)`。使用 pnpm 10 恢复已有 lockfile（不要用 npm install 解析 `link:` 依赖）。

```sh
git clone https://github.com/LeoLeeYM/SuchMusic-HarmonyOS.git
cd SuchMusic-HarmonyOS
npx --yes pnpm@10.34.9 install --frozen-lockfile --ignore-scripts
./scripts/build.sh
```

脚本先构建 Vue，再同步到 `~/.cache/suchmusic-harmonyos/SuchMusic` 编译 HAP，避免 Hvigor 的中文路径限制。可设置 `SUCHMUSIC_BUILD_DIR` 指向其他纯 ASCII 目录。首次构建使用无签名模板，不包含开发者证书。

连接已开启调试的手机，完成开发者登录后执行：

```sh
devecocli auth login
devecocli device list
./scripts/deploy.sh --device <serial>
```

调试签名需使用自己的华为开发者账号及设备授权。不要提交缓存工程内的 `build-profile.json5`、证书、私钥或签名包。完整说明见[部署文档](ai-docs/architecture/deployment.md)。

## 可选 AI 翻译配置

默认源码不附带 AI 服务凭证；音乐播放、逐字歌词本地生成和缓存无需此凭证。个人调试时可复制 `.env.example` 到 `.env.local`，配置 `VITE_SPARK_API_KEY` 后重新构建。

`VITE_*` 会进入客户端产物，不是服务端密钥保管方式；共享构建保持为空。未配置时手动 AI 翻译会明确提示缺少配置。

## 源码结构

| 路径 | 用途 |
| --- | --- |
| `harmonyos/SuchMusic` | 鸿蒙 ArkTS 工程与资源 |
| `src/renderer/src/platform/harmonyos` | Web / 原生兼容桥接 |
| `src/renderer/src/mobile` | 手机界面与歌词播放器 |
| `src/renderer/src/utils/karaoke` | 本地逐字歌词、缓存与音源数据 |
| `packages/suth-lyric-kit` | 共用歌词依赖源码 |
| `scripts` | 构建、安装、日志、备份和回滚入口 |
| `ai-docs` | 架构、历史决策、验证记录和已知限制 |

仓库保留共用桌面/Android 源码，便于追溯及维护；本轮未重新验证这两个平台。桌面可选预编译解码器、本机截图、安装包、依赖及缓存不纳入本次源码同步。

## 来源与许可证

基于 [Enzymeym/SuchMusic-NG](https://github.com/Enzymeym/SuchMusic-NG) 及柠檬桶（@LJT-YTWH）的 Android 社区移植版继续移植。保留原作者版权、[NOTICE](NOTICE) 和 **[AGPL-3.0](LICENSE)**；目标仓库初始化时的 MIT 模板已替换为源项目许可证。鸿蒙移植维护者：LeoLeeYM。

原始说明见 [Android 社区版 README](README-Android.md) 与 [PC README](README-PC.md)。本项目不提供音乐内容，音源由用户配置。
