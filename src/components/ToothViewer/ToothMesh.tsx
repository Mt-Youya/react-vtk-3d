"use no memo"
/**
 * ToothMesh — 牙齿 3D 网格组件
 *
 * 自动检测 buffer 格式：
 *   - GLB（magic: "glTF"）→ GLTFLoader，直接使用模型中的顶点颜色
 *   - VTP（其他）         → parseVTPWithVTKLoader，使用 LABEL_LUT 颜色
 */

import { useEffect, useState, forwardRef } from "react"
import * as THREE from "three"
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js"
import { useToothStore } from "@/stores"
import { parseVTPWithVTKLoader } from "@/lib/VTKLoader"

interface ToothMeshProps {
  name: "l" | "u"
  onMeshReady?: (mesh: THREE.Mesh) => void
}

/** 检测 ArrayBuffer 是否为 GLB 格式（magic bytes: 0x46546C67 = "glTF"） */
function isGLB(buffer: ArrayBuffer): boolean {
  const view = new DataView(buffer)
  return view.getUint32(0, true) === 0x46546c67 // "glTF" little-endian
}

/** 从 GLB buffer 解析出第一个 BufferGeometry（保留顶点颜色） */
async function parseGLB(buffer: ArrayBuffer): Promise<THREE.BufferGeometry> {
  return new Promise((resolve, reject) => {
    const loader = new GLTFLoader()
    loader.parse(
      buffer,
      "",
      (gltf) => {
        let geo: THREE.BufferGeometry | null = null
        gltf.scene.traverse((obj) => {
          if (!geo && obj instanceof THREE.Mesh) {
            geo = (obj as THREE.Mesh).geometry.clone()
          }
        })
        if (geo) {
          resolve(geo)
        } else {
          reject(new Error("GLB 中未找到 Mesh"))
        }
      },
      reject,
    )
  })
}

export const ToothMesh = forwardRef<THREE.Mesh, ToothMeshProps>(function ToothMesh(
  { name, onMeshReady },
  ref,
) {
  const buffer = useToothStore((s) => s.buffers[name])
  const lightEnabled = useToothStore((s) => s.lightEnabled)
  const visible = useToothStore((s) => s.toothVisible[name])

  const [geometry, setGeometry] = useState<THREE.BufferGeometry | null>(null)
  const [isGlb, setIsGlb] = useState(false)

  // buffer 变化时解析
  useEffect(() => {
    if (!buffer) {
      setGeometry(null)
      setIsGlb(false)
      return
    }

    if (isGLB(buffer)) {
      // ── GLB 路径 ────────────────────────────────────────────────────────────
      setIsGlb(true)
      parseGLB(buffer).then((geo) => {
        geo.computeVertexNormals()
        setGeometry(geo)
        // GLB 已有顶点颜色，不需要写入 store 的 parseResult
      }).catch((e) => {
        console.error("GLB 解析失败", e)
        setGeometry(null)
      })
    } else {
      // ── VTP 路径 ────────────────────────────────────────────────────────────
      setIsGlb(false)
      const result = parseVTPWithVTKLoader(buffer)
      const geo = new THREE.BufferGeometry()
      geo.setAttribute("position", new THREE.BufferAttribute(result.positions, 3))
      if (result.colors) {
        geo.setAttribute("color", new THREE.BufferAttribute(result.colors, 3))
      }
      geo.computeVertexNormals()
      setGeometry(geo)
      useToothStore.getState().setParseAndWorkGeo(name, result, geo, result.cellLabels)
    }
  }, [buffer, name])

  // 材质
  const [material, setMaterial] = useState<THREE.Material>(() =>
    lightEnabled
      ? new THREE.MeshStandardMaterial({
          vertexColors: true,
          side: THREE.DoubleSide,
          roughness: 0.6,
          metalness: 0.1,
        })
      : new THREE.MeshBasicMaterial({
          vertexColors: true,
          side: THREE.DoubleSide,
        }),
  )

  useEffect(() => {
    const mat = lightEnabled
      ? new THREE.MeshStandardMaterial({
          vertexColors: true,
          side: THREE.DoubleSide,
          roughness: 0.6,
          metalness: 0.1,
        })
      : new THREE.MeshBasicMaterial({
          vertexColors: true,
          side: THREE.DoubleSide,
        })
    setMaterial(mat)
    return () => {
      mat.dispose()
    }
  }, [lightEnabled])

  // 通知父组件 mesh 就绪
  useEffect(() => {
    if (ref && typeof ref !== "function" && ref.current && onMeshReady) {
      onMeshReady(ref.current)
    }
  })

  if (!geometry) return null

  return (
    <mesh
      ref={ref}
      geometry={geometry}
      material={material}
      visible={visible}
      name={name}
    />
  )
})
