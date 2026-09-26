# AGENTS.md — 在线客服项目开发规范

> 本项目为「在线客服」，Cloudflare Pages 项目名 livechat-h5，域名 https://zxkf01.cc。
> 与「主站 member-system（易捷相关）」是两个独立项目，使用独立 Supabase、独立仓库、独立 Cloudflare Pages。
> 禁止读取、修改、引用对方仓库的任何文件。

---

## 零、Agent 行为约束（最高优先级）

1. 不许执行任何 git 命令。 包括 git add、git commit、git push、git reset、git stash、git checkout、git fetch。
2. git 命令由用户本人在 Termux 手动执行。 Agent 只负责改文件内容。
3. 任何任务先给计划，等用户明确回复"执行"或"A"后，才能动文件。
4. 用户说"停手"后，立即停止所有操作，不再执行任何命令，包括"补救性"操作。
5. 汇报必须贴原始命令输出。 不许只写 "✅ 已完成"，必须有终端实际输出或 git diff 原文。
6. **不确定当前工作目录时，先跑 pwd 确认。** 不许在 ~/.hermes/ 目录下操作本项目的文件。不许跨目录操作。本项目文件只在 ~/zxkf01/ 内，其他目录的文件不属于本项目。

---

## 一、项目基本信息

- 项目类型：静态 HTML 客服站 + Supabase BaaS + Cloudflare Pages
- 定位：单租户、纯人工在线客服，只服务 https://www.yjcz01.cc
- 正式域名：https://zxkf01.cc
- Cloudflare Pages 项目名：livechat-h5
- GitHub 仓库：Fcai168/zxkf01
- Supabase 项目：https://qafwjrfozumfzhrbtuue.supabase.co
- 主要语言：中文（zh-CN）

---

## 二、技术栈

- 前端：原生 HTML / CSS / JavaScript，无框架、无构建步骤
- Supabase SDK：本地 supabase.js（纯配置，643 字节）+ CDN（unpkg.com / cdn.jsdelivr.net）降级
- 后端：Supabase（Auth + Postgres + Realtime）
- 部署：Cloudflare Pages（直接部署静态文件）
- CI/CD：Cloudflare Pages 自动构建（GitHub 触发）

---

## 三、目录结构

~/zxkf01/
├── AGENTS.md              本文件
├── _headers               安全响应头和缓存规则
├── _redirects             路由规则
├── index.html             入口页
├── chat-v2.html           访客聊天页（当前版本）
├── admin-v2.new.html      坐席后台（当前版本）
├── supabase.js            Supabase 配置（仅 URL + anon key）
├── test_chat_v2.js        测试脚本
├── images/                上传的图片
└── references/            参考文档
---

## 四、安全规则（硬性）

1. 前端只能使用 Supabase anon key。禁止禁止**把 service_role key 写入任何前端文件、GitHub、环境变量明文。
3. 所有表必须启用 RLS，包括 Realtime 用到的表。禁止禁止** USING (true) / WITH CHECK (true) 全开放策略。
5. 坐席后台（admin-v2.new.html）必须由 Cloudflare Access 保护。
6. 客服消息属于用户隐禁止禁止**在日志、错误上报、分析工具中原样输出消息内容。
7. _headers 缩进必须是 2 个空格，不能是 Tab，否则 Cloudflare 不生效。
8. **HSTS 不在 _headers 里配置，必须在 Cloudflare Dashboard 手动开启。**
9. 修改 _headers 后必须用 curl -sI 验证线上响应头生效。

---

## 五、CSP 基准配置（已在 _headers 中）

Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' https://*.supabase.co https://unpkg.com https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' https://fonts.gstatic.com; connect-src 'self' https://qafwjrfozumfzhrbtuue.supabase.co wss://qafwjrfozumfzhrbtuue.supabase.co; frame-ancestors 'none'; base-uri 'self'; form-action 'self'
规则：

- CSP **只在 _headers 里配置一处**，HTML 里不许再写 <meta http-equiv="Content-Security-Policy">。
- Supabase 地址必须精确到 qafwjrfozumfzhrbtuue.supabase.co，不用通配符 *.supabase.co。
- 如果页面用到新的外部资源（新 CDN、新 API 域名），必须同步更新 CS不许为了让代码跑起来而放宽 CSP。起来而放宽 CSP。** 应先修代码适配 CSP。

---

## 六、数据模型

- messages：聊天消息（含 conversation_id、sender_id、sender_role、content、created_at、read_at）
- typing_status：打字状态
- config：系统配置

约定：

- 时间字段统一 timestamptz
- 消息内容不加密，但日志中禁止输出
- 消息保留 30 天，定时清理

---

## 七、可访问性规则

- 内容图片必须有描述性 alt，装饰图 alt="" aria-hidden="true"
- 仅图标按钮必须有 aria-label
- 聊天窗口 role="log" + aria-live="polite"
- 每个 <input> 必须有 <label for="...">
- 页面 <html lang="zh-CN">
- 键盘可操作：Tab / Enter 发送、Esc 关闭弹窗

---

## 八、S禁止被搜索引擎收录*禁止被搜索引擎收录**
- _headers 或 HTML 里加 X-Robots-Tag: noindex, nofollow 或 <meta name="robots" content="noindex, nofollow">
- 不生成 sitemap.xml

---

## 九、工作流程（每次任务必须遵守）

1. 先读 AGENTS.md 和当前相关文件。
2. 输出：任务理解 + 修改计等用户明确回复"执行"或"A"后才能改文件。"A"后才能改文件。**
4. 一次只做一个任务，小步修改，不顺手改无关文件。
5. 改完输出 git diff 原文 + 验证结果（附不执行任何 git 命令。任何 git 命令。** 提交和推送由用户本人做。

---

## 十、输出格式

### 任务完成后必须输出

## 计划
## 修改文件列表
## git diff 原文（不许用文字描述代替）
## 验证结果（附原始命令输出）
## 未解决风险 / 待人工操作
### 验证命令

# 查看文件内容
cat _headers
cat -A _headers | head -15

# 检查 HTML 里有没有 meta CSP 残留
grep -rn "Content-Security-Policy" *.html

# 检查有没有旧地址残留
grep -rn "yqvxahnjzlsaupyfqmeo" .

# 线上响应头验证
curl -sI https://zxkf01.cc | grep -iE 'content-security|permissions-policy|x-content-type|referrer'

---

## 十一、提交规范（仅用户执行）

提交信息用英文，格式 type(scope): message：
- fix(csp): ...
- feat(chat): ...
- chore(headers): ...
- docs: ...

---

## 十二、禁止事项

1. 禁止执行 git 命令（最高优先级）
2. 禁止说"停手"后继续操作
3. 禁止跨目录操作本项目文件
4. 禁止在前端暴露 service_role key
5. 禁止放宽 CSP 来"让代码跑起来"
6. 禁止在日志中原样输出消息内容
7. 禁止跳过 RLS 直接查表
8. 禁止把 HSTS 写进 _headers
9. 禁止汇报只写"✅ 已完成"而不附原始输出
10. 禁止跨项目修改主站 member-system 的代码

---

## 十三、人工操作清单

- Cloudflare：
  - SSL/TLS = Full (strict) ✅
  - Always Use HTTPS ✅
  - HSTS：max-age=15552000, includeSubDomains, 无 preload ✅
  - Cloudflare Access 保护 /admin-v2.new.html
- Supabase：
  - Auth Site URL: https://zxkf01.cc
  - Redirect URLs: https://zxkf01.cc/**
  - RLS 策略核对
  - 消息 30 天清理定时函数
- GitHub：Secrets 配置、分支保护
