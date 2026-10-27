# 部署

先读 architecture/deployment.md。通过 `./scripts/deploy.sh --device <serial>` 构建 Web、同步到纯 ASCII 缓存工程、生成调试签名、构建 HAP、覆盖安装并启动。已在 API 26 真机执行。

首次使用需本机开发者账号登录及设备调试授权；不要把签名材料提交到仓库。覆盖安装应保持同一签名，不使用 --uninstall 作为默认解决方案，因为卸载会丢失手机数据。

验证：启动有实际页面；推荐/排行榜可返回；本地音频播放、暂停、seek、歌词、系统控制中心可用；通过 logs.sh 检查异常。构建成功不代替功能验收。全部限制见 context/known-issues.md。
