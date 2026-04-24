import * as THREE from "three"
import { worldToScreen } from "./CoordUtils"
import { isPointInPolygonV2 } from "@/core/geometry"
import { BBox } from "@/core/geometry"
import type { ToothObject } from "./ToothObject"
import type { Point2D } from "./types"
import { DeviceUtils } from "@/utils/device"

/**
 * 选择高亮器
 * 替代 highlightSelectionPoints.ts（vtk.js 算法）
 *
 * 根据选择框（矩形或多边形）和 AreaSelector 的选中三角形，
 * 计算并显示高亮顶点点云。
 */
export class SelectionHighlighter {
  private camera: THREE.Camera
  private container: HTMLElement

  /** 当前选择框（CSS 像素坐标，2 点矩形或多边形） */
  private selectionBox: Point2D[] = []

  /** 已选中的三角形索引（由 AreaSelector 填充） */
  selectedTriangles: Map<ToothObject, Set<number>> = new Map()

  constructor(camera: THREE.Camera, container: HTMLElement) {
    this.camera = camera
    this.container = container
  }

  setSelectionBox(box: Point2D[]): void {
    this.selectionBox = box
  }

  setSelectedTriangles(map: Map<ToothObject, Set<number>>): void {
    this.selectedTriangles = map
    this._updateHighlight()
  }

  clearSelection(): void {
    this.selectionBox = []
    this.selectedTriangles = new Map()
    this._updateHighlight()
  }

  private _getBoundary(): Point2D[] {
    const box = this.selectionBox
    if (box.length === 0) return []
    const containerHeight = DeviceUtils.getContainerHeightPx()
    if (box.length === 2) {
      const [p1, p2] = box
      return [
        [p1[0], containerHeight - p2[1]],
        [p2[0], containerHeight - p1[1]],
      ]
    }
    return box
  }

  private _updateHighlight(): void {
    for (const [tooth, triSet] of this.selectedTriangles) {
      if (triSet.size === 0) {
        tooth.highlightPoints.geometry = new THREE.BufferGeometry()
        continue
      }

      const posAttr = tooth.workGeo.getAttribute("position") as THREE.BufferAttribute
      const boundary = this._getBoundary()

      const highlightPos: number[] = []

      for (const triIdx of triSet) {
        for (let v = 0; v < 3; v++) {
          const vertIdx = triIdx * 3 + v
          const wx = posAttr.getX(vertIdx)
          const wy = posAttr.getY(vertIdx)
          const wz = posAttr.getZ(vertIdx)
          const worldPt = new THREE.Vector3(wx, wy, wz)

          // 检查顶点是否在选择框内
          if (boundary.length > 0) {
            const screenPt = worldToScreen(worldPt, this.camera, this.container)
            if (!isPointInPolygonV2(boundary, screenPt)) continue
          }

          highlightPos.push(wx, wy, wz)
        }
      }

      const geo = new THREE.BufferGeometry()
      if (highlightPos.length > 0) {
        geo.setAttribute(
          "position",
          new THREE.BufferAttribute(new Float32Array(highlightPos), 3),
        )
      }
      tooth.highlightPoints.geometry.dispose()
      tooth.highlightPoints.geometry = geo
    }
  }

  /**
   * 获取指定 ToothObject 当前高亮的顶点索引（在 workGeo 中的索引）
   * 用于 delete 操作
   */
  getHighlightedVertexIndices(tooth: ToothObject): number[] {
    const triSet = this.selectedTriangles.get(tooth)
    if (!triSet || triSet.size === 0) return []

    const posAttr = tooth.workGeo.getAttribute("position") as THREE.BufferAttribute
    const boundary = this._getBoundary()
    const indices: number[] = []

    for (const triIdx of triSet) {
      for (let v = 0; v < 3; v++) {
        const vertIdx = triIdx * 3 + v
        if (boundary.length > 0) {
          const wx = posAttr.getX(vertIdx)
          const wy = posAttr.getY(vertIdx)
          const wz = posAttr.getZ(vertIdx)
          const screenPt = worldToScreen(new THREE.Vector3(wx, wy, wz), this.camera, this.container)
          if (!isPointInPolygonV2(boundary, screenPt)) continue
        }
        indices.push(vertIdx)
      }
    }
    return indices
  }

  /**
   * 获取指定 ToothObject 当前高亮的三角形索引集合
   */
  getHighlightedTriIndices(tooth: ToothObject): Set<number> {
    return this.selectedTriangles.get(tooth) ?? new Set()
  }
}
