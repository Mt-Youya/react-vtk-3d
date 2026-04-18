# react-vtk-3d

基于 React 19 + VTK.js 的牙科 3D 模型交互式编辑与分析系统。支持上下颌模型实时可视化、顶点编辑删减、牙弓宽度测量、Bolton 指数分析等功能。

## 技术栈

| 分类 | 技术 |
|------|------|
| 框架 | React 19 + TypeScript 6 |
| 构建 | Vite 8 + babel-plugin-react-compiler |
| 3D 引擎 | @kitware/vtk.js 35 |
| 路由 | React Router 7 |
| 状态管理 | Zustand 5 |
| UI 组件 | @base-ui/react 1.0 |
| 样式 | Tailwind CSS 4 + GSAP 3 |
| 图标 | lucide-react |
| HTTP | Axios + ali-oss |

## 项目结构

```
src/
├── apis/               # API 接口层（模型获取、保存、测量）
├── components/         # 通用 UI 组件（Loader、Card、Tasks、Tips）
├── constants/          # 键盘快捷键、操作类型常量
├── core/               # VTK 引擎核心（场景、选择、顶点编辑、测量）
│   ├── index.ts        # 主引擎：场景初始化、交互、相机控制
│   ├── toothModel.ts   # 牙齿模型类（读取器、映射器、过滤器）
│   ├── vertexSculpture.ts      # 顶点编辑过滤器（删减点）
│   ├── highlightSelectionPoints.ts  # 选择高亮过滤器
│   ├── geometry.ts     # 几何算法（射线法点在多边形内测试）
│   ├── archWidth.ts    # 牙弓宽度计算
│   └── context.ts      # 模块级上下文（替代 window.* 全局变量）
├── hooks/              # 自定义 React Hooks
├── layout/
│   ├── Header/         # 工具栏（选择工具、快捷键绑定）
│   └── InfoSide/       # 右侧数据面板（宽度、Bolton 指数、拥挤度）
├── pages/
│   └── home/           # 主场景页面（模型加载、场景初始化）
├── services/           # Web Worker 服务（正面视图计算）
├── stores/             # Zustand 状态（核心方法、模型信息、面板数据）
├── types/              # TypeScript 类型定义
├── ui/                 # shadcn/base-ui 风格组件库
└── workers/            # Web Worker 线程
```

## 快速开始

### 环境要求

- Node.js >= 18
- pnpm >= 9

### 安装依赖

```bash
pnpm install
```

### 配置环境变量

复制并修改开发环境配置：

```bash
cp .env.development .env.local
```

```env
VITE_MODE="development"
VITE_API_URL="http://localhost:9009"
```

### 启动开发服务器

```bash
pnpm dev
```

访问 `http://localhost:8080`，页面会自动打开。

## 构建

```bash
# 开发环境构建
pnpm build:dev

# QA 环境构建
pnpm build:qa

# 构建后预览
pnpm preview:dev
pnpm preview:qa
```

构建产物输出到 `dist/`，按类型分目录：

```
dist/
└── assets/
    ├── js/       # JavaScript chunks（react、base-ui、vtk、gsap 等独立分包）
    ├── css/      # 样式文件
    ├── model/    # 3D 模型资源
    └── images/   # 图片资源
```

## 核心功能

### 3D 模型操作

| 功能 | 快捷键 | 说明 |
|------|--------|------|
| 移动视图 | — | 拖拽旋转、缩放场景 |
| 框选 | `S` | 矩形框选牙齿顶点 |
| 点选 | `P` | 多边形自由圈选顶点 |
| 完成多边形 | `Space` | 封闭多边形并选中 |
| 删除选中 | `Delete` | 删减选中的顶点区域 |
| 重置视图 | `R` | 重置相机到初始位置 |
| 取消选择 | `Esc` | 退出选择模式 |

### 数据分析（右侧面板）

- **牙弓宽度**：上下颌尖牙段 / 前磨牙段 / 磨牙段
- **牙齿宽度**：每颗牙齿的个别宽度（毫米）
- **牙弓周长**：上下颌总弓长
- **Bolton 指数**：前牙比 / 全牙比及下颌偏大量
- **拥挤度**：上下颌拥挤评估
- **前牙覆合覆盖**：覆合 / 覆盖描述

### 支持的模型格式

| 格式 | 用途 |
|------|------|
| STL | 初始上传的原始模型 |
| VTP | 保存修改后的模型（保留标量数据） |

## 架构说明

### VTK 引擎（`src/core/index.ts`）

所有 3D 交互逻辑的入口，通过 `triggerInitScene()` 初始化场景后返回 `CoreMethods` 对象，存入 Zustand store 供全局调用。

```
场景初始化流程：
URL 参数 planId → getAllToothInfo() → 下载模型文件 (ArrayBuffer)
  → triggerInitScene(buffers) → 初始化 VTK 场景树
  → 返回 CoreMethods → 存入 useCoreStore
```

### 顶点编辑流程

```
用户框选/多边形选择
  → highlightSelectionPointsFilter（高亮预览）
  → Delete 键 → vertexSculpture（重建点数组，跳过被删除点）
  → 重新映射单元格索引 → 重新渲染
```

### 全局状态

```typescript
useCoreStore         // coreMethods: CoreMethods | null
useModelsInfoStore   // modelsInfo: ModelInfo[]（上下颌文件名、删减状态）
useTaskStatusStore   // status: 0 | 1 | 2（空闲 | 进行中 | 完成）
useInfoSideDataStore // infoSideData: InfoSideData | null（分析结果）
```

### Web Worker

`switchFrontViewWorker` 在后台线程计算正面视图相机参数（OBB 树 + 质心算法），避免阻塞主线程渲染。

## 开发指南

### 添加新的核心操作

在 `src/core/index.ts` 的 `CoreMethods` 返回对象中添加新方法，并在 `src/types/index.ts` 的 `CoreMethods` 接口中补充类型声明。

### 添加新 API

在 `src/apis/` 目录创建新文件，使用 `src/utils/request.ts` 中封装的 axios 实例。

### 添加新 UI 组件

在 `src/ui/` 目录添加基于 `@base-ui/react` 的组件，参考现有的 `accordion.tsx`、`button.tsx` 等文件的写法。

### 环境变量类型安全

在 `src/env.d.ts` 中声明新的环境变量类型，确保 `import.meta.env.*` 有完整的 TypeScript 提示。

## React Compiler

项目使用 `babel-plugin-react-compiler` 自动处理组件记忆化，**不需要手动编写** `memo()`、`useMemo`、`useCallback`。React Compiler 在编译时静态分析并自动插入必要的优化。

## 代理配置

开发服务器代理 `/api` 请求到后端：

```
/api/* → http://localhost:9009/*
```

修改代理目标请编辑 `vite.config.ts` 的 `server.proxy` 配置，或在 `.env.development` 中修改 `VITE_API_URL`。
