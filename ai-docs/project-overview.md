# SuchMusic 项目概览

更新：2026-10-27（Asia/Shanghai）。

- 原项目为 SuchMusic-NG Android 社区移植版，保留 Electron 桌面端；Android 声明版本 1.5.0 / 6。
- 技术栈：Vue 3、TypeScript、Pinia、Naive UI、Vite、Capacitor 8；Android 使用 Java 扩展。
- 已新增鸿蒙体验版：`harmonyos/SuchMusic`，包名 `com.suchmusic.app`，版本 1.5.0 / 1500001，ArkWeb 复用手机页面，ArkTS 提供 AVPlayer、AVSession、文件和 HTTP 桥接。
- 在 HUAWEI Pura X View（API 26）构建、调试签名、安装并进行真机验证。当前属于核心链路技术验证，尚非完整功能发布版。
- 详情：[移植记录](changelog/2026-10-24-harmonyos-port.md)、[部署](architecture/deployment.md)、[已知问题](context/known-issues.md)。最初的 [可行性评估](architecture/harmonyos-feasibility.md) 保留为历史材料。
- 原有工作区已有多处修改和未跟踪源码；不能把整个 Git diff 视为本次移植修改，禁止覆盖或 reset。
- 许可声明以 LICENSE、NOTICE 为准。源码同步到 LeoLeeYM/SuchMusic-HarmonyOS；未上架应用市场。
