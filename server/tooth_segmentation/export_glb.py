"""
export_glb — 将牙齿分割结果导出为带颜色的 GLB 文件

流程：
  trimesh.Trimesh + 面标签数组 → 顶点颜色 → GLB bytes

注意：
  STL 网格中每个顶点可能被多个面共享，且各面的标签不同。
  此处采用"最后写入优先"策略，即若顶点被多个标签的面共享，
  以标签值最大（或最常见）的面颜色为准。
  对于牙科分割，同一顶点的相邻面通常属于同一颗牙，此策略基本正确。
"""

from __future__ import annotations

import io
import logging

import numpy as np
import trimesh

from .color_map import label_to_rgba

logger = logging.getLogger(__name__)


def export_to_glb(
    mesh: trimesh.Trimesh,
    face_labels: np.ndarray,
    strategy: str = "majority",
) -> bytes:
    """
    将面标签映射为顶点颜色，并导出为 GLB 二进制格式。

    参数：
        mesh:        trimesh.Trimesh 网格对象
        face_labels: [N,] int 数组，每个三角面的标签（0=牙龈，1-16=牙位）
        strategy:    顶点颜色策略
                     - "majority": 取该顶点所有相邻面中出现最多的标签
                     - "last":     最后写入的面标签（速度最快）

    返回：
        GLB 二进制内容（bytes）
    """
    n_vertices = len(mesh.vertices)
    n_faces = len(mesh.faces)

    if len(face_labels) != n_faces:
        raise ValueError(
            f"face_labels 长度 {len(face_labels)} 与网格面数 {n_faces} 不一致"
        )

    logger.info("开始导出 GLB：%d 顶点，%d 面", n_vertices, n_faces)

    # ── 顶点颜色计算 ──────────────────────────────────────────────────────────
    vertex_colors = np.zeros((n_vertices, 4), dtype=np.uint8)

    if strategy == "majority":
        # 统计每个顶点被哪些标签覆盖，取出现最多的
        # 使用 (n_vertices, num_classes) 计数矩阵
        num_classes = int(face_labels.max()) + 1
        vote_matrix = np.zeros((n_vertices, max(num_classes, 17)), dtype=np.int32)

        for fi in range(n_faces):
            label = int(face_labels[fi])
            for vi in mesh.faces[fi]:
                vote_matrix[vi, label] += 1

        dominant_labels = vote_matrix.argmax(axis=1)  # [n_vertices,]

        for vi in range(n_vertices):
            r, g, b, a = label_to_rgba(int(dominant_labels[vi]))
            vertex_colors[vi] = (r, g, b, a)

    else:  # "last"
        for fi in range(n_faces):
            label = int(face_labels[fi])
            r, g, b, a = label_to_rgba(label)
            color = np.array([r, g, b, a], dtype=np.uint8)
            for vi in mesh.faces[fi]:
                vertex_colors[vi] = color

    # ── 构建带颜色的 trimesh ──────────────────────────────────────────────────
    colored_mesh = trimesh.Trimesh(
        vertices=mesh.vertices.copy(),
        faces=mesh.faces.copy(),
        vertex_colors=vertex_colors,
        process=False,
    )

    # ── 导出 GLB ──────────────────────────────────────────────────────────────
    glb_bytes: bytes = colored_mesh.export(file_type="glb")
    logger.info("GLB 导出完成，大小：%d bytes", len(glb_bytes))
    return glb_bytes


def export_to_glb_from_stl(stl_bytes: bytes, face_labels: np.ndarray) -> bytes:
    """
    从 STL bytes 直接导出带颜色的 GLB。

    参数：
        stl_bytes:   STL 文件的二进制内容
        face_labels: [N,] int 数组，每个三角面的标签

    返回：
        GLB 二进制内容（bytes）
    """
    mesh = trimesh.load(io.BytesIO(stl_bytes), file_type="stl", process=True)
    if not isinstance(mesh, trimesh.Trimesh):
        if hasattr(mesh, "dump"):
            mesh = trimesh.util.concatenate(mesh.dump())
        else:
            raise RuntimeError("无法解析 STL 为单个网格")
    return export_to_glb(mesh, face_labels)
