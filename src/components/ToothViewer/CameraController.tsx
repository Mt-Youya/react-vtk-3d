/**
 * CameraController — 相机同步控制器
 *
 * 监听 store 中的 cameraInfo，同步到 R3F 相机和 OrbitControls
 * 使用 useFrame 检测相机变化并更新 store
 */

import { useEffect, useRef } from "react"
import { useThree } from "@react-three/fiber"
import { useToothStore } from "@/stores"

// OrbitControls 的最小接口（避免 three-stdlib 直接依赖）
interface OrbitControlsLike {
  target: { set: (x: number, y: number, z: number) => void }
  update: () => void
}

interface CameraControllerProps {
  controlsRef: React.RefObject<OrbitControlsLike | null>
}

export function CameraController({ controlsRef }: CameraControllerProps) {
  const { camera } = useThree()
  const cameraInfo = useToothStore((s) => s.cameraInfo)
  const cameraVersion = useToothStore((s) => s.cameraVersion)
  const prevVersion = useRef(-1)

  // 当 store 中相机信息更新时，同步到 R3F 相机
  useEffect(() => {
    if (!cameraInfo || cameraVersion === prevVersion.current) return
    prevVersion.current = cameraVersion

    const [focalPoint, viewUp, position] = cameraInfo
    camera.position.set(...position)
    camera.up.set(...viewUp)

    const controls = controlsRef.current
    if (controls) {
      controls.target.set(...focalPoint)
      controls.update()
    }
  }, [cameraInfo, cameraVersion, camera, controlsRef])

  return null
}
