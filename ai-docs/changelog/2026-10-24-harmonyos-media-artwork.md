# Task Summary

## 本次目标

解决鸿蒙播控中心没有歌曲封面的问题。

## 修改文件

- harmonyos/SuchMusic/entry/src/main/ets/services/MediaArtwork.ets（新增）
- harmonyos/SuchMusic/entry/src/main/ets/services/NativeBridge.ets
- src/renderer/src/platform/mobile/mediaSession.ts、mediaSession.test.ts
- src/renderer/src/platform/harmonyos/player.ts、player.test.ts
- ai-docs/architecture/backend.md、deployment.md、api/harmonyos-bridge.md、context/

## 修改内容

前端已经传 coverUrl，原生此前忽略此字段。现转换为最长边 512px PixelMap 并写入 AVMetadata.mediaImage，附带 album；支持网络、Base64 data URL、打包 assets 和沙箱图片。

切歌先设置默认封面避免残留旧图，然后异步更新；前后端分别防止异步旧请求覆盖新曲目，原生元数据提交串行化。限制图片大小、像素及超时，缓存一张编码图，及时释放图像对象。图片加载失败不影响播放。

修复 HarmonyOS 每次时间回调无条件 setDuration、进而反复更新媒体元数据的问题。前端停止媒体会话时取消之前待提交的压缩结果。

## 验证

- Web、ArkTS、HAP 构建及同签名覆盖安装成功。
- 在 HUAWEI Pura X View 的实际控制中心目视确认当前《嫁给爱情》（杨千嬅）专辑图正确显示。
- 当前同张图片网络请求 HTTP 200；497600 字符 Base64 图片传入原生成功，随后恢复原 URL。日志无 Media artwork 警告。
- 19 项相关单测通过，新增异步旧图丢弃、停止后取消、封面参数保留、进度 tick 不重建元数据测试。
- 全量 typecheck:web 仍只有既有 songExport.ts:108 未使用 looksLikeAudio 错误。
- 系统控制中心截图仅用于本次临时检查，不保存包含无关设备信息的整屏截图到仓库。

## 风险影响

网络封面最大 8 MiB，最大 6400 万像素；连接/读取超时 5/8 秒。图片无效/无封面时显示应用默认图。仅支持应用沙箱内文件，不扩大共享存储权限。此改动不负责本地音乐文件内嵌图片提取。

## 回滚方案

本次前快照 .local-backups/source-20261024-203802.tar.gz。通过 scripts/rollback.sh 恢复至新目录核对，再选择性恢复本次文件并完整构建；保持签名覆盖安装，不 reset 其他工作、不卸载清数据。

## 部署方式

```sh
./scripts/build.sh
./scripts/start.sh
./scripts/logs.sh --keyword 'Media artwork' --from 5m --tail 15
```

使用原缓存构建路径和调试签名，未变更权限、依赖、SDK、服务器或数据库。
