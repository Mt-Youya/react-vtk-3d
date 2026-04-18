# 调试 VTK 场景

帮助调试 VTK.js 场景问题，包括渲染异常、交互失效、模型加载失败等。

## 使用方式

```
/debug-vtk <问题描述>
```

**示例**:
- `/debug-vtk 框选后模型没有高亮`
- `/debug-vtk 删除操作后模型消失`
- `/debug-vtk 相机位置不对`

---

## 执行步骤

用户描述的问题：**$ARGUMENTS**

### 第一步：理解 VTK 场景结构

读取以下文件建立上下文：

1. `src/core/index.ts` — 主引擎，找到与问题相关的方法
2. `src/core/toothModel.ts` — 模型类，了解 actor/mapper/filter 链
3. `src/core/context.ts` — 全局 VTK 对象（renderer、renderWindow、interactor）

**VTK 渲染管线**：
```
Reader（读取文件）
  → VertexSculptureFilter（顶点编辑）
  → HighlightSelectionPointsFilter（高亮选择）
  → Mapper（映射到 GPU）
  → Actor（场景中的可见对象）
  → Renderer（渲染器）
  → RenderWindow（窗口）
```

### 第二步：根据问题类型定位

**渲染不更新**：
- 检查方法末尾是否调用了 `renderWindow.render()`
- 检查 `context.ts` 中的 `getRenderWindow()` 是否返回正确实例

**选择/高亮失效**：
- 检查 `src/core/highlightSelectionPoints.ts` 的过滤器逻辑
- 检查 `handleSelection()` 和 `handlePolygonSelection()` 的事件绑定
- 检查 `selectionMode` 状态是否正确切换

**删除操作异常**：
- 检查 `src/core/vertexSculpture.ts` 的点数组重建逻辑
- 检查 `handleDelete()` 中传入的点 ID 列表是否正确
- 检查单元格索引重映射是否遗漏

**模型加载失败**：
- 检查 `triggerInitScene(buffers)` 中 ArrayBuffer 是否有效
- 检查 Reader 类型（STL vs VTP）与文件格式是否匹配
- 检查 `toothModel.ts` 中 `parseAsArrayBuffer()` 调用

**相机问题**：
- 检查 `switchView()` 中的相机参数
- 检查 Web Worker 返回的 `CameraInfo` 格式：`[focalPoint, viewUp, position]`

### 第三步：添加调试日志

如果需要，在关键位置临时添加 `console.log`：

```typescript
// 检查 VTK 对象是否存在
console.log('renderer:', getRenderer())
console.log('models:', models.map(m => ({ name: m.name, points: m.sourceReader?.getOutputData()?.getNumberOfPoints() })))

// 检查选择状态
console.log('selectionMode:', selectionMode)
console.log('boundary:', boundary)
```

### 第四步：提供解决方案

基于分析结果，提供：
1. 问题根因
2. 具体修复代码
3. 如何验证修复

---

## 常见问题速查

| 现象 | 可能原因 | 检查位置 |
|------|---------|---------|
| 模型不显示 | Actor 未添加到 Renderer | `toothModel.ts` 的 `actor` 初始化 |
| 选择无响应 | 事件监听未绑定 | `handleSelection()` 中的 interactor 配置 |
| 删除后崩溃 | 点 ID 越界 | `vertexSculpture.ts` 的索引重映射 |
| 颜色异常 | LUT 未更新 | `mapper.setLookupTable()` 调用 |
| 相机跳动 | focalPoint 计算错误 | `switchFrontView.ts` Worker |
| 内存泄漏 | 场景未销毁 | `destroyScene()` 调用时机 |
