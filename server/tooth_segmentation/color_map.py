"""
color_map — 牙位标签 → RGB 颜色映射

与前端 src/lib/VTKLoader.ts 中的 LABEL_LUT 完全一致（26色方案）。

MeshSegNet 输出 15 类（0=牙龈，1-14=各牙位），
映射到 LABEL_LUT 的前 15 个颜色条目。
"""

from typing import Tuple

# ── LABEL_LUT（与前端 VTKLoader.ts 完全一致，0-255 整数）─────────────────────
# 索引 0 = 牙龈/背景，索引 1-16 = 各牙位
LABEL_LUT: list[Tuple[int, int, int]] = [
    (90,  65,  60),   # 0  牙龈/背景（深棕灰）
    (255, 60,  60),   # 1
    (60,  180, 255),  # 2
    (255, 200, 0),    # 3
    (140, 60,  255),  # 4
    (60,  220, 80),   # 5
    (255, 120, 0),    # 6
    (0,   200, 220),  # 7
    (220, 60,  180),  # 8
    (180, 230, 60),   # 9
    (60,  80,  220),  # 10
    (255, 160, 60),   # 11
    (60,  200, 160),  # 12
    (200, 60,  100),  # 13
    (100, 255, 180),  # 14
    (180, 100, 255),  # 15
    (255, 220, 100),  # 16（保留，备用）
    # 以下为扩展颜色（MeshSegNet 默认 15 类，保留全部 26 色以备扩展）
    (100, 160, 60),   # 17
    (60,  120, 200),  # 18
    (200, 80,  200),  # 19
    (160, 220, 80),   # 20
    (80,  60,  160),  # 21
    (220, 140, 80),   # 22
    (100, 200, 100),  # 23
    (160, 80,  60),   # 24
    (80,  160, 240),  # 25
]

# 超出范围时的回退颜色（与前端 NAN_COLOR 一致）
_FALLBACK: Tuple[int, int, int] = (90, 65, 60)


def label_to_rgb(label: int) -> Tuple[int, int, int]:
    """
    将 MeshSegNet 输出的整数标签转换为 RGB 颜色（0-255）。

    参数：
        label: 整数标签（0=牙龈，1-16=FDI 牙位）

    返回：
        (R, G, B) 元组，每个分量 0-255
    """
    idx = int(round(label))
    if 0 <= idx < len(LABEL_LUT):
        return LABEL_LUT[idx]
    return _FALLBACK


def label_to_rgba(label: int, alpha: int = 255) -> Tuple[int, int, int, int]:
    """
    将标签转换为 RGBA 颜色（含 alpha 通道）。
    """
    r, g, b = label_to_rgb(label)
    return (r, g, b, alpha)
