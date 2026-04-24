---
name: tooth-segmentation-server
description: 启动牙齿分割 FastAPI 服务（端口 9009）
---

启动牙齿分割 FastAPI 服务。

执行步骤：
1. 检查端口 9009 是否已被占用：`lsof -ti:9009`
   - 如果有进程，先杀掉：`kill -9 $(lsof -ti:9009)`
2. 进入服务目录：`cd /Users/yonjay/codes/hubs/react-vtk-3d/server`
3. 启动服务：`python main.py`

服务启动后会在 http://localhost:9009 提供以下接口：
- POST /api/segment-teeth — 牙齿分割（STL → GLB）
- GET /api/getDigital — 获取默认模型路径
- GET /api/getAllToothInfo — 获取牙齿信息
- 其他现有接口

如果启动失败，检查 Python 环境是否安装了所有依赖（requirements.txt）。
