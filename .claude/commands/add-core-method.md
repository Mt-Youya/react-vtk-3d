# 添加核心 VTK 方法

在 VTK 引擎中添加一个新的核心方法，并自动完成类型声明、store 集成的全流程。

## 使用方式

```
/add-core-method <方法名> [描述]
```

**示例**:
- `/add-core-method highlightTooth 高亮指定牙齿`
- `/add-core-method exportModel`

---

## 执行步骤

用户输入的方法名为：**$ARGUMENTS**

### 第一步：读取现有代码

1. 读取 `src/core/index.ts`，找到 `CoreMethods` 返回对象的位置（搜索 `return {`）
2. 读取 `src/types/index.ts`，找到 `CoreMethods` 接口定义

### 第二步：分析并实现

根据方法名和描述，在 `src/core/index.ts` 中：

1. 在合适位置添加方法实现函数
2. 在 `return {}` 对象中注册该方法

实现时注意：
- 使用 `context.ts` 中的 `getRenderer()` 等获取 VTK 对象，不要用 `window.*`
- 操作完成后调用 `renderWindow.render()` 刷新视图
- 如果需要操作模型，通过 `models` 数组访问 `ToothModel` 实例

### 第三步：更新类型声明

在 `src/types/index.ts` 的 `CoreMethods` 接口中添加对应的方法签名：

```typescript
// 示例格式
methodName(param?: type): void | ReturnType
```

### 第四步：验证

运行 `pnpm build:dev` 确认 TypeScript 编译无错误。

---

## 关键文件位置

| 文件 | 说明 |
|------|------|
| `src/core/index.ts` | 方法实现（在 return 对象中注册） |
| `src/types/index.ts` | `CoreMethods` 接口类型声明 |
| `src/core/context.ts` | 获取 VTK 全局对象（renderer、renderWindow 等） |
| `src/core/toothModel.ts` | `ToothModel` 类，通过 `models[0/1]` 访问上下颌 |
| `src/stores/modules/core-state.ts` | 通过 `useCoreStore().coreMethods.方法名()` 调用 |
