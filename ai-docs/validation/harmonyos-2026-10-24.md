# 鸿蒙真机验证记录

时间：2026-10-24 20:14–20:30（Asia/Shanghai）。设备：HUAWEI Pura X View，API 26 Release。

## 构建及代码检查

- Web：`npm run mobile:build -- --mode harmonyos` 成功。
- ArkTS/HAP：`./scripts/build.sh` / devecocli build 成功；CLI 调试签名生成成功。
- 安装启动：`./scripts/start.sh` 成功，应用版本 1.5.0 / 1500001。
- Vitest：bootstrap 3 项、player lifecycle 3 项、原插件格式 7 项，共 13/13 通过。
- Shell：scripts/*.sh 的 bash -n 通过。git diff --check 无空白错误（现有 CRLF 提示不属于本次语法失败）。
- 全量 `typecheck:web` 未通过：既有 songExport.ts:108 未使用 looksLikeAudio，未改动此函数。
- HAP SHA256：`34f03799272c46e097fefbb2a9f9ea091f941e0fa6ac03bf81cdbcc12a0f62d8`。

## 真机操作与结果

| 项目 | 结果与边界 |
| --- | --- |
| 启动/首页 | 真实推荐歌单与排行榜显示；平台识别为 harmonyos |
| 原生 HTTP | 实际搜索接口返回 HTTP 200 与歌曲 JSON；不代表完整在线播放验收 |
| 沙箱文件 | 文本 write/read/delete 往返成功；本地测试 WAV 元数据 duration=8000 ms |
| 播放/暂停/seek | playing 1148 ms → paused 1148 ms；seek 4000 + play 后 4877 ms；暂停后状态稳定 |
| 歌词 | 3 行测试 LRC 按播放位置显示，页面截图可见 |
| 单曲结束重播 | 8000 ms 测试音播放 2 秒，再等 8.5 秒仍 playing、position=2037 ms，确认完成后重播 |
| 双曲自动切换 | 2 首；第一首 playing 661 ms；8.5 秒后第二首标题已显示，playing 986 ms |
| 恢复同一首 | 原生 idle 时点击恢复的相同 ID 曲目，经修复可重新加载 |
| 返回桌面 | Home 后短时仍 playing，多次跨过 8 秒曲目结尾；未验证长期锁屏/省电 |
| 系统媒体会话 | hidumper 显示 SuchMusic 唯一 active/top audio session，元数据含标题、艺术家、duration=8000 |
| 控制中心按钮 | 实际点击播放后 playing 4286 ms；点击暂停后 paused 4690 ms |
| 文件选择器 | 调起后取消正常返回 canceled=true；选取/导出完整用户流程尚未验收 |
| 错误日志 | 最终 5 分钟 SuchMusic E 级过滤无输出；不代表所有系统日志无错误 |

测试使用临时生成的低振幅 440Hz、8 秒 WAV（两个文件）及 LRC，不以商业音源或 mock 业务数据替代网络验证。测试结束已删除三个测试文件，删除成功 3、失败 0，并清理其播放历史/队列引用，回到首页停止播放。未保存用户账号、文件列表或控制中心网络信息。

截图：[首页](harmonyos-home.png)、[原生播放与歌词](harmonyos-player.png)。播放器图来自测试阶段，测试音频已清理。

未覆盖：全部音源插件、账号登录、完整在线播放、导入导出实际文件、长时间后台/锁屏、蓝牙/来电、FLAC/M4A、折叠/横屏、最低 API、Android/Electron 回归。
