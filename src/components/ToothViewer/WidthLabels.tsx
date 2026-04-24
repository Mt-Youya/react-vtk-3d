/**
 * WidthLabels — 牙齿宽度标注（白色球体 + 连线）
 *
 * 从 store 读取 widthLabels 数据，渲染球体和连线
 * 文字标注由 LabelOverlay 负责（Canvas 2D）
 */

import { useMemo } from "react"
import * as THREE from "three"
import { useToothStore } from "@/stores"

const SPHERE_GEO = new THREE.SphereGeometry(0.5, 8, 8)
const SPHERE_MAT = new THREE.MeshBasicMaterial({ color: 0xffffff })

export function WidthLabels() {
  const widthLabels = useToothStore((s) => s.widthLabels)

  const entries = useMemo(() => {
    const result: Array<{
      key: string
      points: [number, number, number][]
      visible: boolean
      lineObject: THREE.Line | null
    }> = []
    for (const type of ["up", "down"] as const) {
      for (const [key, entry] of Object.entries(widthLabels[type])) {
        const pts = entry.points as [number, number, number][]
        let lineObject: THREE.Line | null = null
        if (pts.length === 2) {
          const geo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(...pts[0]),
            new THREE.Vector3(...pts[1]),
          ])
          lineObject = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xffffff }))
        }
        result.push({ key: `${type}-${key}`, points: pts, visible: entry.visible, lineObject })
      }
    }
    return result
  }, [widthLabels])

  return (
    <>
      {entries.map(({ key, points, visible, lineObject }) => (
        <group key={key} visible={visible}>
          {points.map((p, i) => (
            <mesh
              key={i}
              geometry={SPHERE_GEO}
              material={SPHERE_MAT}
              position={p}
            />
          ))}
          {lineObject && <primitive object={lineObject} />}
        </group>
      ))}
    </>
  )
}
