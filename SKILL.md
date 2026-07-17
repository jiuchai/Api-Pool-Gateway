# API Pool Gateway Skill

## Skill Info

```yaml
name: api-pool-gateway
description: >
  调用 API Pool Gateway 注册的各种第三方 API 服务。
  支持文字转语音、文档转换、图片处理等多种工具。
  使用前需先获取 API Key。
version: 1.0.0
```

## Base URL

```
{BASE_URL}
```

---

## Authentication

### 获取 API Key

1. 注册账号: `{BASE_URL}/register`
2. 登录: `{BASE_URL}/login`
3. 在 `{BASE_URL}/settings` 复制 API Key

### 使用 API Key

每次请求携带 Header:
```
X-API-Key: <api-key>
```

> 默认 Key: `{API_KEY}`

---

## Tools

### list_tools — 获取工具列表

列出所有可用服务。无需认证。

```
GET {BASE_URL}/api/gateway/tools
```

**Output:**
```json
{
  "success": true,
  "data": [
    {
      "name": "Edge TTS",
      "slug": "edgetts-tts",
      "description": "文字转语音服务",
      "category": "ai",
      "endpoint": "/api/gateway/edgetts-tts",
      "method": "POST",
      "detail_url": "/api/gateway/tools/edgetts-tts"
    }
  ]
}
```

---

### get_tool_info — 获取工具详情

获取指定工具的完整参数定义和示例。无需认证。

```
GET {BASE_URL}/api/gateway/tools/{slug}
```

**Output:**
```json
{
  "success": true,
  "data": {
    "name": "Edge TTS",
    "slug": "edgetts-tts",
    "description": "文字转语音",
    "category": "ai",
    "method": "POST",
    "endpoint": "/api/gateway/edgetts-tts",
    "parameters": [
      { "name": "text", "type": "string", "required": true, "description": "要转换的文字" }
    ],
    "input_example": "{...}",
    "output_example": "{...}"
  }
}
```

---

### call_tool — 调用工具

调用注册的服务。**需认证。**

#### JSON 请求
```
POST {BASE_URL}/api/gateway/{slug}
Content-Type: application/json
X-API-Key: <api-key>

{...params per tool schema...}
```

#### 文件上传
```
POST {BASE_URL}/api/gateway/{slug}
X-API-Key: <api-key>
Content-Type: multipart/form-data

(form fields + file)
```

#### 返回格式

**文本/JSON 响应:**
```json
{
  "success": true,
  "statusCode": 200,
  "data": { ...upstream response... },
  "meta": { "service": "...", "upstreamStatus": 200 }
}
```

**文件响应 (PDF/图片/音频等):**
```json
{
  "success": true,
  "statusCode": 200,
  "data": {
    "type": "file",
    "url": "/api/downloads/abc-123.mp3",
    "contentType": "audio/mpeg",
    "size": 12345
  },
  "meta": { "service": "...", "upstreamStatus": 200 }
}
```
> 文件类响应需用 `GET {BASE_URL}{data.url}` 下载。

---

## Workflow

```
1. list_tools      → 发现有啥工具
2. get_tool_info   → 获取工具参数和示例
3. call_tool       → 用 API Key + 参数调用
```

---

## Error Codes

| Code | Meaning |
|------|---------|
| 401  | 缺少或无效 API Key |
| 404  | 工具不存在或已禁用 |
| 400  | 参数无效 |
| 429  | 触发速率限制 |
| 502  | 上游服务错误 |
| 504  | 上游服务超时 |

---

## Rate Limits

| Tier       | 请求/秒 | 请求/天  |
|------------|---------|----------|
| Free       | 5       | 100      |
| Basic      | 20      | 5,000    |
| Pro        | 50      | 20,000   |
| Enterprise | 100     | 不限     |
