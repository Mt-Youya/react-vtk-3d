import * as THREE from "three"
import { isPointInPolygonV2 } from "@/core/geometry"
import { BBox } from "@/core/geometry"
import { screenToNDC } from "./CoordUtils"
import type { Point2D } from "./types"

/**
 * 区域选择器
 * 用 Raycaster 均匀采样替代 vtk.js HardwareSelector
 *
 * 返回：Map<Mesh, Set<triIndex>>
 */
export class AreaSelector {
  private raycaster = new THREE.Raycaster()

  /**
   * 矩形框选
   * @param box [xmin, ymin, xmax, ymax]（CSS 像素坐标）
   */
  selectInBox(
    camera: THREE.Camera,
    container: HTMLElement,
    meshes: THREE.Mesh[],
    box: [number, number, number, number],
    step = 4,
  ): Map<THREE.Mesh, Set<number>> {
    const [xmin, ymin, xmax, ymax] = box
    const result = new Map<THREE.Mesh, Set<number>>()
    for (let x = xmin; x <= xmax; x += step) {
      for (let y = ymin; y <= ymax; y += step) {
        this._castAndCollect(camera, container, meshes, x, y, result)
      }
    }
    return result
  }

  /**
   * 多边形选择
   * @param polygon CSS 像素坐标的多边形顶点数组
   */
  selectInPolygon(
    camera: THREE.Camera,
    container: HTMLElement,
    meshes: THREE.Mesh[],
    polygon: Point2D[],
    step = 4,
  ): Map<THREE.Mesh, Set<number>> {
    if (polygon.length < 3) return new Map()
    const [[xmin, ymin], [xmax, ymax]] = BBox(polygon)
    const result = new Map<THREE.Mesh, Set<number>>()
    for (let x = xmin; x <= xmax; x += step) {
      for (let y = ymin; y <= ymax; y += step) {
        if (!isPointInPolygonV2(polygon, [x, y])) continue
        this._castAndCollect(camera, container, meshes, x, y, result)
      }
    }
    return result
  }

  private _castAndCollect(
    camera: THREE.Camera,
    container: HTMLElement,
    meshes: THREE.Mesh[],
    x: number,
    y: number,
    result: Map<THREE.Mesh, Set<number>>,
  ): void {
    const ndc = screenToNDC(x, y, container)
    this.raycaster.setFromCamera(ndc, camera)
    const hits = this.raycaster.intersectObjects(meshes, false)
    for (const hit of hits) {
      if (hit.faceIndex == null) continue
      const mesh = hit.object as THREE.Mesh
      if (!result.has(mesh)) result.set(mesh, new Set())
      result.get(mesh)!.add(hit.faceIndex)
    }
  }
}
