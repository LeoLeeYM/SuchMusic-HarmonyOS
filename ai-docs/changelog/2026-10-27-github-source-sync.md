# Task Summary

## 本次目标
将当前鸿蒙体验版及可构建共用源码同步到 https://github.com/LeoLeeYM/SuchMusic-HarmonyOS 。

## 修改文件
- README.md、README-Android.md、NOTICE、.gitignore、.env.example。
- src/renderer/src/apis/spark.ts、vite.config.mobile.ts、electron.vite.config.ts。
- ai-docs 项目概览、部署、技术决策、最近操作及历史命令中的设备标识。
- 目标仓库首次导入 harmonyos、src、packages、scripts、配置及共用平台源码。

## 修改内容
- 保留远端初始化历史，追加当前源码；工作区原 origin 保持不变。
- 根 README 改为鸿蒙入口，原 Android 说明保存为 README-Android.md。
- 原项目 AGPL-3.0/NOTICE 保留，替换目标仓库初始化 MIT 模板。
- AI 服务凭证移至本机忽略配置，仓库只包含空值模板与缺失配置错误。
- 不导入旧历史、依赖、签名、安装包、构建缓存、本机备份、设备截图、临时 Vite 配置或可选桌面解码器二进制。

## 风险影响
- 不配置可选 AI 凭证时翻译服务不可用；普通播放与本地逐字歌词不受影响。
- VITE 环境变量会进入客户端包；共享构建须保持该值为空。
- 保留既有全量类型检查问题及真机功能验收缺口，见 known-issues.md。
- 本次不改手机数据、包名、签名、服务器或数据库。

## 回滚方案
本机源码修改前快照为 .local-backups/source-20261027-210537.tar.gz，使用 scripts/rollback.sh 解包到新目录后定点恢复，不执行全量 reset。远端使用 git revert 撤销同步提交，不使用强推；不要重新引入旧凭证或将 AGPL 衍生源码改为 MIT。

## 部署方式
源码通过独立检出目录普通 git push origin main 同步。应用仍通过 ./scripts/build.sh 构建、./scripts/deploy.sh --device <serial> 安装；本次不执行设备安装。

## 验证结果
- 独立检出通过 pnpm 10.34.9 --frozen-lockfile --ignore-scripts 安装，未改 lockfile，不依赖原 node_modules 或本机环境变量。
- 50 项相关测试通过（鸿蒙桥接/播放、媒体会话、歌词算法/存储/自动任务/YRC/时间轴、插件格式）。
- 使用新建 ASCII 构建目录执行 scripts/build.sh，Web 与 ArkTS 构建成功；产物 entry-default-unsigned.hap 包含 Web 入口与 modules.abc。
- 源码与产物凭证模式扫描没有残留密钥；依赖、签名、本机配置及备份未纳入提交。
- typecheck:web 仍只有原 songExport.ts:108 的 TS6133，不宣称全量类型检查通过。
- 本次未执行真机安装或重新验证播放效果。
