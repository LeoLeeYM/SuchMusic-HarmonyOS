# 回滚

`./scripts/rollback.sh <archive.tar.gz> <new-directory>` 将快照恢复到一个不存在的新目录；拒绝覆盖当前源码。先核对恢复结果，再选择性恢复本次移植文件，保留其他开发者修改。

鸿蒙代码集中在 harmonyos/、platform/harmonyos/、scripts/，以及移动 Vite 配置、audio-engine 和若干 UI 条件分支。不要批量撤销整个 Git diff，原工作区已有大量修改。

设备回退需要同包名、同签名的旧 HAP，经 scripts/start.sh 对应缓存工程安装。此次是首个鸿蒙试验版本，没有历史鸿蒙 HAP 可自动回退。卸载会删除手机应用数据，不能默认卸载。

本次没有数据库结构迁移。保留 https://suchmusic.local 来源以保持 Web 本地数据可见。

## 2026-10-24 播控原生化撤销

从 source-20261024-204405.tar.gz 定点恢复，撤销前快照为 source-20261024-210158.tar.gz。build.sh 增量同步原生工程，删除源码时须清理缓存对应残留，保留签名文件，再完整构建并同签名覆盖安装。详情见 changelog/2026-10-24-revert-native-player.md。
