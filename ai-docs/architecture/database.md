# 数据与存储

2026-10-24：未修改服务端数据库或持久化 JSON 格式，无数据库 migration。

- 设置、歌单、登录 Cookie 等继续使用原有 localStorage 格式。鸿蒙来源固定为 https://suchmusic.local；改变来源会导致已有 Web 数据不可见。
- 鸿蒙文件桥接根目录为 UIAbilityContext.filesDir；音乐导入到 filesDir/music。文件 path 拒绝 .. 和沙箱外绝对路径。
- 系统选择器授予所选文件 URI 访问权，导入时复制到沙箱，不保存共享目录授权，也不复用 Android 绝对路径。
- 首版 Filesystem 的 directory 枚举统一落到应用 filesDir，相对 path 保持原有业务命名；Cache 与 Data 尚未独立分区。
- 同名音乐/歌词导入会报错，不覆盖已有文件。批量导入中前面成功的文件可能已经保留，当前不提供整批事务回滚。
- 卸载会清除应用数据；覆盖安装使用同一签名保留数据。源码备份不包含手机应用数据。

2026-10-24 逐字歌词适配沿用现有 karaoke-lyrics/<path-hash>.lrc 与 index.json，未新增格式或迁移。歌词关闭/清空优先恢复会话中的原逐行文本，其次旁挂 LRC；若重启后仅剩增强 LRC，则去除词时间标签保留文本与翻译，避免清空歌词。原始音频不修改。

2026-10-24 静默缓存优化：清单结构不变，algo 可为 source-yrc。online-cache 下已知 source_id_quality 文件匹配按 source/id，旧条目仍通过保存的 key 读写；本地文件保留路径隔离。新记录对规范身份哈希，旧记录 key 不迁移。写入串行，不修改音频。回滚旧代码仍可读清单及文件，仅失去跨路径匹配。
