# 原生播控真机验收

> 历史记录：本轮原生界面与队列改造已按用户要求撤销，当前状态见 `changelog/2026-10-24-revert-native-player.md`。本文及截图仅保留用于审计。

设备：HUAWEI Pura X View，API 26。时间：2026-10-24 20:58，Asia/Shanghai。

- Web + ArkTS 构建、签名、同签名覆盖安装成功；23 项相关测试通过。
- 原生首页卡片和五项导航可点击；原生搜索导航与 Web 搜索框分别到达 #/search；播放页点击不再穿透到底层页面。
- 《越难越爱》播放位置从约 7.5 秒经原生进度条跳到 106 秒；《嫁给爱情》播放、暂停、进度与 Web 状态一致。
- 队列能显示 85 首歌曲；临时 A/B 验收队列点选 A 后原生与 Web 都切到 A，选中高亮同步。
- A 剩余 2 秒时阻塞 Web 主线程 8 秒；恢复后 B 已播放约 8.4 秒，说明切歌发生在 Web 忙碌期间；随后验证单曲循环 B 后仍为 B 且进度重新开始。
- “歌词与更多”可打开原 Web 播放功能；系统返回关闭动画完成后 Web .player-page 移除，原生页恢复。
- 深浅色图标、原生封面背景、横屏双栏、状态栏与手势区避让经过截图检查。
- 恢复原《嫁给爱情》、85 首队列、历史、176023 ms 进度、音量、暂停状态、light 主题和 auto 方向偏好；testRows=0。手机留在原生播放页便于查看。
- SuchMusic 错误日志检查未返回新错误。typecheck:web 仍有此前存在的 songExport.ts:108 未使用函数问题。
- 未验收：长期锁屏/系统冻结/进程回收、在线源独立后台解析、最低 API 22、其他机型和大字体。原生队列暂为进程内数据。

## 最终截图

- [首页与原生底栏](harmonyos-native-home.jpeg)
- [深色底栏](harmonyos-native-dark.jpeg)
- [原生播放页](harmonyos-native-player.jpeg)
- [横屏播放页](harmonyos-native-land.jpeg)
- [原生队列](harmonyos-native-queue.jpeg)

收尾：已关闭本机 9229 的应用 ArkWeb 调试转发，删除设备 /data/local/tmp 中本次生成的临时截图/控件树；最终截图已归档在本目录。
