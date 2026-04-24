/**
 * SelectionOverlay — 框选/多边形选择的 Canvas 2D overlay
 *
 * 覆盖在 R3F Canvas 上方，处理鼠标事件并绘制选择框/多边形
 * 选择结果写入 Zustand store
 *
 * 注意：此组件在 Canvas 外部渲染，不能使用 useThree。
 * 相机通过 sceneRefsRef 访问。
 */

import { useRef, useEffect } from "react"
import * as THREE from "three"
import { useToothStore, SelectionMode } from "@/stores"
import { AreaSelector } from "@/core/three/AreaSelector"
import type { HighlightPointsData } from "@/stores"
import type { SceneRefs } from "./index"

const areaSelector = new AreaSelector()

interface SelectionOverlayProps {
  meshRefs: { l: THREE.Mesh | null; u: THREE.Mesh | null }
  containerRef: React.RefObject<HTMLDivElement | null>
  sceneRefsRef: React.MutableRefObject<SceneRefs>
}

export function SelectionOverlayCanvas({ meshRefs, containerRef, sceneRefsRef }: SelectionOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const selectionMode = useToothStore((s) => s.selectionMode)
  const setHighlightPoints = useToothStore((s) => s.setHighlightPoints)
  const setSelectedFaces = useToothStore((s) => s.setSelectedFaces)
  const workGeos = useToothStore((s) => s.workGeos)

  // 框选状态
  const isBoxSelecting = useRef(false)
  const boxStart = useRef<[number, number]>([0, 0])

  function getPointerPos(e: MouseEvent): [number, number] {
    const container = containerRef.current
    if (!container) return [0, 0]
    const rect = container.getBoundingClientRect()
    return [e.clientX - rect.left, e.clientY - rect.top]
  }

  function getMeshes(): THREE.Mesh[] {
    return (["l", "u"] as const)
      .map((n) => meshRefs[n])
      .filter((m): m is THREE.Mesh => m !== null && m.visible)
  }

  function computeHighlightPoints(
    mesh: THREE.Mesh,
    triSet: Set<number>,
  ): HighlightPointsData | null {
    if (triSet.size === 0) return null
    const name = mesh.name as "l" | "u"
    const geo = workGeos[name]
    if (!geo) return null
    const posAttr = geo.getAttribute("position") as THREE.BufferAttribute
    const positions: number[] = []
    for (const triIdx of triSet) {
      for (let v = 0; v < 3; v++) {
        const vi = triIdx * 3 + v
        positions.push(posAttr.getX(vi), posAttr.getY(vi), posAttr.getZ(vi))
      }
    }
    return { positions: new Float32Array(positions), toothName: name }
  }

  function drawBoxOverlay(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number) {
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height)
    ctx.strokeStyle = "#ff0000"
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.strokeRect(x, y, w, h)
  }

  useEffect(() => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return

    function resizeCanvas() {
      if (!canvas || !container) return
      canvas.width = container.clientWidth
      canvas.height = container.clientHeight
    }
    resizeCanvas()
    const ro = new ResizeObserver(resizeCanvas)
    ro.observe(container)

    const ctx = canvas.getContext("2d")!

    function onMouseDown(e: MouseEvent) {
      const currentMode = useToothStore.getState().selectionMode
      if (currentMode === SelectionMode.rect && e.button === 0) {
        isBoxSelecting.current = true
        boxStart.current = getPointerPos(e)
      }
    }

    function onMouseMove(e: MouseEvent) {
      const currentMode = useToothStore.getState().selectionMode
      if (!isBoxSelecting.current || currentMode !== SelectionMode.rect) return
      const [cx, cy] = getPointerPos(e)
      const [sx, sy] = boxStart.current
      const x = Math.min(cx, sx)
      const y = Math.min(cy, sy)
      const w = Math.abs(cx - sx)
      const h = Math.abs(cy - sy)
      drawBoxOverlay(ctx, x, y, w, h)
    }

    function onMouseUp(e: MouseEvent) {
      if (!isBoxSelecting.current) return
      isBoxSelecting.current = false
      ctx.clearRect(0, 0, canvas!.width, canvas!.height)

      const [ex, ey] = getPointerPos(e)
      const [sx, sy] = boxStart.current
      const xmin = Math.min(sx, ex)
      const xmax = Math.max(sx, ex)
      const ymin = Math.min(sy, ey)
      const ymax = Math.max(sy, ey)
      if (xmax - xmin < 4 || ymax - ymin < 4) return

      const camera = sceneRefsRef.current.camera
      if (!camera || !container) return

      const meshes = getMeshes()
      const resultByMesh = areaSelector.selectInBox(camera, container, meshes, [xmin, ymin, xmax, ymax])

      for (const [mesh, triSet] of resultByMesh) {
        const name = mesh.name as "l" | "u"
        setSelectedFaces(name, triSet)
        const hlData = computeHighlightPoints(mesh, triSet)
        setHighlightPoints(name, hlData)
      }
    }

    container.addEventListener("mousedown", onMouseDown)
    container.addEventListener("mousemove", onMouseMove)
    container.addEventListener("mouseup", onMouseUp)

    return () => {
      container.removeEventListener("mousedown", onMouseDown)
      container.removeEventListener("mousemove", onMouseMove)
      container.removeEventListener("mouseup", onMouseUp)
      ro.disconnect()
    }
  }, [containerRef, setHighlightPoints, setSelectedFaces])

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        pointerEvents: selectionMode !== SelectionMode.none ? "auto" : "none",
        zIndex: 10,
      }}
    />
  )
}
