# 添加 API 接口

在 `src/apis/` 目录中添加新的 API 接口函数，自动使用项目封装的 axios 实例和类型系统。

## 使用方式

```
/add-api <接口名> [HTTP方法] [路径] [描述]
```

**示例**:
- `/add-api getToothMeasure GET /api/tooth/measure 获取牙齿测量数据`
- `/add-api saveArchWidth POST /api/arch/width`

---

## 执行步骤

用户输入：**$ARGUMENTS**

### 第一步：了解现有结构

读取以下文件：
1. `src/apis/common.ts` — 了解现有接口写法和规范
2. `src/utils/request.ts` — 了解 axios 实例配置
3. `src/types/index.ts` — 了解现有类型，避免重复定义

### 第二步：确定放置位置

- 如果接口与现有文件主题相关（如 bezier、ct-values），添加到对应文件
- 如果是通用业务接口，添加到 `src/apis/common.ts`
- 如果是全新模块，在 `src/apis/` 创建新文件

### 第三步：实现接口

参考现有写法：

```typescript
import request from "@/utils/request"

// 定义请求/响应类型（如果 types/index.ts 中没有）
interface XxxParams {
  id: string
  // ...
}

interface XxxResponse {
  // ...
}

export function apiName(params: XxxParams) {
  return request.get<XxxResponse>("/api/path", { params })
}
```

注意：
- 使用 `request.get` / `request.post` / `request.put` / `request.delete`
- 类型参数 `<T>` 是响应 `data` 字段的类型
- 复杂类型定义放到 `src/types/index.ts`，简单的可以内联

### 第四步：导出

如果创建了新文件，在 `src/apis/index.ts`（如果存在）或直接在使用处导入。

---

## 关键文件

| 文件 | 说明 |
|------|------|
| `src/utils/request.ts` | axios 实例（baseURL = VITE_API_URL，timeout = 200s） |
| `src/apis/common.ts` | 主要业务接口参考 |
| `src/types/index.ts` | 共享类型定义 |
