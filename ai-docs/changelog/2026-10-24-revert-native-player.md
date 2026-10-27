# Task Summary

## 本次目标
按用户要求撤销本轮播控原生化，恢复原 Web 界面；保留鸿蒙移植、沉浸式系统栏和系统播控封面修复。

## 修改文件
- 恢复 NativeBridge.ets、Index.ets、platform/harmonyos/bootstrap.js、player.ts、player.test.ts、MobileLayout.vue、PlayerBar.vue、MobilePlayerPage.vue。
- 移除 NativePlayback.ets、PlaybackModel.ets、platform/harmonyos/nativeUI.ts 和 rawfile/icons 下 45 个原生播控 SVG。
- 同步 ai-docs 当前架构、桥接、问题、待办、决策、部署和操作记录；保留历史原生化验收及截图并注明已撤销。

## 修改内容
- 从 .local-backups/source-20261024-204405.tar.gz 定点恢复 8 个源码文件，避免影响其他未提交工作。
- Web 恢复底栏、播放页及队列控制，AVPlayer/AVSession 继续提供原生音频及系统播控。
- 清理构建缓存中原生化专用源码/图标，保留调试签名。

## 风险影响
- 队列重新依赖 Web，长期后台与系统冻结仍需专项验证。
- 无数据库/存储格式、包名、权限或签名变更；覆盖安装保留已有应用数据。
- 全量类型检查仍有既有 songExport.ts 未使用 looksLikeAudio 问题。

## 回滚方案
撤销前备份为 .local-backups/source-20261024-210158.tar.gz。用 scripts/rollback.sh 解包到新目录，审阅后定点恢复上述源码和新增原生文件，再完整构建覆盖安装；禁止全量覆盖工作区或卸载应用。

## 部署方式
```sh
./scripts/build.sh
./scripts/start.sh --device <serial>
```

## 验证结果
- 19 项相关单测通过；完整 Web/ArkTS 编译、签名、安装及启动成功。
- 真机首页/播放页恢复 Web UI，原生覆盖层消失；viewport 440x744，安全区顶部 42、底部 28 CSS px，系统栏图标随播放页切换正常。
- 安装前后逐项比较队列 source/id，85 首队列一致；当前歌曲和暂停状态保留，播放页显示原 2:56 位置。重启后 AVPlayer 处于 idle，等待恢复播放；本轮未重复音频播放和控制中心封面验收，封面实现随基线保留。
- SuchMusic 近 3 分钟错误日志查询未输出错误。
- 截图：validation/harmonyos-revert-home.jpeg、harmonyos-revert-player.jpeg。清理调试转发和设备临时截图；未卸载或重置数据。
