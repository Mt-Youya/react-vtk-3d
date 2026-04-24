/**
 * 前视图相机参数计算
 * 已重构为 three.js Box3（替代 vtkOBBTree）
 */
import { computeFrontViewCamera } from "@/core/three/FrontViewWorker"
import type { CameraInfo } from "@/core/three/types"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = any

/**
 * 计算前视图相机参数
 * @param uMesh 上颌模型（ToothObject 或旧版 vtkReader，兼容 workGeo / getOutputData）
 * @param lMesh 下颌模型
 */
export default async function switchFrontViewWorker(uMesh: AnyObj, lMesh: AnyObj): Promise<CameraInfo> {
  // 兼容 three.js ToothObject（workGeo）和旧版 vtk.js reader（getOutputData）
  function getPositions(mesh: AnyObj): Float32Array {
    if (mesh?.workGeo) {
      // three.js ToothObject
      const attr = mesh.workGeo.getAttribute("position")
      return attr?.array as Float32Array ?? new Float32Array(0)
    }
    if (typeof mesh?.getOutputData === "function") {
      // 旧版 vtk.js reader（兼容路径，实际上已不使用）
      const data = mesh.getOutputData()
      return data?.getPoints?.()?.getData?.() ?? new Float32Array(0)
    }
    return new Float32Array(0)
  }

  const uPos = getPositions(uMesh)
  const lPos = getPositions(lMesh)
  return computeFrontViewCamera(uPos, lPos)
}
