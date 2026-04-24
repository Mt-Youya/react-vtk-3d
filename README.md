# oral — 牙科 3D 可视化平台

基于 **React + Three.js（R3F）** 的牙科 3D 模型可视化与分析工具，配套 **FastAPI + MeshSegNet** 后端服务，支持 STL 牙齿网格的 AI 自动分割与彩色渲染。

> **当前分支：`feat/three-js-refactor`**
> 将原有 `@kitware/vtk.js` 命令式架构全量重构为 React Three Fiber 声明式架构，并新增 AI 牙齿分割服务。

---

## 功能特性

- **AI 牙齿分割**：上传 STL 自动识别每颗牙齿并着色（MeshSegNet，15 类）
- **3D 模型渲染**：加载上下颌 VTP / STL / GLB 模型，支持光照切换、视角旋转
- **选择工具**：矩形框选、多边形圈选三角面，支持顶点删除
- **宽度标注**：牙弓宽度测量线可视化
- **样条曲线**：牙弓曲线控制点编辑
- **牙齿编号**：FDI 标准牙位编号标注

---

## 技术栈

| 层 | 技术 |
|---|---|
| 前端框架 | React 19 + TypeScript + Vite |
| 3D 渲染 | Three.js + @react-three/fiber + @react-three/drei |
| 状态管理 | Zustand 5 |
| 样式 | Tailwind CSS v4 + GSAP |
| 后端 | FastAPI + Uvicorn（Python） |
| AI 分割 | PyTorch + MeshSegNet |
| 网格处理 | trimesh + PyVista |

---

## 项目结构

```
react-vtk-3d/
├── src/
│   ├── components/
│   │   └── ToothViewer/          # 3D 场景主组件（R3F）
│   │       ├── index.tsx         # Canvas + Overlay 入口
│   │       ├── ToothMesh.tsx     # 牙齿网格（自动识别 VTP/GLB 格式）
│   │       ├── HighlightPoints.tsx
│   │       ├── SplineWidgets.tsx
│   │       ├── WidthLabels.tsx
│   │       └── useSceneActions.ts
│   ├── lib/
│   │   ├── VTKLoader.ts          # VTP 解析器（含 LABEL_LUT 26色方案）
│   │   └── parseVTP.ts           # 原始 VTP 解析
│   ├── stores/
│   │   └── modules/
│   │       └── tooth-scene.ts    # 牙齿场景 Zustand Store
│   └── pages/home/index.tsx      # 主页面（自动调用分割接口）
│
└── server/
    ├── main.py                   # FastAPI 服务入口（端口 9009）
    ├── requirements.txt
    ├── tooth_segmentation/
    │   ├── meshsegnet.py         # MeshSegNet PyTorch 模型（官方实现）
    │   ├── inference.py          # STL → 面标签推理（分块全覆盖）
    │   ├── color_map.py          # FDI 标签 → RGB（与前端 LABEL_LUT 一致）
    │   ├── export_glb.py         # 面标签 + 网格 → GLB
    │   └── weights/
    │       ├── meshsegnet_man.pth  # 下颌预训练权重（Mandible）
    │       └── meshsegnet_max.pth  # 上颌预训练权重（Maxilla）
    └── util.py
```

---

## 快速开始

### 环境要求

- Node.js >= 18，pnpm >= 9
- Python >= 3.10

### 1. 前端

```bash
pnpm install
pnpm dev
# 访问 http://localhost:8080
```

### 2. 后端

```bash
cd server
pip install -r requirements.txt
python main.py
# 服务运行在 http://localhost:9009
```

### 3. 权重文件

从 [MeshSegNet/models](https://github.com/Tai-Hsien/MeshSegNet/tree/master/models) 下载两个 zip 文件，**直接重命名**（PyTorch zip 格式，无需解压）放入 `server/tooth_segmentation/weights/`：

```
MeshSegNet_Man_15_classes_72samples_lr1e-2_best.zip  →  meshsegnet_man.pth
MeshSegNet_Max_15_classes_72samples_lr1e-2_best.zip  →  meshsegnet_max.pth
```

---

## API

### `POST /api/segment-teeth`

上传 STL 文件，返回带每颗牙齿独立颜色的 GLB 文件。

| 参数 | 类型 | 说明 |
|---|---|---|
| `file` | multipart | STL 文件（二进制或 ASCII） |
| `jaw` | string | `lower`（下颌，默认）或 `upper`（上颌） |

```bash
# 下颌分割
curl -X POST http://localhost:9009/api/segment-teeth \
  -F "file=@down.stl" -F "jaw=lower" \
  --output segmented.glb

# 上颌分割
curl -X POST http://localhost:9009/api/segment-teeth \
  -F "file=@up.stl" -F "jaw=upper" \
  --output segmented.glb
```

**响应**：`model/gltf-binary`，15 种颜色（0=牙龈，1-14=各牙位）  
**耗时**：CPU 约 60 秒/颌，GPU 约 10 秒/颌

---

## 颜色方案（LABEL_LUT）

前后端共用同一套 26 色方案，前 15 色用于 MeshSegNet 输出：

| 标签 | 颜色 | 含义 |
|---|---|---|
| 0 | `rgb(90, 65, 60)` | 牙龈 |
| 1 | `rgb(255, 60, 60)` | 牙位 1 |
| 2 | `rgb(60, 180, 255)` | 牙位 2 |
| 3–14 | 各不相同 | 牙位 3–14 |

前端定义：`src/lib/VTKLoader.ts` → `LABEL_LUT`  
后端定义：`server/tooth_segmentation/color_map.py` → `LABEL_LUT`

---

## 构建

```bash
pnpm build:dev    # 开发环境
pnpm build:qa     # QA 环境
pnpm preview:dev  # 本地预览
```

---

## 代理配置

开发服务器代理 `/api` 请求到后端（`vite.config.ts`）：

```
/api/* → http://localhost:9009/*
```

---

## MeshSegNet 推理说明

- **模型**：MeshSegNet（MICCAI 2019 / IEEE TMI 2020），图神经网络
- **输入特征**：每个三角面 15 维（顶点坐标×9 + 质心×3 + 法线×3，全部归一化）
- **邻接矩阵**：基于归一化质心距离（A_S: <0.1，A_L: <0.2）
- **推理策略**：28 万面分成约 47 个 6000 面的块，全部覆盖直接预测（无插值）
- **类别**：15 类（0=牙龈，1-14=各牙位）

参考论文：[IEEE TMI 2020](https://ieeexplore.ieee.org/abstract/document/8984309)
