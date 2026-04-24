import * as THREE from "three"
import { DeviceUtils } from "@/utils/device"

export type Point2D = [number, number]
export type Point3D = [number, number, number]

/**
 * 3D 世界坐标 → 屏幕像素坐标（物理像素，含 DPR）
 * 替代 vtkCoordinate.getComputedLocalDisplayValue()
 */
export function worldToScreen(
  point: THREE.Vector3,
  camera: THREE.Camera,
  container: HTMLElement,
): Point2D {
  const ndc = point.clone().project(camera)
  const x = ((ndc.x + 1) / 2) * container.clientWidth
  const y = ((1 - ndc.y) / 2) * container.clientHeight
  const dpr = DeviceUtils.getDPR()
  return [x * dpr, y * dpr]
}

/**
 * 屏幕 CSS 像素坐标 → NDC（归一化设备坐标）
 */
export function screenToNDC(
  x: number,
  y: number,
  container: HTMLElement,
): THREE.Vector2 {
  return new THREE.Vector2(
    (x / container.clientWidth) * 2 - 1,
    -(y / container.clientHeight) * 2 + 1,
  )
}
