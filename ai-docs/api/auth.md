# 鉴权观察

2026-10-24：utils/request.ts 使用 localStorage 中的 netease_music_cookie 为请求附加登录信息。

本次未访问账号、未验证登录流程或修改鉴权；未记录 Cookie 或密钥值。鸿蒙移植需要测试 HTTP 桥与 Web 登录状态的一致性，不能把当前存储方式视为安全审计通过。
