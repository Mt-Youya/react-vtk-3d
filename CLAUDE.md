## 语言要求
所有回答必须使用简体中文。无论上下文多长，始终用中文回复。

## 项目概览
牙科 3D 编辑系统，基于 React 19 + VTK.js v35 + TypeScript + Vite 8。
包管理器：pnpm。Node 要求 >=24。

## 技术栈
- **UI**：React 19、Tailwind CSS v4、shadcn/ui、lucide-react
- **状态管理**：Zustand 5
- **3D 渲染**：@kitware/vtk.js v35（FullScreenRenderWindow、CellPicker、WidgetManager 等）
- **路由**：react-router-dom v7
- **动画**：GSAP 3 + @gsap/react
- **HTTP**：axios + ali-oss

## 目录结构
```
src/
├── core/           # VTK 核心引擎（index.ts 为主入口，按 [SCENE][SELECTION][CAMERA][FILE][VISUAL] 分区）
│   ├── context.ts          # 模块级全局状态（renderer、selectorDataSource、hlCells、apiSpecificRenderWindow）
│   ├── toothModel.ts       # 牙齿模型类
│   ├── geometry.ts         # 几何计算
│   ├── archWidth.ts        # 牙弓宽度测量
│   ├── archBezierLine.ts   # 贝塞尔牙弓线
│   ├── highlightSelectionPoints.ts  # 顶点高亮选择
│   └── vertexSculpture.ts  # 顶点雕刻滤镜
├── math/
│   └── bezier/     # 贝塞尔曲线数学库（从 apis/bezier.ts 迁移而来）
├── utils/
│   ├── logger.ts       # 统一日志（生产环境静默）
│   ├── device.ts       # DPR / 容器高度计算
│   ├── eventManager.ts # 事件监听器生命周期管理（防内存泄漏）
│   ├── request.ts      # axios 封装
│   └── is.ts           # 类型判断工具
├── types/
│   ├── index.ts        # 核心类型（CoreMethods、ToothOrderPoint 等）
│   └── vtk-shims.d.ts  # VTK.js 缺失模块声明垫片
├── stores/         # Zustand store
├── layout/         # Header、InfoSide 等布局组件
├── pages/          # 页面（home 为主页面）
├── apis/           # API 接口（bezier.ts 为重导出垫片）
├── services/       # 服务层（switchFrontViewWorker 等）
└── workers/        # Web Worker
```

## 架构要点
- **消除 window 全局污染**：所有 VTK 对象（renderer、selectorDataSource 等）通过 `src/core/context.ts` 的模块级 store 管理，禁止直接挂载到 `window`
- **日志规范**：禁止直接使用 `console.log`，一律用 `logger.debug()`（生产环境自动静默）
- **事件监听器**：使用 `EventManager` 管理，在组件/类销毁时调用 `dispose()` 防止内存泄漏
- **DPR 计算**：统一用 `DeviceUtils.getDPR()` / `DeviceUtils.getContainerHeight()`，禁止直接读 `window.devicePixelRatio`
- **VTK 类型**：VTK.js 部分模块无 `.d.ts`，已在 `vtk-shims.d.ts` 统一声明；VTK 对象用 `VTKObject = Record<string, any>` 类型别名

## 常用命令
```bash
pnpm dev          # 启动开发服务器
pnpm build:dev    # 开发环境构建
pnpm build:qa     # QA 环境构建
npx tsc --noEmit  # 类型检查（注意：需 Node >=24，低版本不兼容 Vite 8）
```

## 已知预存类型错误（勿修改）
以下文件存在 VTK.js 类型定义不准确导致的 TS 错误，属预存问题，重构时无需处理：
- `src/core/splineWidget.ts`：`useCameraNormal` 属性名
- `src/core/toothModel.ts`：`viewSpecificProperties` 属性
- `src/core/vertexSculpture.ts`：spread 参数和 null 检查
