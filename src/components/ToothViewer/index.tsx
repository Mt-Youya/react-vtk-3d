/**
 * ToothViewer — 主 R3F 场景组件
 *
 * 替代 init(container: HTMLElement) 的完整声明式实现
 * 包含：Canvas、OrbitControls、牙齿网格、高亮点云、样条曲线、标注
 */

import { useRef, useEffect, forwardRef, useImperativeHandle } from "react"
import * as THREE from "three"
import { Canvas, useThree } from "@react-three/fiber"
import { OrbitControls } from "@react-three/drei"
import { ToothMesh } from "./ToothMesh"
import { HighlightPoints } from "./HighlightPoints"
import { SplineWidgets } from "./SplineWidgets"
import { WidthLabels } from "./WidthLabels"
import { CameraController } from "./CameraController"
import { SelectionOverlayCanvas } from "./SelectionOverlay"
import { LabelOverlay } from "./LabelOverlay"
import { useSceneActions } from "./useSceneActions"
import { useToothStore, SelectionMode, useCoreStore } from "@/stores"
import type { CoreMethods } from "@/types"

// OrbitControls 的最小接口（避免 three-stdlib 直接依赖）
interface OrbitControlsLike {
  target: { set: (x: number, y: number, z: number) => void }
  update: () => void
  enabled: boolean
}

// ── 内部场景组件（在 Canvas context 内） ────────────────────────────────────

export interface SceneRefs {
  meshes: { l: THREE.Mesh | null; u: THREE.Mesh | null }
  camera: THREE.Camera | null
  container: HTMLElement | null
}

interface InnerSceneProps {
  sceneRefsRef: React.MutableRefObject<SceneRefs>
  controlsRef: React.MutableRefObject<OrbitControlsLike | null>
}

function InnerScene({ sceneRefsRef, controlsRef }: InnerSceneProps) {
  const { camera, gl } = useThree()
  const meshLRef = useRef<THREE.Mesh>(null)
  const meshURef = useRef<THREE.Mesh>(null)
  const selectionMode = useToothStore((s) => s.selectionMode)

  // 每帧同步相机和网格 refs 到 sceneRefsRef
  useEffect(() => {
    sceneRefsRef.current.camera = camera
    sceneRefsRef.current.container = gl.domElement.parentElement as HTMLElement
  })

  useEffect(() => {
    sceneRefsRef.current.meshes.l = meshLRef.current
    sceneRefsRef.current.meshes.u = meshURef.current
  })

  return (
    <>
      {/* 光照 */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[1, 2, 3]} intensity={0.8} />

      {/* 牙齿网格 */}
      <ToothMesh name="l" ref={meshLRef} />
      <ToothMesh name="u" ref={meshURef} />

      {/* 高亮点云 */}
      <HighlightPoints />

      {/* 样条曲线 */}
      <SplineWidgets />

      {/* 宽度标注球体和连线 */}
      <WidthLabels />

      {/* 轨道控制（禁用 damping 避免无限循环） */}
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <OrbitControls
        ref={controlsRef as any}
        enableDamping={false}
        enabled={selectionMode === SelectionMode.none}
      />

      {/* 相机控制器 */}
      <CameraController controlsRef={controlsRef} />
    </>
  )
}

// ── LabelOverlay 包装器（解决首次渲染时相机未就绪问题） ──────────────────────

interface LabelOverlayWrapperProps {
  sceneRefsRef: React.MutableRefObject<SceneRefs>
  containerRef: React.MutableRefObject<HTMLDivElement | null>
}

function LabelOverlayWrapper({ sceneRefsRef, containerRef }: LabelOverlayWrapperProps) {
  // 订阅 cameraVersion 和 widthLabels 变化，触发重渲染
  useToothStore((s) => s.cameraVersion)
  useToothStore((s) => s.widthLabels)
  const camera = sceneRefsRef.current?.camera

  if (!camera) return null

  return (
    <LabelOverlay
      camera={camera}
      containerRef={containerRef as React.RefObject<HTMLDivElement>}
    />
  )
}

// ── 主组件 ───────────────────────────────────────────────────────────────────

export interface ToothViewerHandle {
  getActions(): ReturnType<typeof useSceneActions>
}

interface ToothViewerProps {
  className?: string
  style?: React.CSSProperties
}

export const ToothViewer = forwardRef<ToothViewerHandle, ToothViewerProps>(
  function ToothViewer({ className, style }, ref) {
    const containerRef = useRef<HTMLDivElement | null>(null)
    const controlsRef = useRef<OrbitControlsLike | null>(null)
    const sceneRefsRef = useRef<SceneRefs>({
      meshes: { l: null, u: null },
      camera: null,
      container: null,
    })

    const actions = useSceneActions(sceneRefsRef)
    const setCoreMethods = useCoreStore((s) => s.setCoreMethods)

    // 挂载后将 actions 注入 useCoreStore，兼容 Header/Card 等组件
    useEffect(() => {
      setCoreMethods(actions as unknown as CoreMethods)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // 暴露 actions 给父组件
    useImperativeHandle(ref, () => ({
      getActions: () => actions,
    }))

    return (
      <div
        ref={containerRef}
        className={className}
        style={{ position: "relative", width: "100%", height: "100%", ...style }}
      >
        <Canvas
          gl={{ antialias: true }}
          camera={{ fov: 45, near: 0.1, far: 10000, position: [0, 0, 200] }}
          onCreated={({ gl }) => {
            gl.setPixelRatio(window.devicePixelRatio)
            gl.outputColorSpace = THREE.SRGBColorSpace
          }}
          style={{ background: "#1a1a1a" }}
        >
          <InnerScene sceneRefsRef={sceneRefsRef} controlsRef={controlsRef} />
        </Canvas>

        {/* 选择框 overlay（框选/多边形） */}
        <SelectionOverlayCanvas
          meshRefs={sceneRefsRef.current.meshes}
          containerRef={containerRef as React.RefObject<HTMLDivElement | null>}
          sceneRefsRef={sceneRefsRef}
        />

        {/* 文字标注 overlay */}
        <LabelOverlayWrapper sceneRefsRef={sceneRefsRef} containerRef={containerRef} />
      </div>
    )
  },
)
