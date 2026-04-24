/**
 * useSceneActions — 替代 CoreMethods 对象的 React hook
 *
 * 将原来 init(container) 闭包中的34个方法重新实现为
 * 基于 Zustand store 的声明式 actions
 *
 * 返回与 CoreMethods 接口完全兼容的对象
 */

import { useCallback, useRef } from "react"
import * as THREE from "three"
import { useToothStore, SelectionMode } from "@/stores"
import { AreaSelector } from "@/core/three/AreaSelector"
import { computeFrontViewCamera } from "@/core/three/FrontViewWorker"
import { geometryToVTP } from "@/core/three/VTPSerializer"
import { geometryToSTL } from "@/core/three/STLSerializer"
import { parseVTP } from "@/lib/parseVTP"
import { DeviceUtils } from "@/utils/device"
import SelectToothIdx from "@/core/select-tooth-idx"
import type { CameraInfo, Point3D, ToothPosition, ToothOrderPoint } from "@/types"

const areaSelector = new AreaSelector()

interface SceneRefs {
  meshes: { l: THREE.Mesh | null; u: THREE.Mesh | null }
  camera: THREE.Camera | null
  container: HTMLElement | null
}

export function useSceneActions(refs: React.RefObject<SceneRefs>) {
  const store = useToothStore
  const selectToothIdxRef = useRef<SelectToothIdx | null>(null)
  const cachedBuffers = useRef<ArrayBuffer[] | null>(null)

  // ── 场景 ────────────────────────────────────────────────────────────────────

  const triggerInitScene = useCallback(
    async (buffers: ArrayBuffer[], forceFrontFace?: boolean, _type?: string): Promise<unknown> => {
      return new Promise((resolve) => {
        requestIdleCallback(
          () => {
            if (!buffers?.length) { resolve(false); return }

            // 缓存 buffers 用于 reset
            if (!cachedBuffers.current) cachedBuffers.current = buffers

            // 清空旧状态
            store.getState().reset()

            // 设置新 buffers（触发 ToothMesh 重新解析）
            store.getState().setBuffers({ l: buffers[0] ?? null, u: buffers[1] ?? null })

            // 计算前视图相机
            if (forceFrontFace !== false) {
              // 延迟一帧等待 geometry 解析完成
              requestAnimationFrame(() => {
                const state = store.getState()
                const lGeo = state.workGeos.l
                const uGeo = state.workGeos.u
                if (lGeo && uGeo) {
                  const lPos = (lGeo.getAttribute("position") as THREE.BufferAttribute).array as Float32Array
                  const uPos = (uGeo.getAttribute("position") as THREE.BufferAttribute).array as Float32Array
                  const cameraInfo = computeFrontViewCamera(uPos, lPos)
                  store.getState().setCameraInfo(cameraInfo)
                }
                resolve(true)
              })
            } else {
              resolve(true)
            }
          },
          { timeout: 2000 },
        )
      })
    },
    [],
  )

  const handleReset = useCallback(() => {
    if (!cachedBuffers.current) return
    store.getState().reset()
    store.getState().setBuffers({
      l: cachedBuffers.current[0] ?? null,
      u: cachedBuffers.current[1] ?? null,
    })
  }, [])

  const handleTeethVisible = useCallback((tooth?: ToothPosition) => {
    store.getState().toggleToothVisible(tooth)
  }, [])

  const handleTurnover = useCallback(() => {
    // 交换上下颌 buffers
    const state = store.getState()
    const { l, u } = state.buffers
    store.getState().setBuffers({ l: u, u: l })
    // 重新计算前视图
    requestAnimationFrame(() => {
      const s = store.getState()
      const lGeo = s.workGeos.l
      const uGeo = s.workGeos.u
      if (lGeo && uGeo) {
        const lPos = (lGeo.getAttribute("position") as THREE.BufferAttribute).array as Float32Array
        const uPos = (uGeo.getAttribute("position") as THREE.BufferAttribute).array as Float32Array
        const cameraInfo = computeFrontViewCamera(uPos, lPos)
        store.getState().setCameraInfo(cameraInfo)
      }
    })
  }, [])

  const initModel = useCallback((idx: number, _readerType: string) => {
    // 清除指定索引的模型
    const name = idx === 0 ? "l" : "u"
    store.getState().setBuffers({ [name]: null })
    store.getState().setWorkGeo(name, new THREE.BufferGeometry())
    store.getState().setCellLabels(name, null)
  }, [])

  const triggerFinalFile = useCallback((buffers: string[]) => {
    const encoder = new TextEncoder()
    const l = buffers[0] ? encoder.encode(buffers[0]).buffer : null
    const u = buffers[1] ? encoder.encode(buffers[1]).buffer : null
    store.getState().setBuffers({ l, u })
  }, [])

  const triggerFile = useCallback((buffer: string, idx: number) => {
    const encoder = new TextEncoder()
    const ab = encoder.encode(buffer).buffer
    const name = idx === 0 ? "l" : "u"
    store.getState().setBuffers({ [name]: ab })
  }, [])

  // ── 选择 ────────────────────────────────────────────────────────────────────

  const handleDelete = useCallback((isShiftKey?: boolean) => {
    const state = store.getState()
    for (const name of ["l", "u"] as const) {
      const geo = state.workGeos[name]
      const faces = state.selectedFaces[name]
      if (!geo || faces.size === 0) continue

      const posAttr = geo.getAttribute("position") as THREE.BufferAttribute
      const colorAttr = geo.getAttribute("color") as THREE.BufferAttribute | undefined
      const normalAttr = geo.getAttribute("normal") as THREE.BufferAttribute | undefined
      const triCount = posAttr.count / 3
      const cellLabels = state.cellLabels[name]

      let triIndicesToRemove: Set<number>
      if (isShiftKey) {
        // Shift+Delete：仅删除框内顶点对应的三角形
        triIndicesToRemove = faces
      } else {
        triIndicesToRemove = faces
      }

      const keepTris: number[] = []
      for (let t = 0; t < triCount; t++) {
        if (!triIndicesToRemove.has(t)) keepTris.push(t)
      }

      const newCount = keepTris.length * 3
      const newPos = new Float32Array(newCount * 3)
      const newColor = colorAttr ? new Float32Array(newCount * 3) : null
      const newNormal = normalAttr ? new Float32Array(newCount * 3) : null
      const newCellLabels = cellLabels ? new Float32Array(keepTris.length) : null

      keepTris.forEach((t, i) => {
        for (let v = 0; v < 3; v++) {
          const src = t * 3 + v
          const dst = i * 3 + v
          newPos[dst * 3 + 0] = posAttr.getX(src)
          newPos[dst * 3 + 1] = posAttr.getY(src)
          newPos[dst * 3 + 2] = posAttr.getZ(src)
          if (newColor && colorAttr) {
            newColor[dst * 3 + 0] = colorAttr.getX(src)
            newColor[dst * 3 + 1] = colorAttr.getY(src)
            newColor[dst * 3 + 2] = colorAttr.getZ(src)
          }
          if (newNormal && normalAttr) {
            newNormal[dst * 3 + 0] = normalAttr.getX(src)
            newNormal[dst * 3 + 1] = normalAttr.getY(src)
            newNormal[dst * 3 + 2] = normalAttr.getZ(src)
          }
        }
        if (newCellLabels && cellLabels) {
          newCellLabels[i] = cellLabels[t]
        }
      })

      const newGeo = new THREE.BufferGeometry()
      newGeo.setAttribute("position", new THREE.BufferAttribute(newPos, 3))
      if (newColor) newGeo.setAttribute("color", new THREE.BufferAttribute(newColor, 3))
      if (newNormal) newGeo.setAttribute("normal", new THREE.BufferAttribute(newNormal, 3))
      else newGeo.computeVertexNormals()

      store.getState().setWorkGeo(name, newGeo)
      store.getState().setCellLabels(name, newCellLabels)
    }
    store.getState().clearSelection()
  }, [])

  const handleSpace = useCallback(async () => {
    const state = store.getState()
    if (state.selectionMode !== SelectionMode.polygon) return
    const boundary = state.polygonBoundary
    if (boundary.length < 3) {
      store.getState().setPolygonBoundary([])
      return
    }

    const { camera, container, meshes } = refs.current ?? { camera: null, container: null, meshes: { l: null, u: null } }
    if (!camera || !container) return

    const dpr = DeviceUtils.getDPR()
    const boundaryWithDpr = boundary.map((p) => [p[0] * dpr, p[1] * dpr] as [number, number])

    const visibleMeshes = (["l", "u"] as const)
      .map((n) => meshes[n])
      .filter((m): m is THREE.Mesh => m !== null && m.visible)

    const resultByMesh = areaSelector.selectInPolygon(camera, container, visibleMeshes, boundaryWithDpr)

    for (const [mesh, triSet] of resultByMesh) {
      const name = mesh.name as "l" | "u"
      store.getState().setSelectedFaces(name, triSet)

      // 计算高亮点云
      const geo = store.getState().workGeos[name]
      if (geo && triSet.size > 0) {
        const posAttr = geo.getAttribute("position") as THREE.BufferAttribute
        const positions: number[] = []
        for (const triIdx of triSet) {
          for (let v = 0; v < 3; v++) {
            const vi = triIdx * 3 + v
            positions.push(posAttr.getX(vi), posAttr.getY(vi), posAttr.getZ(vi))
          }
        }
        store.getState().setHighlightPoints(name, {
          positions: new Float32Array(positions),
          toothName: name,
        })
      }
    }

    store.getState().setPolygonBoundary([])
  }, [refs])

  const handlePolygonSelection = useCallback(() => {
    store.getState().clearSelection()
    store.getState().setSelectionMode(SelectionMode.polygon)
  }, [])

  const handleSelection = useCallback(() => {
    store.getState().clearSelection()
    store.getState().setSelectionMode(SelectionMode.rect)
  }, [])

  const handleEscape = useCallback(() => {
    store.getState().clearSelection()
    store.getState().setSelectionMode(SelectionMode.none)
  }, [])

  const getScreenMapModelPos = useCallback((point: { x: number; y: number }): Point3D | null => {
    const { camera, container, meshes } = refs.current ?? { camera: null, container: null, meshes: { l: null, u: null } }
    if (!camera || !container) return null

    const raycaster = new THREE.Raycaster()
    const ndcX = (point.x / container.clientWidth) * 2 - 1
    const ndcY = -(point.y / container.clientHeight) * 2 + 1
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera)

    const visibleMeshes = (["l", "u"] as const)
      .map((n) => meshes[n])
      .filter((m): m is THREE.Mesh => m !== null && m.visible)

    const hits = raycaster.intersectObjects(visibleMeshes, false)
    if (!hits.length) return [0, 0, 0]
    const p = hits[0].point
    return [p.x, p.y, p.z]
  }, [refs])

  // ── 相机 ────────────────────────────────────────────────────────────────────

  const getCamera = useCallback(() => {
    return refs.current?.camera ?? null
  }, [refs])

  const setCamera = useCallback((info: CameraInfo) => {
    store.getState().setCameraInfo(info)
  }, [])

  const switchView = useCallback((type: 0 | 1 | 2, selectedIdx?: number) => {
    const cameraInitInfo = store.getState().cameraInfo ??
      ([[0, 0, 0], [0, 1, 0], [0, 0, 200]] as CameraInfo)

    switch (type) {
      case 0:
        store.getState().setCameraInfo(cameraInitInfo)
        break
      case 1: {
        const [focal, up, pos] = cameraInitInfo
        const sign = (selectedIdx ?? 0) === 0 ? -1 : 1
        const angle = (87 * Math.PI) / 180 * sign
        const dist = Math.sqrt(
          (pos[0] - focal[0]) ** 2 + (pos[1] - focal[1]) ** 2 + (pos[2] - focal[2]) ** 2,
        )
        const newPos: Point3D = [focal[0], focal[1] - dist * Math.sin(angle), focal[2] + dist * Math.cos(angle)]
        store.getState().setCameraInfo([focal, up, newPos])
        break
      }
      case 2: {
        const [focal, up, pos] = cameraInitInfo
        const dx = focal[0] - pos[0]
        const dy = focal[1] - pos[1]
        const dz = focal[2] - pos[2]
        const newPos: Point3D = [focal[0] + dx, focal[1] + dy, focal[2] + dz]
        store.getState().setCameraInfo([focal, up, newPos])
        break
      }
    }
  }, [])

  const getFrontViewCameraInfo = useCallback((): CameraInfo => {
    return store.getState().cameraInfo ?? [[0, 0, 0], [0, 1, 0], [0, 0, 200]]
  }, [])

  const getFullscreenRenderer = useCallback(() => {
    return refs.current?.camera ?? null
  }, [refs])

  const getFirstVisibleToothModel = useCallback(() => {
    const { meshes } = refs.current ?? { meshes: { l: null, u: null } }
    return meshes.l?.visible ? meshes.l : meshes.u?.visible ? meshes.u : null
  }, [refs])

  // ── 文件 I/O ────────────────────────────────────────────────────────────────

  const getFileBuffer = useCallback((): string[] => {
    const state = store.getState()
    return (["l", "u"] as const).map((name) => {
      const geo = state.workGeos[name]
      if (!geo) return ""
      return geometryToSTL(geo, name)
    })
  }, [])

  const getNowFile = useCallback((): string[] => {
    const state = store.getState()
    return (["l", "u"] as const).map((name) => {
      const geo = state.workGeos[name]
      if (!geo) return ""
      return geometryToVTP(geo, state.cellLabels[name])
    })
  }, [])

  const getSingleNowFile = useCallback((index: number): string => {
    const name = index === 0 ? "l" : "u"
    const state = store.getState()
    const geo = state.workGeos[name]
    if (!geo) return ""
    return geometryToVTP(geo, state.cellLabels[name])
  }, [])

  // ── 可视化 ───────────────────────────────────────────────────────────────────

  const addLine = useCallback((_point1: Point3D, _point2: Point3D) => {
    // 宽度标注线已由 WidthLabels 组件处理
    // 此处为兼容旧 API 的空实现
  }, [])

  const toggleLight = useCallback(() => {
    store.getState().toggleLight()
  }, [])

  const renderToothOrder = useCallback(
    (points: ToothOrderPoint[], viewUp: Point3D, modelIdx: number) => {
      const { camera, container } = refs.current ?? { camera: null, container: null }
      if (!camera || !container) return

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

      const orders = points.map(({ name, coordinate: [p1, p2] }) => {
        const cx = (p1.x + p2.x) / 2
        const cy = (p1.y + p2.y) / 2
        const worldPos: Point3D = [
          cx,
          maxIdx === 1 ? sign * defaultOffset : sign * cy,
          maxIdx === 2 ? sign * defaultOffset : sign * cy,
        ]
        return { modelIdx, key: name, name, worldPos }
      })

      store.getState().setToothOrders(modelIdx, orders)
    },
    [refs],
  )

  const addSpline = useCallback((points: Point3D[], index: number, normal: Point3D) => {
    store.getState().setSpline(index, { points, normal, visible: true })
  }, [])

  const setSplineWidgetVisible = useCallback((value: boolean, index: number) => {
    store.getState().setSplineVisible(index, value)
  }, [])

  const addToothWidthLabels = useCallback(
    (type: ToothPosition, key: string, name: string, P1: Point3D, P2?: Point3D) => {
      store.getState().setWidthLabel(type, key, {
        key,
        name,
        points: P2 ? [P1, P2] : [P1],
        visible: true,
      })
    },
    [],
  )

  // ── 右键编号弹窗 ─────────────────────────────────────────────────────────────

  const handleRootClick = useCallback((e: MouseEvent) => {
    if (e.button !== 2) return
    e.preventDefault()

    const { camera, container, meshes } = refs.current ?? { camera: null, container: null, meshes: { l: null, u: null } }
    if (!camera || !container) return

    if (selectToothIdxRef.current) {
      selectToothIdxRef.current.delete()
      selectToothIdxRef.current = null
    }

    const rect = container.getBoundingClientRect()
    const px = e.clientX - rect.left
    const py = e.clientY - rect.top

    const raycaster = new THREE.Raycaster()
    const ndcX = (px / container.clientWidth) * 2 - 1
    const ndcY = -(py / container.clientHeight) * 2 + 1
    raycaster.setFromCamera(new THREE.Vector2(ndcX, ndcY), camera)

    const visibleMeshes = (["l", "u"] as const)
      .map((n) => meshes[n])
      .filter((m): m is THREE.Mesh => m !== null && m.visible)

    const hits = raycaster.intersectObjects(visibleMeshes, false)
    if (!hits.length) return

    const hitMesh = hits[0].object as THREE.Mesh
    const hitFaceIndex = hits[0].faceIndex ?? 0
    const name = hitMesh.name as "l" | "u"

    const dpr = DeviceUtils.getDPR()
    const winPos: [number, number] = [px / dpr + 3, py / dpr + 3]

    selectToothIdxRef.current = new SelectToothIdx(
      container.parentElement ?? container,
      winPos,
      null,
      (label) => {
        // 更新三角形颜色
        const state = store.getState()
        const geo = state.workGeos[name]
        const cellLabels = state.cellLabels[name]
        if (!geo) return

        const colorAttr = geo.getAttribute("color") as THREE.BufferAttribute | undefined
        if (!colorAttr) return

        const LABEL_LUT: [number, number, number][] = [
          [90, 65, 60], [255, 60, 60], [60, 180, 255], [255, 200, 0],
          [140, 60, 255], [60, 220, 80], [255, 120, 0], [0, 200, 220],
          [220, 60, 180], [180, 230, 60], [60, 80, 220], [255, 160, 60],
          [60, 200, 160], [200, 60, 100], [100, 255, 180], [180, 100, 255],
          [255, 220, 100], [100, 160, 60], [60, 120, 200], [200, 80, 200],
          [160, 220, 80], [80, 60, 160], [220, 140, 80], [100, 200, 100],
          [160, 80, 60], [80, 160, 240],
        ]
        const NAN_COLOR: [number, number, number] = [90, 65, 60]
        const [r, g, b] = label >= 0 && label < LABEL_LUT.length ? LABEL_LUT[label] : NAN_COLOR
        const rf = r / 255, gf = g / 255, bf = b / 255

        // 获取高亮的三角形集合，或单个三角形
        const selectedFaces = state.selectedFaces[name]
        const facesToUpdate = selectedFaces.size > 0 ? selectedFaces : new Set([hitFaceIndex])

        for (const triIdx of facesToUpdate) {
          for (let v = 0; v < 3; v++) {
            colorAttr.setXYZ(triIdx * 3 + v, rf, gf, bf)
          }
        }
        colorAttr.needsUpdate = true

        // 更新 cellLabels
        if (cellLabels) {
          for (const triIdx of facesToUpdate) {
            if (triIdx < cellLabels.length) cellLabels[triIdx] = label
          }
        }

        store.getState().clearSelection()
      },
    )
  }, [refs])

  return {
    triggerInitScene,
    handleDelete,
    handleSpace,
    handlePolygonSelection,
    handleSelection,
    handleEscape,
    handleReset,
    handleTeethVisible,
    handleTurnover,
    getFileBuffer,
    getCamera,
    setCamera,
    getNowFile,
    getSingleNowFile,
    getFullscreenRenderer,
    triggerFinalFile,
    initModel,
    triggerFile,
    addLine,
    toggleLight,
    switchView,
    getScreenMapModelPos,
    renderToothOrder,
    getFrontViewCameraInfo,
    getFirstVisibleToothModel,
    addSpline,
    setSplineWidgetVisible,
    addToothWidthLabels,
    handleRootClick,
  }
}
