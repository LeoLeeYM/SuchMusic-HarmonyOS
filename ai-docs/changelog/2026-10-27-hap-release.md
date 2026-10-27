# Task Summary

## 本次目标
打包鸿蒙 HAP 并上传到 GitHub Release；按用户补充要求仅上传未签名包。

## 修改文件
- ai-docs/architecture/deployment.md、context/recent-10-actions.md。
- 新增本记录；应用业务代码、版本及 SDK 未修改。

## 修改内容
- 从源码提交 574318540355bb32506464f94e613d81cd06e9db 构建，独立 ASCII 工程完整打包 Web 与 ArkTS。
- 显式清空构建环境中的 AI 翻译和 Supabase 配置。
- 预发布 tag：v1.5.0-harmonyos-preview.1。
- 附件：SuchMusic-HarmonyOS-1.5.0-unsigned.hap（26,917,179 字节）、SHA256SUMS.txt。
- HAP SHA-256：e67fe3f88869c8f353ad40ea3e684a554d97f6974c8e468e1594efa798bdb5f2。
- 已签名包、证书、私钥及 Profile 均不上传，仅保留在本机缓存。

## 风险影响
- 未签名 HAP 不能直接安装，下载者必须自行签名。
- 构建模式为 debug，Web 调试仍开启；此次为体验版预发布，不是应用市场正式发布。
- 此前同业务代码 50 项测试通过；本轮未重跑未改动的业务测试、未安装真机。
- 既有 songExport.ts:108 TS6133 及未完成的长期后台/插件/最低 API 验收不变。

## 回滚方案
撤回本次 Release/附件，不改写源码历史。若需修复产物，使用新 tag 发布并说明差异，避免覆盖已下载用户的校验和。本次未部署到手机，无用户数据或数据库回滚。

## 部署方式
从干净检出执行：
```sh
VITE_SPARK_API_KEY='' VITE_SUPABASE_URL='' VITE_SUPABASE_KEY='' \
  SUCHMUSIC_BUILD_DIR="$HOME/.cache/suchmusic-harmonyos/releases/v1.5.0-harmonyos-preview.1/project" \
  ./scripts/build.sh
```
取 entry/build/default/outputs/default/entry-default-unsigned.hap，改名后附 SHA256SUMS.txt，通过 gh release create 草稿上传，核验后公开为 prerelease。完整发布说明存于 Release 正文。

## 验证结果
- 完整构建成功；HAP ZIP CRC 检查正常，包含 Web 入口与 modules.abc。
- module.json 确认包名 com.suchmusic.app、版本 1.5.0/1500001、debug=true。
- SDK hap-sign-tool 对未签名包报告 signature not found / No Hap Signing Block，符合发布要求。
- 产物中未发现证书/私钥/Profile 或被移除的密钥模式。
- 附件回下载 SHA-256 与本地一致；GitHub 资产状态 uploaded，远端摘要一致。
- 2026-10-27 21:16:56（Asia/Shanghai）公开为预发布，isDraft=false / isPrerelease=true；仅有未签名 HAP 与 SHA256SUMS.txt 两个附件。
- 发布地址：https://github.com/LeoLeeYM/SuchMusic-HarmonyOS/releases/tag/v1.5.0-harmonyos-preview.1 。
