# API Pool Gateway 改进建议与路线图

> 基于项目代码审查整理，按优先级分级，供后续迭代参考。

---

## 一、项目介绍

### 中文

**API Pool Gateway 是一个动态 API 聚合网关平台，让多种第三方 API 服务通过统一的入口和单一的 API Key 被安全调用，无需关心底层服务地址，并支持运行时热插拔。**

#### 核心特性

- **运行时动态注册** — 无需重启服务器即可添加、更新或下线 API 服务
- **统一 API Key** — 一个密钥调用所有已注册服务，简化接入流程
- **智能限流与配额** — 按套餐等级配置每秒/每日请求上限，保障服务稳定
- **内置计费体系** — 免费版、基础版、专业版、企业版多级套餐管理
- **兑换码充值** — 生成与兑换额度充值码，灵活扩展使用配额
- **全链路审计日志** — 完整记录管理员操作与每次 API 调用
- **可视化管理与调试** — 管理面板 + 在线 API Playground，降低运维与测试成本
- **AI Agent 友好** — 提供服务发现与调用接口，便于智能体程序化集成

#### 适用场景

- 需要把多个内部或第三方 API 整合为统一入口的 SaaS 团队
- 希望对外提供 API 市场或能力商店的技术平台
- 需要按配额计费、限流和审计的企业级 API 分发场景
- 希望让 AI Agent 安全调用外部工具的 A2A / Agentic 系统

#### 价值主张

API Pool Gateway 将分散的 API 能力聚合为可控、可计量、可运营的服务入口，让团队以更少的集成成本对外交付标准化 API 能力，同时保持对访问、计费与安全的集中管控。

---

### English

**API Pool Gateway is a dynamic API aggregation platform that unifies multiple third-party or internal API services behind a single entry point and one API Key—no need to manage underlying endpoints, with support for hot-swapping services at runtime.**

#### Key Features

- **Runtime Service Registration** — Add, update, or remove API services without restarting the server
- **Unified API Key** — One key to access all registered services, simplifying client integration
- **Smart Rate Limiting & Quotas** — Per-tier request limits by second and day for stable, predictable usage
- **Built-in Billing System** — Free, Basic, Pro, and Enterprise tier management out of the box
- **Redeem Codes** — Generate and redeem quota top-up codes for flexible capacity expansion
- **Full Audit Logging** — Complete trail of admin operations and every API call
- **Web Admin & API Playground** — Manage services, users, billing, and test endpoints from a visual UI
- **AI Agent Ready** — Tool discovery and invocation endpoints designed for programmatic agent integration

#### Typical Use Cases

- SaaS teams consolidating multiple internal or third-party APIs into one gateway
- Platforms building and operating an API marketplace or capability store
- Enterprise API distribution requiring metering, throttling, and audit compliance
- Agentic / A2A systems that need AI agents to securely call external tools

#### Value Proposition

API Pool Gateway turns fragmented API capabilities into a governed, metered, and operable service layer—helping teams deliver standardized API products with lower integration overhead while maintaining centralized control over access, billing, and security.

---

## 二、Critical（必须立即处理）

| # | 问题 | 建议 | 原因 |
|---|------|------|------|
| 1 | 默认 JWT_SECRET / 管理员密码硬编码回退 | 启动时校验必填环境变量，缺失则拒绝启动；JWT 签名显式指定 `algorithms: ['HS256']` | 默认密钥可被用于伪造 JWT，直接绕过认证 |
| 2 | 登录/注册无专项限流 | 对 `/api/auth/*` 按 IP + 用户名限流，失败多次锁定账户 | 可被暴力破解密码和验证码 |
| 3 | 网关存在 SSRF 风险 | 对 `targetUrl` 做协议白名单、内网/元数据 IP 黑名单、可选域名白名单 | 管理员可配置任意上游地址，代理访问内网或云服务元数据接口 |
| 4 | API Key 明文存储 | 数据库存 SHA-256 哈希，创建时仅展示一次；支持 Key 级别权限范围 | 数据库泄露即全部 Key 泄露 |
| 5 | NeDB 无法支撑生产 | 迁移到 MongoDB 或 PostgreSQL；至少明确单实例限制 | 文件锁、无连接池、无法水平扩展 |

---

## 三、High（强烈建议）

| # | 问题 | 建议 |
|---|------|------|
| 6 | 公告弹窗 XSS | 后端保存或前端渲染前用 DOMPurify 净化 Markdown/HTML |
| 7 | 文件上传缺少校验 | 按服务参数限制文件类型/MIME，及时清理 multer 临时文件 |
| 8 | 自定义脚本沙箱风险 | 限制内存/CPU、更严格隔离；或提供禁用开关 |
| 9 | 匿名限流未按 IP 拆分 | 按 IP 拆分匿名用户计数器 |
| 10 | 缺少健康检查与指标 | 增加 `/health`、`/metrics`、Prometheus 接入 |
| 11 | 无优雅关闭 | 监听 `SIGTERM/SIGINT`，关闭 HTTP server 后再退出 |
| 12 | 缺少上游健康探测 | 定时探测后端服务可用性，自动摘除故障节点 |
| 13 | 缺少缓存层 | 引入 Redis，按服务配置 TTL 缓存读多写少的响应 |
| 14 | 服务配置缺少 Schema 校验 | 使用 Joi/Zod 校验创建/导入的服务 JSON |
| 15 | 日志未结构化 | 输出 JSON 格式日志，增加 traceId、日志级别 |

---

## 四、Medium（后续优化）

| # | 问题 | 建议 |
|---|------|------|
| 16 | 计费未闭环 | 对接 Stripe/支付宝/微信支付；账单状态机（unpaid/paid/overdue/refunded） |
| 17 | 兑换码 `amount` 类型未实现 | 补充按额度充值的逻辑 |
| 18 | 错误处理吞异常 | 避免大量 `catch {}`，统一错误对象并记录堆栈 |
| 19 | 审计日志缺少 IP/UA | 记录操作者 IP、User-Agent、traceId |
| 20 | 缺少 OpenAPI/Swagger 导出 | 根据服务定义自动生成 OpenAPI 3.0 文档 |
| 21 | 缺少 Webhook / 异步任务 | 长耗时服务改为异步，提供 jobId + webhook 回调 + 状态轮询 |
| 22 | 缺少实时用量告警 | 用量达到阈值时邮件/站内信通知管理员与用户 |
| 23 | 重复代码 | 合并状态码过滤、趋势统计等重复逻辑 |

---

## 五、Low（体验与细节）

| # | 问题 | 建议 |
|---|------|------|
| 24 | Settings 页 API Key 明文展示 | 默认隐藏，点击显示；提供只读视图 |
| 25 | Test 页无参数自动填充 | 选择服务后自动填充 `inputExample` |
| 26 | Docs 页无搜索 | 增加服务名称/描述/参数搜索框 |
| 27 | 日志 JSON 无高亮 | 增加 syntax highlight 与折叠 |
| 28 | 移动端表格体验差 | 长表格增加横向滚动或卡片式布局 |
| 29 | 导入服务预览无详情展开 | 预览列表可展开查看参数与目标 URL |
| 30 | 静态资源缓存策略 | 配置 `Cache-Control` 与 CDN |

---

## 六、建议执行顺序

1. **安全第一**：移除默认密钥 → 登录限流 → SSRF 防护
2. **数据安全**：API Key 哈希化 → 公告 XSS 加固 → 文件上传校验
3. **生产化**：数据库迁移评估 → `/health` + `/metrics` → 优雅关闭
4. **能力建设**：Redis 缓存 → 上游健康探测 → 计费支付闭环
5. **体验打磨**：OpenAPI 导出 → 异步任务 → 前端细节优化

---

## 七、结论

API Pool Gateway 已具备一个 API 聚合网关的核心骨架，但在**安全、生产可扩展性、代码健壮性**三方面存在明显短板。建议先完成 Critical 与 High 项，再逐步补充高级功能。
