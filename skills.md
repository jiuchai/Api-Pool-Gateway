# API Pool Gateway Skills

## Base URL

```
{BASE_URL}
```

Default: `http://localhost:3002` — replace with the actual deployed domain.

---

## Overview

This is a skill package for AI agents to interact with the API Pool Gateway. The gateway provides a unified API to call multiple third-party services through a single API Key.

## Authentication

### API Key

Calling tools requires an API Key. If you don't have one, **ask the user to provide their API Key**.

Users can obtain an API Key by:
1. Registering at `{BASE_URL}/register`
2. Logging in at `{BASE_URL}/login`
3. Going to `{BASE_URL}/settings` to copy their API Key

### How to Use the API Key

Include it in every request header:

```
X-API-Key: <api-key>
```

---

## Tools

### 1. `list_tools` — Get All Available Tools

List all tools/services registered in the gateway. No authentication required.

```
GET {BASE_URL}/api/gateway/tools
```

**Response** — a concise list, each item has a `detail_url` for full usage instructions:

```json
{
  "success": true,
  "data": [
    {
      "name": "Image Compression",
      "slug": "image-compress",
      "description": "Compress and resize images",
      "category": "image",
      "endpoint": "/api/gateway/image-compress",
      "method": "POST",
      "detail_url": "/api/gateway/tools/image-compress"
    }
  ]
}
```

---

### 2. `get_tool_info` — Get Detailed Tool Information

Get full details for a specific tool (parameters, examples, etc.). No authentication required.

```
GET {BASE_URL}/api/gateway/tools/{slug}
```

**Response** — complete tool definition:

```json
{
  "success": true,
  "data": {
    "name": "Image Compression",
    "slug": "image-compress",
    "description": "Compress and resize images",
    "category": "image",
    "method": "POST",
    "endpoint": "/api/gateway/image-compress",
    "parameters": [
      { "name": "image_url", "type": "string", "required": true, "description": "URL of the image" },
      { "name": "quality", "type": "number", "required": false, "description": "Quality (1-100)" }
    ],
    "input_example": "{\"image_url\": \"https://example.com/img.jpg\", \"quality\": 80}",
    "output_example": "{\"code\": 0, \"data\": {...}}",
    "docs": ""
  }
}
```

---

### 3. `call_tool` — Execute a Tool

Call a registered service. **Requires API Key.**

```
POST {BASE_URL}/api/gateway/{slug}
Content-Type: application/json
X-API-Key: <api-key>

{...params per tool schema...}
```

For file uploads, use `multipart/form-data`:

```
POST {BASE_URL}/api/gateway/{slug}
X-API-Key: <api-key>

(form fields + file)
```

**Response:**

```json
{
  "success": true,
  "statusCode": 200,
  "data": { ... },
  "meta": { "service": "...", "upstreamStatus": 200 }
}
```

---

## Workflow

```
1. list_tools         →  Discover what's available
2. get_tool_info      →  Get a specific tool's full schema (parameters, examples)
3. call_tool          →  Execute with API Key + parameters
```

---

## Error Codes

| Code | Meaning |
|------|---------|
| 401 | Missing or invalid API Key |
| 404 | Tool not found or disabled |
| 400 | Invalid parameters |
| 429 | Rate limit exceeded |
| 502 | Upstream service error |
| 504 | Upstream service timeout |

---

## Rate Limits

| Tier | Requests/sec | Requests/day |
|------|-------------|-------------|
| Free | 5 | 100 |
| Basic | 20 | 5,000 |
| Pro | 50 | 20,000 |
| Enterprise | 100 | Unlimited |
