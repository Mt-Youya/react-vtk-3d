"""
tooth_segmentation — 牙齿分割模块

使用 MeshSegNet（PyTorch）对 STL 牙齿网格进行逐面分割，
输出带有每颗牙齿独立颜色的 GLB 文件。

用法：
    from tooth_segmentation.inference import segment_stl
    from tooth_segmentation.export_glb import export_to_glb
"""
