# 构建与部署

更新：2026-10-24。鸿蒙体验版已完成真机调试安装，未发布应用市场。

## 环境与构建目录

- DevEco CLI + DevEco Studio，SDK 根目录 `/Applications/DevEco-Studio.app/Contents/sdk/default`，本机 SDK 26.0.0.105。
- 源工程 `harmonyos/SuchMusic`；compileSdkVersion/targetSdkVersion 为 `26.0.0`，compatibleSdkVersion 为 `6.0.2(22)`。只验证了 API 26 真机，最低 API 22 尚未实测。
- Hvigor 不接受当前中文源码路径，因此脚本同步到 `~/.cache/suchmusic-harmonyos/SuchMusic` 构建。可通过 SUCHMUSIC_BUILD_DIR 指定纯 ASCII 路径。
- build-profile.template.json5 不含签名；缓存目录 build-profile.json5 由 CLI 生成本机调试签名，禁止提交证书、私钥、profile 或密码。
- 用户已在本机完成 devecocli auth login；调试签名仅适用获授权的设备，不是通用发布包。
- Web 静态资源从 dist-mobile 同步到 rawfile/web。没有新增 Web 服务、生产端口、数据库或后台服务器。
- `scripts/connect-debug.sh` 可转发本机 TCP 9229 到应用 ArkWeb 调试 socket；仅用于开发。首版启用了 Web 调试，正式发布前须关闭。
- DEVICE_SERIAL 控制 device.sh/stop.sh/debug 转发；CLI build/run/log 按各自参数选择设备（多设备使用 --device）。DEVECO_HDC 可覆盖 SDK HDC 路径。

## 统一入口

```sh
./scripts/backup.sh
./scripts/deploy.sh --device <serial>
./scripts/start.sh --foreground
./scripts/stop.sh
./scripts/restart.sh
./scripts/logs.sh --keyword SuchMusic --level E --from 5m --tail 50
```

- build.sh：Web 构建、同步资源、devecocli build；--native-only 复用最近 dist-mobile，不能用于修改 Web 后的构建。
- deploy.sh：build、生成/更新调试签名、重新打包、安装启动。
- start.sh 默认安装启动缓存 HAP；--foreground 只拉起已安装应用。
- dev.sh 复用 deploy，未引入临时开发服务器。
- signed HAP：`~/.cache/suchmusic-harmonyos/SuchMusic/entry/build/default/outputs/default/entry-default-signed.hap`。

依赖已按 pnpm-lock.yaml 恢复，移动构建、ArkTS 构建及 13 项相关单测通过；全量 typecheck:web 仍有原有 songExport.ts 未使用函数错误，详见已知问题。


### 2026-10-24 系统栏修复安装

通过 scripts/build.sh 和 scripts/start.sh 完成增量构建、同签名覆盖安装。修改包含 Web 和 ArkTS，因此不能仅使用 --native-only 构建。未修改包名、签名、权限、SDK、服务器或环境变量。新增安全区测试后相关单测为 15 项。


### 2026-10-24 播控封面修复安装

Web + 原生完整构建后通过 scripts/start.sh 同签名覆盖安装，当前真实歌曲封面已在系统控制中心显示。无依赖/权限/服务器/环境变量变更；相关单测累计 19 项通过。构建和 HAP 路径不变，完整类型检查仍有原有 songExport.ts 未使用函数错误。

### 2026-10-24 核心播控原生化（历史，已撤销）

新增 NativePlayback/PlaybackModel、原生 SVG 图标和 SuchNativeUI 桥接，完整 Web + ArkTS 构建后同签名覆盖安装。构建路径、SDK、包名、权限、服务及签名方式均不变。23 项相关测试通过；原有全量类型检查错误保留。部署必须包含最新 dist-mobile，详见 changelog/2026-10-24-harmonyos-native-player.md。

### 2026-10-24 撤销核心播控原生化

恢复 20:44:05 快照中的 8 个源码文件，移除 NativePlayback/PlaybackModel/SuchNativeUI 和专用图标。构建缓存的已删除文件也需定点清理，避免增量 rsync 残留；保留缓存签名配置。通过 scripts/build.sh 完整构建 Web + ArkTS，再由 scripts/start.sh 同签名覆盖安装。不能卸载应用；本次不迁移或清空手机数据，不改 SDK/权限/包名/环境变量。验收结果见撤销记录。

### 2026-10-24 逐字歌词适配

仅修改 Web 业务与渲染，使用完整 scripts/build.sh 打包 Worker 和页面，再 scripts/start.sh 同签名覆盖安装。SDK、权限、签名、服务器及环境变量不变。缓存仍在应用 filesDir/karaoke-lyrics，不迁移存储。40 项相关测试通过；全量类型检查保留既有 songExport.ts 错误。真机结果见逐字歌词 changelog。

### 2026-10-24 静默生成与缓存复用

Web 完整构建后同签名覆盖安装。仍使用现有 api.enzymeym.top/lyric/new，新增可选 4 秒超时读取 YRC；无环境变量/服务/SDK/权限变化，不上传音频。缓存规则变更与回滚见 word-lyrics-quiet-cache changelog。

## 2026-10-27：源码仓库与可选配置

鸿蒙源码仓库：https://github.com/LeoLeeYM/SuchMusic-HarmonyOS ，分支 main。首次同步基于远端初始化提交 1c7bce7，不推送原工作区的旧历史，不修改原 origin。构建仍通过 scripts/build.sh；本次仅源码发布，不安装设备、不发布应用市场。

根目录 .env.example 提供可选 VITE_SPARK_API_KEY；复制到忽略的 .env.local 后仅供个人调试 AI 翻译。移动/桌面 Vite 显式读取根目录配置。缺失时 AI 翻译报配置错误，逐字歌词本地算法不依赖该值。VITE 值会嵌入客户端，公共构建保持为空。签名、备份、设备截图、依赖和生成产物均不上传。

新检出使用 Node.js 22、pnpm 10 与已有 lockfile；先 npx --yes pnpm@10.34.9 install --frozen-lockfile --ignore-scripts，再执行 scripts/build.sh。未签名构建不要求开发者登录；真机安装使用自己的开发者调试签名。

## 2026-10-27：GitHub Release HAP 分发

发布标签 `v1.5.0-harmonyos-preview.1`，应用 1.5.0/1500001，构建源码 `574318540355bb32506464f94e613d81cd06e9db`。用户明确要求上传未签名版本，仅发布 `SuchMusic-HarmonyOS-1.5.0-unsigned.hap` 和 `SHA256SUMS.txt`。源码树仍不包含安装包。下载者必须用自己的适用证书和 Profile 签名；debug 构建不等于市场 release 模式，Web 调试仍开启。

构建入口仍是 `scripts/build.sh`。在已恢复依赖的干净检出中，将 `SUCHMUSIC_BUILD_DIR` 指向独立的纯 ASCII 目录，以 `VITE_SPARK_API_KEY='' VITE_SUPABASE_URL='' VITE_SUPABASE_KEY=''` 禁止嵌入本机账号配置。本次独立构建目录为 `~/.cache/suchmusic-harmonyos/releases/v1.5.0-harmonyos-preview.1/project`；曾复制本机签名配置用于初步打包，但上传只选择 `entry-default-unsigned.hap`。复现未签名包不需要复制签名，脚本会使用空签名模板。

发布使用 gh release 的草稿附件上传、文件/校验和检查，再公开为预发布；Release 不标记 latest。使用 SHA256SUMS.txt 校验下载文件。本轮未运行 deploy.sh 或安装手机，不改变手机用户数据。更正包用新版本发布，勿静默替换同名附件；撤回时移除本次 Release/附件，保留源码提交和审计记录。
