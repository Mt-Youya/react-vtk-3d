"""
inference — STL 牙齿网格推理

完全按照官方 Mesh_dataset.py 的特征构建和邻接矩阵方式实现。

特征向量（15维，顺序与官方完全一致）：
  [0:9]   面的3个顶点坐标（归一化：减均值除标准差）
  [9:12]  面质心（归一化：min-max）
  [12:15] 面法线（归一化：减均值除标准差）

邻接矩阵（官方方式，基于质心距离）：
  A_S: 质心距离 < 0.1 → 1，行归一化
  A_L: 质心距离 < 0.2 → 1，行归一化

输入格式（Conv1d）：
  x:   [B, 15, N]
  a_s: [B, N, N]
  a_l: [B, N, N]

注意：
  - 官方训练时固定 patch_size=6000（或7000）个 cell
  - 超过时随机采样，推理完后用最近邻映射回原始面
"""

from __future__ import annotations

import io
import os
import logging

import numpy as np
import trimesh
import torch
from scipy.spatial import distance_matrix as scipy_distance_matrix

from .meshsegnet import MeshSegNet

logger = logging.getLogger(__name__)

_PATCH_SIZE = 6000   # 官方推理时的固定输入大小
_NUM_CLASSES = 15


# ─────────────────────────────────────────────────────────────────────────────
# 特征计算（完全按照官方 Mesh_dataset.py）
# ─────────────────────────────────────────────────────────────────────────────

def _compute_features_and_adjacency(
    mesh: trimesh.Trimesh,
    patch_size: int = _PATCH_SIZE,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray]:
    """
    计算特征矩阵和邻接矩阵，完全按照官方 Mesh_dataset.py。

    返回：
        X_input:       [15, patch_size] float32  — 模型输入特征（转置后）
        A_S:           [patch_size, patch_size] float32
        A_L:           [patch_size, patch_size] float32
        selected_idx:  [patch_size,] int         — 采样的面索引（用于映射回原始面）
    """
    # ── 1. 准备顶点和面 ───────────────────────────────────────────────────────
    points = mesh.vertices.copy().astype(np.float32)   # [V, 3]
    faces = mesh.faces                                  # [N, 3]
    n_cells = len(faces)

    # 移到原点（减去网格质心）
    mean_cell_centers = points.mean(axis=0)
    points -= mean_cell_centers

    # 面的3个顶点坐标展平 [N, 9]
    cells = points[faces].reshape(n_cells, 9).astype(np.float32)

    # ── 2. 法线（用 trimesh 计算，再手动归一化方向）────────────────────────────
    # 重新构建移位后的 mesh 来计算法线
    shifted_mesh = trimesh.Trimesh(vertices=points, faces=faces, process=False)
    normals = shifted_mesh.face_normals.astype(np.float32)  # [N, 3]

    # ── 3. 面质心（已移位）────────────────────────────────────────────────────
    barycenters = shifted_mesh.triangles_center.astype(np.float32)  # [N, 3]

    # ── 4. 归一化（完全按官方）────────────────────────────────────────────────
    maxs = points.max(axis=0)
    mins = points.min(axis=0)
    means = points.mean(axis=0)
    stds = points.std(axis=0)
    stds[stds < 1e-8] = 1.0

    nmeans = normals.mean(axis=0)
    nstds = normals.std(axis=0)
    nstds[nstds < 1e-8] = 1.0

    # 顶点坐标归一化（减均值除标准差）
    for i in range(3):
        cells[:, i]   = (cells[:, i]   - means[i]) / stds[i]  # v0.x/y/z
        cells[:, i+3] = (cells[:, i+3] - means[i]) / stds[i]  # v1.x/y/z
        cells[:, i+6] = (cells[:, i+6] - means[i]) / stds[i]  # v2.x/y/z
        # 质心归一化（min-max）
        denom = maxs[i] - mins[i]
        if abs(denom) < 1e-8:
            denom = 1.0
        barycenters[:, i] = (barycenters[:, i] - mins[i]) / denom
        # 法线归一化
        normals[:, i] = (normals[:, i] - nmeans[i]) / nstds[i]

    # ── 5. 拼接特征 [N, 15]（顺序：cells + barycenters + normals）─────────────
    X = np.column_stack((cells, barycenters, normals)).astype(np.float32)

    # ── 6. 采样 patch_size 个面（推理时全取，不足时重复采样）──────────────────
    if n_cells >= patch_size:
        selected_idx = np.random.choice(n_cells, size=patch_size, replace=False)
    else:
        selected_idx = np.random.choice(n_cells, size=patch_size, replace=True)

    selected_idx = np.sort(selected_idx)
    X_patch = X[selected_idx, :]  # [patch_size, 15]

    # ── 7. 邻接矩阵（基于质心距离，完全按官方）────────────────────────────────
    # 用归一化后的质心（X_patch[:, 9:12]）计算距离
    bary_patch = X_patch[:, 9:12]  # [patch_size, 3]

    if torch.cuda.is_available():
        TX = torch.as_tensor(bary_patch, device='cuda')
        D = torch.cdist(TX, TX).cpu().numpy()
    else:
        D = scipy_distance_matrix(bary_patch, bary_patch)

    A_S = np.zeros((patch_size, patch_size), dtype=np.float32)
    A_S[D < 0.1] = 1.0
    row_sum = A_S.sum(axis=1, keepdims=True)
    row_sum[row_sum == 0] = 1.0
    A_S = A_S / row_sum

    A_L = np.zeros((patch_size, patch_size), dtype=np.float32)
    A_L[D < 0.2] = 1.0
    row_sum = A_L.sum(axis=1, keepdims=True)
    row_sum[row_sum == 0] = 1.0
    A_L = A_L / row_sum

    # ── 8. 转置为 Conv1d 格式 [15, patch_size] ────────────────────────────────
    X_input = X_patch.T  # [15, patch_size]

    return X_input, A_S, A_L, selected_idx


# ─────────────────────────────────────────────────────────────────────────────
# 推理主函数
# ─────────────────────────────────────────────────────────────────────────────

def segment_stl(
    stl_bytes: bytes,
    weights_path: str,
    num_classes: int = _NUM_CLASSES,
    n_runs: int = 1,
) -> np.ndarray:
    """
    对 STL 网格进行牙齿分割推理。

    策略：将所有面分成多个 patch_size 大小的块，每块完整推理，
    最终每个面都被直接预测（多次覆盖时取投票）。

    参数：
        stl_bytes:    STL 文件的二进制内容
        weights_path: MeshSegNet 权重文件路径（.pth）
        num_classes:  输出类别数（默认 15）
        n_runs:       每轮随机打乱覆盖次数（默认 1，增加可减少边界噪点）

    返回：
        labels: [N,] int32 数组，每个面的类别标签（0=牙龈，1-14=各牙位）
    """
    if not os.path.exists(weights_path):
        raise FileNotFoundError(
            f"MeshSegNet 权重文件不存在：{weights_path}\n"
            "请从 https://github.com/Tai-Hsien/MeshSegNet/tree/master/models "
            "下载权重 zip 文件，重命名后放置到 server/tooth_segmentation/weights/ 目录。"
        )

    # ── 加载网格 ──────────────────────────────────────────────────────────────
    try:
        mesh = trimesh.load(io.BytesIO(stl_bytes), file_type="stl", process=True)
    except Exception as e:
        raise RuntimeError(f"STL 文件解析失败：{e}") from e

    if not isinstance(mesh, trimesh.Trimesh):
        if hasattr(mesh, "dump"):
            mesh = trimesh.util.concatenate(mesh.dump())
        else:
            raise RuntimeError("无法解析 STL 为单个网格")

    n_faces = len(mesh.faces)
    logger.info("网格加载：%d 顶点，%d 面", len(mesh.vertices), n_faces)

    # ── 设备 ─────────────────────────────────────────────────────────────────
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    logger.info("推理设备：%s", device)

    # ── 加载模型 ──────────────────────────────────────────────────────────────
    model = MeshSegNet(num_classes=num_classes, num_channels=15, with_dropout=False)
    state = torch.load(weights_path, map_location=device)
    if isinstance(state, dict) and "model_state_dict" in state:
        state = state["model_state_dict"]
    model.load_state_dict(state)
    model.to(device)
    model.eval()

    # ── 预计算全局特征（归一化参数基于完整网格）────────────────────────────────
    points = mesh.vertices.copy().astype(np.float32)
    mean_cell_centers = points.mean(axis=0)
    points -= mean_cell_centers

    shifted_mesh = trimesh.Trimesh(vertices=points, faces=mesh.faces, process=False)
    normals = shifted_mesh.face_normals.astype(np.float32)          # [N, 3]
    barycenters = shifted_mesh.triangles_center.astype(np.float32)  # [N, 3]
    cells = points[mesh.faces].reshape(n_faces, 9).astype(np.float32)

    maxs = points.max(axis=0)
    mins = points.min(axis=0)
    means = points.mean(axis=0)
    stds = points.std(axis=0);  stds[stds < 1e-8] = 1.0
    nmeans = normals.mean(axis=0)
    nstds = normals.std(axis=0);  nstds[nstds < 1e-8] = 1.0

    for i in range(3):
        cells[:, i]   = (cells[:, i]   - means[i]) / stds[i]
        cells[:, i+3] = (cells[:, i+3] - means[i]) / stds[i]
        cells[:, i+6] = (cells[:, i+6] - means[i]) / stds[i]
        denom = maxs[i] - mins[i];  denom = denom if abs(denom) > 1e-8 else 1.0
        barycenters[:, i] = (barycenters[:, i] - mins[i]) / denom
        normals[:, i] = (normals[:, i] - nmeans[i]) / nstds[i]

    X_all = np.column_stack((cells, barycenters, normals)).astype(np.float32)  # [N, 15]

    # ── 分块推理：每块 _PATCH_SIZE 个面，覆盖所有面 ───────────────────────────
    vote_matrix = np.zeros((n_faces, num_classes), dtype=np.int32)
    n_chunks = int(np.ceil(n_faces / _PATCH_SIZE))
    total_runs = n_runs * n_chunks
    run_count = 0

    for run in range(n_runs):
        # 每轮随机打乱顺序，减少块边界偏差
        perm = np.random.permutation(n_faces)

        for chunk_i in range(n_chunks):
            start = chunk_i * _PATCH_SIZE
            end   = min(start + _PATCH_SIZE, n_faces)
            chunk_idx = perm[start:end]

            # 不足 _PATCH_SIZE 时用随机重复填充（保持输入尺寸固定）
            if len(chunk_idx) < _PATCH_SIZE:
                pad = np.random.choice(chunk_idx, size=_PATCH_SIZE - len(chunk_idx), replace=True)
                chunk_idx_padded = np.concatenate([chunk_idx, pad])
            else:
                chunk_idx_padded = chunk_idx

            X_patch = X_all[chunk_idx_padded, :].T  # [15, patch_size]
            bary_patch = X_all[chunk_idx_padded, 9:12]

            # 邻接矩阵
            if torch.cuda.is_available():
                TX = torch.as_tensor(bary_patch, device=device)
                D = torch.cdist(TX, TX).cpu().numpy()
            else:
                D = scipy_distance_matrix(bary_patch, bary_patch)

            A_S = (D < 0.1).astype(np.float32)
            rs = A_S.sum(axis=1, keepdims=True); rs[rs == 0] = 1.0; A_S /= rs

            A_L = (D < 0.2).astype(np.float32)
            rs = A_L.sum(axis=1, keepdims=True); rs[rs == 0] = 1.0; A_L /= rs

            x   = torch.tensor(X_patch, dtype=torch.float32, device=device).unsqueeze(0)
            a_s = torch.tensor(A_S,     dtype=torch.float32, device=device).unsqueeze(0)
            a_l = torch.tensor(A_L,     dtype=torch.float32, device=device).unsqueeze(0)

            with torch.no_grad():
                outputs = model(x, a_s, a_l)                  # [1, patch_size, 15]
                preds = outputs.argmax(dim=-1).squeeze(0).cpu().numpy().astype(np.int32)

            # 只对真实面（非填充）累计投票
            for local_i, fi in enumerate(chunk_idx):
                vote_matrix[fi, preds[local_i]] += 1

            run_count += 1
            logger.info("分块推理进度：%d/%d", run_count, total_runs)

    # ── 取投票最多的标签 ──────────────────────────────────────────────────────
    all_labels = vote_matrix.argmax(axis=1).astype(np.int32)

    unique, counts = np.unique(all_labels, return_counts=True)
    logger.info(
        "推理完成，标签分布：%s",
        {int(k): int(v) for k, v in zip(unique, counts)},
    )
    return all_labels
