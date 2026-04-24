/**
 * LabelOverlay — 文字标注 Canvas 2D overlay
 *
 * 覆盖在 R3F Canvas 上方，使用 Canvas 2D API 绘制牙齿宽度标注文字
 * 通过 useThree 访问相机，将 3D 世界坐标投影到屏幕坐标
 */

import { useRef, useEffect } from "react"
import * as THREE from "three"
import { useToothStore } from "@/stores"
import { DeviceUtils } from "@/utils/device"

function worldToScreen(
  point: THREE.Vector3,
  camera: THREE.Camera,
  container: HTMLElement,
): [number, number] {
  const ndc = point.clone().project(camera)
  const x = ((ndc.x + 1) / 2) * container.clientWidth
  const y = ((1 - ndc.y) / 2) * container.clientHeight
  const dpr = DeviceUtils.getDPR()
  return [x * dpr, y * dpr]
}

interface LabelOverlayProps {
  camera: THREE.Camera
  containerRef: React.RefObject<HTMLDivElement | null>
}

export function LabelOverlay({ camera, containerRef }: LabelOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const widthLabels = useToothStore((s) => s.widthLabels)
  const cameraVersion = useToothStore((s) => s.cameraVersion)

  // 重绘标注
  useEffect(() => {
    const canvas = canvasRef.current
    const container = containerRef.current
    if (!canvas || !container) return

    canvas.width = container.clientWidth
    canvas.height = container.clientHeight

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const dpr = DeviceUtils.getDPR()

    for (const type of ["up", "down"] as const) {
      for (const entry of Object.values(widthLabels[type])) {
        if (!entry.visible) continue
        for (const pt of entry.points) {
          const sp = worldToScreen(new THREE.Vector3(...pt), camera, container)
          const cx = sp[0] / dpr
          const cy = sp[1] / dpr

          // 背景圆角矩形
          const radius = 10, w = 84, h = 20
          const bx = cx - w / 2, by = cy - h / 2 + 20
          ctx.beginPath()
          ctx.moveTo(bx + radius, by)
          ctx.arcTo(bx + w, by, bx + w, by + h, radius)
          ctx.arcTo(bx + w, by + h, bx, by + h, radius)
          ctx.arcTo(bx, by + h, bx, by, radius)
          ctx.arcTo(bx, by, bx + w, by, radius)
          ctx.fillStyle = "#ffffff"
          ctx.fill()
          ctx.closePath()

          ctx.font = "12px serif"
          ctx.fillStyle = "#000"
          ctx.textAlign = "center"
          ctx.textBaseline = "middle"
          ctx.fillText(entry.name, cx, cy + 20)
        }
      }
    }
  }, [widthLabels, cameraVersion, camera, containerRef])

  // 相机变化时清除（由 cameraVersion 触发重绘）
  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        pointerEvents: "none",
        zIndex: 5,
      }}
    />
  )
}
