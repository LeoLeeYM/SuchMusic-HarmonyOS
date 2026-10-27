# 重启与日志

`./scripts/restart.sh` 先 force-stop 应用，再安装/启动当前缓存 HAP；会中断正在播放的音频，但不清除用户数据。只拉起当前应用用 `./scripts/start.sh --foreground`。

`./scripts/stop.sh` 停止应用。多设备时 HDC 入口需设置 DEVICE_SERIAL，CLI run/log 另传 --device。

`./scripts/logs.sh --keyword SuchMusic --level E --from 5m --tail 50` 获取原生/桥接错误；`./scripts/logs.sh --crash` 获取崩溃日志。开发调试使用 `./scripts/connect-debug.sh`，检查完成后移除 HDC 转发。

本项目本次不启动服务器进程。
