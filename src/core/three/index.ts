/**
 * Three.js 核心引擎入口（替代 vtk.js 版本）
 *
 * 导出与旧 src/core/index.ts 完全兼容的 API，
 * 供 src/core/index.ts 直接重导出。
 */

import * as THREE from "three"
import { ThreeRenderer } from "./ThreeRenderer"
import { ToothObject } from "./ToothObject"
import { AreaSelector } from "./AreaSelector"
import { SelectionHighlighter } from "./SelectionHighlighter"
import { SplineWidget } from "./SplineWidget"
import { computeFrontViewCamera } from "./FrontViewWorker"
import { geometryToVTP } from "./VTPSerializer"
import { geometryToSTL } from "./STLSerializer"
import { worldToScreen } from "./CoordUtils"
import PolygonSelection from "../polygon-selection"
import SelectToothIdx from "../select-tooth-idx"
import { DeviceUtils } from "@/utils/device"
import { logger } from "@/utils/logger"
import type { CameraInfo, Point3D, ToothPosition } from "./types"
import type { ToothOrderPoint } from "@/types"

const EnumSelectionMode = {
  none: 0,
  rect: 1,
  polygon: 2,
} as const
type SelectionMode = (typeof EnumSelectionMode)[keyof typeof EnumSelectionMode]

export default (function () {
  return function init(container: HTMLElement) {
    // ── 初始化 Three.js 渲染器 ──────────────────────────────────────────────
    const threeRenderer = new ThreeRenderer(container)
    const { scene, camera, renderer, controls } = threeRenderer

    // ── 牙齿模型 ────────────────────────────────────────────────────────────
    // index 0 = 下颌 "l"，index 1 = 上颌 "u"（与旧版一致）
    const teeth: ToothObject[] = [new ToothObject("l"), new ToothObject("u")]
    teeth.forEach((t) => {
      scene.add(t.mainMesh)
      scene.add(t.wireMesh)
      scene.add(t.highlightPoints)
    })

    // ── 选择系统 ────────────────────────────────────────────────────────────
    const areaSelector = new AreaSelector()
    const highlighter = new SelectionHighlighter(camera, container)

    let selectionMode: SelectionMode = EnumSelectionMode.none
    let boundary: [number, number][] = []
    let polygonSelection: PolygonSelection | null = null
    let selectToothIdx: SelectToothIdx | null = null

    // 缓存初始 buffer 用于 reset
    let cachedBuffers: ArrayBuffer[] | null = null
    let cameraInitInfo: CameraInfo | null = null

    // ── Spline Widgets ──────────────────────────────────────────────────────
    const splineWidgets: (SplineWidget | null)[] = [null, null]

    // ── 标签 Canvas ─────────────────────────────────────────────────────────
    const textCanvas = document.createElement("canvas")
    textCanvas.style.cssText = "position:absolute;left:0;top:0;pointer-events:none;"
    textCanvas.width = container.clientWidth
    textCanvas.height = container.clientHeight
    container.appendChild(textCanvas)
    const textCtx = textCanvas.getContext("2d")!

    // 相机变化时清除 canvas 标签
    controls.addEventListener("change", () => {
      textCtx.clearRect(0, 0, textCanvas.width, textCanvas.height)
    })

    // ── 宽度标注 ────────────────────────────────────────────────────────────
    type WidthEntry = {
      meshes: THREE.Object3D[]
      name: string
      points: Point3D[]
    }
    const toothWidths: Record<string, Record<string, WidthEntry | null>> = {
      up: {},
      down: {},
    }

    // ── 牙齿编号渲染 ────────────────────────────────────────────────────────
    const toothOrders: Record<string, Record<string, THREE.Object3D | null>> = {
      up: {},
      down: {},
    }

    // ── 框选事件（鼠标拖拽矩形框选） ────────────────────────────────────────
    let isBoxSelecting = false
    let boxStart: [number, number] = [0, 0]
    let boxOverlay: HTMLDivElement | null = null

    function getPointerPos(e: MouseEvent): [number, number] {
      const rect = container.getBoundingClientRect()
      return [e.clientX - rect.left, e.clientY - rect.top]
    }

    function removeBoxOverlay() {
      if (boxOverlay) {
        boxOverlay.remove()
        boxOverlay = null
      }
    }

    container.addEventListener("mousedown", (e: MouseEvent) => {
      if (selectionMode !== EnumSelectionMode.rect) return
      if (e.button !== 0) return
      isBoxSelecting = true
      boxStart = getPointerPos(e)
      boxOverlay = document.createElement("div")
      boxOverlay.style.cssText =
        "position:absolute;border:1px dashed #ff0000;pointer-events:none;box-sizing:border-box;"
      boxOverlay.style.left = `${boxStart[0]}px`
      boxOverlay.style.top = `${boxStart[1]}px`
      container.appendChild(boxOverlay)
    })

    container.addEventListener("mousemove", (e: MouseEvent) => {
      if (!isBoxSelecting || !boxOverlay) return
      const [cx, cy] = getPointerPos(e)
      const x = Math.min(cx, boxStart[0])
      const y = Math.min(cy, boxStart[1])
      const w = Math.abs(cx - boxStart[0])
      const h = Math.abs(cy - boxStart[1])
      boxOverlay.style.left = `${x}px`
      boxOverlay.style.top = `${y}px`
      boxOverlay.style.width = `${w}px`
      boxOverlay.style.height = `${h}px`
    })

    container.addEventListener("mouseup", (e: MouseEvent) => {
      if (!isBoxSelecting) return
      isBoxSelecting = false
      removeBoxOverlay()
      const [ex, ey] = getPointerPos(e)
      const xmin = Math.min(boxStart[0], ex)
      const xmax = Math.max(boxStart[0], ex)
      const ymin = Math.min(boxStart[1], ey)
      const ymax = Math.max(boxStart[1], ey)
      if (xmax - xmin < 4 || ymax - ymin < 4) return

      logger.debug("box select:", [xmin, ymin, xmax, ymax])
      const meshes = teeth.filter((t) => t.mainMesh.visible).map((t) => t.mainMesh)
      const resultByMesh = areaSelector.selectInBox(camera, container, meshes, [xmin, ymin, xmax, ymax])

      // 转换 Mesh → ToothObject
      const resultByTooth = new Map<ToothObject, Set<number>>()
      for (const [mesh, triSet] of resultByMesh) {
        const tooth = teeth.find((t) => t.mainMesh === mesh)
        if (tooth) resultByTooth.set(tooth, triSet)
      }

      highlighter.setSelectionBox([[xmin, ymin], [xmax, ymax]])
      highlighter.setSelectedTriangles(resultByTooth)
      threeRenderer.render()
    })

    // 右键点击 → 牙齿编号弹窗
    container.addEventListener("contextmenu", (e: MouseEvent) => {
      e.preventDefault()
      if (selectToothIdx) {
        selectToothIdx.delete()
        selectToothIdx = null
      }
      const [px, py] = getPointerPos(e)
      const raycaster = new THREE.Raycaster()
      const ndcX = (px / container.clientWidth) * 2 - 1
      const ndcY = -(py / container.clientHeight) * 2 + 1
      raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera)
      const meshes = teeth.filter((t) => t.mainMesh.visible).map((t) => t.mainMesh)
      const hits = raycaster.intersectObjects(meshes, false)
      if (!hits.length) return

      const hitMesh = hits[0].object as THREE.Mesh
      const hitFaceIndex = hits[0].faceIndex ?? 0
      const toothIdx = teeth.findIndex((t) => t.mainMesh === hitMesh)

      const dpr = DeviceUtils.getDPR()
      const winPos: [number, number] = [px / dpr + 3, py / dpr + 3]
      selectToothIdx = new SelectToothIdx(
        container.parentElement ?? container,
        winPos,
        null,
        (label) => {
          const hlTriSet = highlighter.getHighlightedTriIndices(teeth[toothIdx])
          if (hlTriSet.size > 0) {
            for (const triIdx of hlTriSet) {
              teeth[toothIdx].setTriangleLabel(triIdx, label)
            }
            highlighter.clearSelection()
          } else {
            teeth[toothIdx].setTriangleLabel(hitFaceIndex, label)
          }
          threeRenderer.render()
        },
      )
    })

    // 左键按下时清除 SelectToothIdx
    container.addEventListener("mousedown", () => {
      if (selectToothIdx) {
        selectToothIdx.delete()
        selectToothIdx = null
      }
    })

    // ── 内部工具函数 ────────────────────────────────────────────────────────

    function _loadBuffers(buffers: ArrayBuffer[], type: string): Promise<void> {
      const promises = teeth.map((tooth, i) => {
        if (!buffers[i]) return Promise.resolve()
        if (type === "vtp") {
          return tooth.loadVTP(buffers[i])
        } else {
          // STL：使用 parseVTP 不支持 STL，需要外部解析后 loadFromArrays
          // 此处保持与旧版一致：STL 也用 loadVTP（VTKLoader 支持 STL 格式）
          return tooth.loadVTP(buffers[i])
        }
      })
      return Promise.all(promises).then(() => undefined)
    }

    async function _triggerInitScene(
      buffers: ArrayBuffer[],
      forceFrontFace: boolean,
      type = "stl",
    ): Promise<boolean> {
      if (!buffers?.length) return false

      // 重置旧数据
      teeth.forEach((t) => {
        scene.remove(t.mainMesh)
        scene.remove(t.wireMesh)
        scene.remove(t.highlightPoints)
        t.dispose()
      })
      teeth.length = 0
      teeth.push(new ToothObject("l"), new ToothObject("u"))
      teeth.forEach((t) => {
        scene.add(t.mainMesh)
        scene.add(t.wireMesh)
        scene.add(t.highlightPoints)
      })

      await _loadBuffers(buffers, type)

      if (!cachedBuffers) cachedBuffers = buffers

      if (forceFrontFace) {
        const lPos = (teeth[0].workGeo.getAttribute("position") as THREE.BufferAttribute).array as Float32Array
        const uPos = (teeth[1].workGeo.getAttribute("position") as THREE.BufferAttribute).array as Float32Array
        cameraInitInfo = computeFrontViewCamera(uPos, lPos)
        threeRenderer.setCamera(cameraInitInfo)
      } else {
        threeRenderer.fitToScene()
      }

      threeRenderer.render()
      return true
    }

    // ── 公共 API ─────────────────────────────────────────────────────────────

    return {
      // ── 场景 ──────────────────────────────────────────────────────────────

      async triggerInitScene(
        buffers: ArrayBuffer[],
        forceFrontFace?: boolean,
        type?: string,
      ): Promise<unknown> {
        return new Promise((resolve) => {
          requestIdleCallback(
            (idle) => {
              if (idle.timeRemaining() > 0) {
                resolve(_triggerInitScene(buffers, forceFrontFace ?? true, type ?? "stl"))
              } else {
                resolve(_triggerInitScene(buffers, forceFrontFace ?? true, type ?? "stl"))
              }
            },
            { timeout: 2000 },
          )
        })
      },

      handleReset(): void {
        if (cachedBuffers) {
          void _triggerInitScene(cachedBuffers, false)
        }
      },

      handleTeethVisible(tooth?: ToothPosition): void {
        const idx = tooth === "up" ? 1 : 0
        const t = teeth[idx]
        const newVisible = !t.mainMesh.visible
        t.setVisible(newVisible)

        // 同步牙宽标注可见性
        const key = tooth === "up" ? "up" : "down"
        for (const entry of Object.values(toothWidths[key])) {
          if (entry) {
            entry.meshes.forEach((m) => {
              m.visible = newVisible
            })
          }
        }
        textCtx.clearRect(0, 0, textCanvas.width, textCanvas.height)
        threeRenderer.render()
      },

      handleTurnover(): void {
        if (teeth.length < 2) return
        const [l, u] = teeth
        l.name = "u"
        u.name = "l"
        teeth[0] = u
        teeth[1] = l
        const lPos = (teeth[0].workGeo.getAttribute("position") as THREE.BufferAttribute).array as Float32Array
        const uPos = (teeth[1].workGeo.getAttribute("position") as THREE.BufferAttribute).array as Float32Array
        cameraInitInfo = computeFrontViewCamera(uPos, lPos)
        threeRenderer.setCamera(cameraInitInfo)
        threeRenderer.render()
      },

      initModel(idx: number, readerType: string): void {
        // 重新创建指定索引的 ToothObject
        const oldTooth = teeth[idx]
        scene.remove(oldTooth.mainMesh)
        scene.remove(oldTooth.wireMesh)
        scene.remove(oldTooth.highlightPoints)
        oldTooth.dispose()
        const name = idx === 0 ? "l" : "u"
        const newTooth = new ToothObject(name)
        teeth[idx] = newTooth
        scene.add(newTooth.mainMesh)
        scene.add(newTooth.wireMesh)
        scene.add(newTooth.highlightPoints)
        void readerType // 保持 API 兼容
        threeRenderer.render()
      },

      triggerFinalFile(buffers: string[]): void {
        if (!buffers?.length) return
        const promises = teeth.map((tooth, i) => {
          if (!buffers[i]) return Promise.resolve()
          const encoder = new TextEncoder()
          return tooth.loadVTP(encoder.encode(buffers[i]).buffer)
        })
        Promise.all(promises).then(() => {
          threeRenderer.render()
        })
      },

      triggerFile(buffer: string, idx: number): void {
        const encoder = new TextEncoder()
        teeth[idx].loadVTP(encoder.encode(buffer).buffer).then(() => {
          threeRenderer.render()
        })
      },

      // ── 选择 ──────────────────────────────────────────────────────────────

      handleDelete(isShiftKey?: boolean): void {
        for (const tooth of teeth) {
          if (!tooth.mainMesh.visible) continue
          const triSet = highlighter.getHighlightedTriIndices(tooth)
          if (triSet.size === 0) continue

          if (isShiftKey) {
            // Shift+Delete：仅删除选择框内的顶点
            const vertIndices = highlighter.getHighlightedVertexIndices(tooth)
            const triIndices = new Set(vertIndices.map((v) => Math.floor(v / 3)))
            tooth.removeTriangles(triIndices)
          } else {
            tooth.removeTriangles(triSet)
          }
        }
        highlighter.clearSelection()
        if (selectionMode === EnumSelectionMode.polygon && polygonSelection) {
          polygonSelection.delete()
          polygonSelection = null
          boundary = []
        }
        threeRenderer.render()
      },

      async handleSpace(): Promise<void> {
        if (selectionMode !== EnumSelectionMode.polygon) return
        if (boundary.length < 3) {
          boundary = []
          return
        }
        if (polygonSelection) polygonSelection.update(boundary, true)

        const dpr = DeviceUtils.getDPR()
        const boundaryWithDpr = boundary.map((p) => [p[0] * dpr, p[1] * dpr] as [number, number])

        const meshes = teeth.filter((t) => t.mainMesh.visible).map((t) => t.mainMesh)
        const resultByMesh = areaSelector.selectInPolygon(camera, container, meshes, boundaryWithDpr)
        const resultByTooth = new Map<ToothObject, Set<number>>()
        for (const [mesh, triSet] of resultByMesh) {
          const tooth = teeth.find((t) => t.mainMesh === mesh)
          if (tooth) resultByTooth.set(tooth, triSet)
        }

        highlighter.setSelectionBox(boundaryWithDpr)
        highlighter.setSelectedTriangles(resultByTooth)
        boundary = []
        threeRenderer.render()
      },

      handlePolygonSelection(): void {
        logger.debug("polygon selection")
        if (selectionMode !== EnumSelectionMode.none) {
          // handleEscape
          if (polygonSelection) { polygonSelection.delete(); polygonSelection = null }
          boundary = []
          highlighter.clearSelection()
          controls.enabled = true
        }
        selectionMode = EnumSelectionMode.polygon
        controls.enabled = false
      },

      handleSelection(): void {
        if (selectionMode !== EnumSelectionMode.none) {
          // handleEscape
          if (polygonSelection) { polygonSelection.delete(); polygonSelection = null }
          boundary = []
          highlighter.clearSelection()
          controls.enabled = true
        }
        selectionMode = EnumSelectionMode.rect
        controls.enabled = false
      },

      handleEscape(): void {
        switch (selectionMode) {
          case EnumSelectionMode.rect:
            removeBoxOverlay()
            highlighter.clearSelection()
            controls.enabled = true
            break
          case EnumSelectionMode.polygon:
            if (polygonSelection) { polygonSelection.delete(); polygonSelection = null }
            boundary = []
            highlighter.clearSelection()
            controls.enabled = true
            break
        }
        selectionMode = EnumSelectionMode.none
        threeRenderer.render()
      },

      getScreenMapModelPos(point: { x: number; y: number }): Point3D | null {
        const raycaster = new THREE.Raycaster()
        const ndcX = (point.x / container.clientWidth) * 2 - 1
        const ndcY = -(point.y / container.clientHeight) * 2 + 1
        raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera)
        const meshes = teeth.filter((t) => t.mainMesh.visible).map((t) => t.mainMesh)
        const hits = raycaster.intersectObjects(meshes, false)
        if (!hits.length) return [0, 0, 0]
        const p = hits[0].point
        return [p.x, p.y, p.z]
      },

      // ── 相机 ──────────────────────────────────────────────────────────────

      getCamera(): THREE.PerspectiveCamera {
        return threeRenderer.getCamera()
      },

      setCamera(info: CameraInfo): void {
        threeRenderer.setCamera(info)
      },

      switchView(type: 0 | 1 | 2, selectedIdx?: number): void {
        const base = cameraInitInfo ?? ([[0, 0, 0], [0, 1, 0], [0, 0, 200]] as CameraInfo)
        switch (type) {
          case 0:
            threeRenderer.setCamera(base)
            break
          case 1: {
            // 侧视图：绕 X 轴旋转 87°
            const [focal, up, pos] = base
            const sign = (selectedIdx ?? 0) === 0 ? -1 : 1
            const angle = (87 * Math.PI) / 180 * sign
            const dist = Math.sqrt(
              (pos[0] - focal[0]) ** 2 + (pos[1] - focal[1]) ** 2 + (pos[2] - focal[2]) ** 2,
            )
            const newPos: Point3D = [focal[0], focal[1] - dist * Math.sin(angle), focal[2] + dist * Math.cos(angle)]
            threeRenderer.setCamera([focal, up, newPos])
            break
          }
          case 2: {
            // 背视图：反向 Z
            const [focal, up, pos] = base
            const dx = focal[0] - pos[0]
            const dy = focal[1] - pos[1]
            const dz = focal[2] - pos[2]
            const newPos: Point3D = [focal[0] + dx, focal[1] + dy, focal[2] + dz]
            threeRenderer.setCamera([focal, up, newPos])
            break
          }
        }
      },

      getFrontViewCameraInfo(): CameraInfo {
        return cameraInitInfo ?? [[0, 0, 0], [0, 1, 0], [0, 0, 200]]
      },

      getFullscreenRenderer(): ThreeRenderer {
        return threeRenderer
      },

      getFirstVisibleToothModel(): ToothObject | null {
        return teeth.find((t) => t.mainMesh.visible) ?? null
      },

      // ── 文件 I/O ──────────────────────────────────────────────────────────

      getFileBuffer(): string[] {
        return teeth.map((t) => geometryToSTL(t.workGeo, t.name))
      },

      getNowFile(): string[] {
        return teeth.map((t) => geometryToVTP(t.workGeo, t.cellLabels))
      },

      getSingleNowFile(index: number): string {
        const t = teeth[index]
        return geometryToVTP(t.workGeo, t.cellLabels)
      },

      // ── 可视化 ────────────────────────────────────────────────────────────

      addLine(point1: Point3D, point2: Point3D): void {
        const geo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(...point1),
          new THREE.Vector3(...point2),
        ])
        const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffffff }))
        scene.add(line)
        threeRenderer.render()
      },

      toggleLight(): void {
        teeth.forEach((t) => {
          const mat = t.mainMesh.material as THREE.MeshStandardMaterial
          // 通过 roughness 模拟 lighting toggle（关闭光照 → MeshBasicMaterial 效果）
          // 实际上 three.js 没有 setLighting，改用切换材质类型
          if (mat.type === "MeshStandardMaterial") {
            const basicMat = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide })
            t.mainMesh.material = basicMat
          } else {
            const stdMat = new THREE.MeshStandardMaterial({
              vertexColors: true,
              side: THREE.DoubleSide,
              roughness: 0.6,
              metalness: 0.1,
            })
            t.mainMesh.material = stdMat
          }
        })
        threeRenderer.render()
      },

      renderToothOrder(points: ToothOrderPoint[], viewUp: Point3D, modelIdx: number): void {
        const key = modelIdx === 0 ? "up" : "down"

        // 清除旧标注
        for (const name in toothOrders[key]) {
          const obj = toothOrders[key][name]
          if (obj) scene.remove(obj)
          toothOrders[key][name] = null
        }
        textCtx.clearRect(0, 0, textCanvas.width, textCanvas.height)

        // 确定主轴
        let maxIdx = 0
        let maxVal = 0
        for (let i = 0; i < viewUp.length; i++) {
          if (Math.abs(viewUp[i]) > Math.abs(maxVal)) {
            maxVal = viewUp[i]
            maxIdx = i
          }
        }
        const sign = maxVal > 0 ? -1 : 1
        const defaultOffset = modelIdx === 0 ? -10 : 10

        // 绘制 canvas 文字标注
        points.forEach(({ name, coordinate: [p1, p2] }) => {
          const cx = (p1.x + p2.x) / 2
          const cy = (p1.y + p2.y) / 2
          const worldPos: Point3D = [
            cx,
            maxIdx === 1 ? sign * defaultOffset : sign * cy,
            maxIdx === 2 ? sign * defaultOffset : sign * cy,
          ]
          const screenPt = worldToScreen(new THREE.Vector3(...worldPos), camera, container)
          textCtx.font = "14px serif"
          textCtx.fillStyle = "#ffffff"
          textCtx.textAlign = "center"
          textCtx.textBaseline = "middle"
          textCtx.fillText(name, screenPt[0] / DeviceUtils.getDPR(), screenPt[1] / DeviceUtils.getDPR())

          // 添加一个不可见的占位 Object3D 用于跟踪
          const placeholder = new THREE.Object3D()
          placeholder.position.set(...worldPos)
          scene.add(placeholder)
          toothOrders[key][name] = placeholder
        })

        threeRenderer.render()
      },

      addSpline(points: Point3D[], index: number, _normal: Point3D): void {
        if (!splineWidgets[index]) {
          splineWidgets[index] = new SplineWidget(scene, camera, renderer, controls)
        }
        splineWidgets[index]!.addPoints(points)
        threeRenderer.render()
      },

      setSplineWidgetVisible(value: boolean, index: number): void {
        if (!splineWidgets[index]) return
        splineWidgets[index]!.setVisible(value)
        threeRenderer.render()
      },

      addToothWidthLabels(
        type: ToothPosition,
        key: string,
        name: string,
        P1: Point3D,
        P2?: Point3D,
      ): void {
        // 清除旧标注
        const existing = toothWidths[type][key]
        if (existing) {
          existing.meshes.forEach((m) => scene.remove(m))
        }

        const meshes: THREE.Object3D[] = []

        const sphereGeo = new THREE.SphereGeometry(0.5, 8, 8)
        const sphereMat = new THREE.MeshBasicMaterial({ color: 0xffffff })

        const s1 = new THREE.Mesh(sphereGeo.clone(), sphereMat.clone())
        s1.position.set(...P1)
        scene.add(s1)
        meshes.push(s1)

        if (P2) {
          const s2 = new THREE.Mesh(sphereGeo.clone(), sphereMat.clone())
          s2.position.set(...P2)
          scene.add(s2)
          meshes.push(s2)

          const lineGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(...P1),
            new THREE.Vector3(...P2),
          ])
          const line = new THREE.Line(lineGeo, new THREE.LineBasicMaterial({ color: 0xffffff }))
          scene.add(line)
          meshes.push(line)
        }

        toothWidths[type][key] = { meshes, name, points: P2 ? [P1, P2] : [P1] }

        // Canvas 文字标注（在 render 后的 change 事件中更新）
        textCtx.clearRect(0, 0, textCanvas.width, textCanvas.height)

        threeRenderer.render()

        // 绘制文字（render 完成后立即绘制）
        requestAnimationFrame(() => {
          const dpr = DeviceUtils.getDPR()
          const drawLabel = (pt: Point3D) => {
            const sp = worldToScreen(new THREE.Vector3(...pt), camera, container)
            const cx = sp[0] / dpr
            const cy = sp[1] / dpr

            // 背景
            const radius = 10, w = 84, h = 20
            const bx = cx - w / 2, by = cy - h / 2 + 20
            textCtx.beginPath()
            textCtx.moveTo(bx + radius, by)
            textCtx.arcTo(bx + w, by, bx + w, by + h, radius)
            textCtx.arcTo(bx + w, by + h, bx, by + h, radius)
            textCtx.arcTo(bx, by + h, bx, by, radius)
            textCtx.arcTo(bx, by, bx + w, by, radius)
            textCtx.fillStyle = "#ffffff"
            textCtx.fill()
            textCtx.closePath()

            textCtx.font = "12px serif"
            textCtx.fillStyle = "#000"
            textCtx.textAlign = "center"
            textCtx.textBaseline = "middle"
            textCtx.fillText(name, cx, cy + 20)
          }
          drawLabel(P1)
          if (P2) drawLabel(P2)
        })
      },

      // ── 多边形选择（canvas 绘制） ─────────────────────────────────────────
      handlePolygonClick(e: MouseEvent): void {
        if (selectionMode !== EnumSelectionMode.polygon) return
        const [x, y] = getPointerPos(e)
        boundary.push([x, y])
        if (!polygonSelection) polygonSelection = new PolygonSelection(container)
        polygonSelection.update(boundary, false)
      },
    }
  }
})()
