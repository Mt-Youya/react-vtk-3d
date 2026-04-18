# 构建检查

运行完整的构建检查，确认项目无 TypeScript 错误、无构建警告，并报告 bundle 大小。

## 使用方式

```
/build-check
```

---

## 执行步骤

### 第一步：TypeScript 类型检查

```bash
pnpm tsc --noEmit
```

列出所有类型错误（如果有），按文件分组展示。

### 第二步：开发构建

```bash
pnpm build:dev 2>&1
```

关注：
- 是否有构建错误（`error` 关键词）
- 是否有超过 `chunkSizeWarningLimit`（1500 kB）的 chunk
- 构建时间是否异常

### 第三步：分析构建产物

检查 `dist/assets/js/` 目录，列出各 chunk 的大小，与上次构建对比是否有异常增大。

重点关注：
- `vtk-*.js` — 应在 1.4 MB 左右（VTK.js 本身较大）
- `base-ui-*.js` — 应在 130 kB 左右
- `react-*.js` — 应在 50 kB 左右
- 其他业务 chunk — 如果超过 500 kB 需要排查

### 第四步：报告

输出格式：

```
构建结果：✓ 成功 / ✗ 失败

TypeScript：✓ 无错误 / ✗ N 个错误
  - file.tsx:line — 错误描述

Bundle 大小：
  vtk:      1,447 kB (gzip: 391 kB)
  base-ui:    130 kB (gzip:  44 kB)
  react:       50 kB (gzip:  18 kB)
  ...

⚠ 警告（如有）：
  - chunk xxx 超过警告限制
```

---

## 说明

- 项目使用 `babel-plugin-react-compiler`，构建时会自动插入记忆化优化
- VTK.js chunk 较大（~1.4 MB）是正常的，该库本身体积大
- 构建模式 `devlopment`（注意原始拼写有误）使用 `--mode devlopment` 参数
