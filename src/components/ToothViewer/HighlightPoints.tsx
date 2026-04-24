/**
 * HighlightPoints — 选中三角形的青色高亮点云
 *
 * 从 store 读取 highlightPoints 数据，渲染 THREE.Points
 */

import { useMemo } from "react"
import * as THREE from "three"
import { useToothStore } from "@/stores"

export function HighlightPoints() {
  const hlL = useToothStore((s) => s.highlightPoints.l)
  const hlU = useToothStore((s) => s.highlightPoints.u)

  const geoL = useMemo(() => {
    if (!hlL || hlL.positions.length === 0) return null
    const geo = new THREE.BufferGeometry()
    geo.setAttribute("position", new THREE.BufferAttribute(hlL.positions, 3))
    return geo
  }, [hlL])

  const geoU = useMemo(() => {
    if (!hlU || hlU.positions.length === 0) return null
    const geo = new THREE.BufferGeometry()
    geo.setAttribute("position", new THREE.BufferAttribute(hlU.positions, 3))
    return geo
  }, [hlU])

  const material = useMemo(
    () =>
      new THREE.PointsMaterial({
        color: 0x00ffff,
        size: 2,
        sizeAttenuation: false,
      }),
    [],
  )

  return (
    <>
      {geoL && <points geometry={geoL} material={material} />}
      {geoU && <points geometry={geoU} material={material} />}
    </>
  )
}
