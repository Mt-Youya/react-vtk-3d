import * as THREE from "three"
import type { Point3D, CameraInfo } from "./types"

/**
 * 用 three.js Box3（AABB）计算前视图相机参数
 * 替代 switchFrontViewWorker.ts 中的 vtkOBBTree
 *
 * @param upperPositions 上颌顶点坐标（Float32Array，每 3 个一组）
 * @param lowerPositions 下颌顶点坐标（Float32Array，每 3 个一组）
 */
export function computeFrontViewCamera(
  upperPositions: Float32Array,
  lowerPositions: Float32Array,
): CameraInfo {
  // 合并上下颌所有顶点
  const allPos = new Float32Array(upperPositions.length + lowerPositions.length)
  allPos.set(upperPositions)
  allPos.set(lowerPositions, upperPositions.length)

  if (allPos.length === 0) {
    return [
      [0, 0, 0],
      [0, 1, 0],
      [0, 0, 200],
    ]
  }

  // 计算 AABB 包围盒
  const posAttr = new THREE.BufferAttribute(allPos, 3)
  const box = new THREE.Box3().setFromBufferAttribute(posAttr)
  const center = box.getCenter(new THREE.Vector3())
  const size = box.getSize(new THREE.Vector3())
  const maxDim = Math.max(size.x, size.y, size.z)

  // 相机放在正 Z 轴方向，距离为包围盒最大维度的 2 倍
  const dist = maxDim * 2 + 10

  return [
    [center.x, center.y, center.z] as Point3D,       // focalPoint
    [0, 1, 0] as Point3D,                             // viewUp
    [center.x, center.y, center.z + dist] as Point3D, // position
  ]
}
