/**
 * SplineWidgets — 样条曲线集合
 *
 * 从 store 读取 splines 数据，渲染可交互控制点和样条曲线
 */

import { useMemo } from "react"
import * as THREE from "three"
import { useToothStore } from "@/stores"
import type { SplineData } from "@/stores"

interface SingleSplineProps {
  data: SplineData
}

function SingleSpline({ data }: SingleSplineProps) {
  const { points, visible } = data

  const lineObject = useMemo(() => {
    if (points.length < 2) return null
    const curve = new THREE.CatmullRomCurve3(
      points.map((p) => new THREE.Vector3(...p)),
      false,
      "catmullrom",
      0.5,
    )
    const pts = curve.getPoints(Math.max(50, points.length * 10))
    const geo = new THREE.BufferGeometry().setFromPoints(pts)
    const mat = new THREE.LineBasicMaterial({ color: 0xff0000 })
    return new THREE.Line(geo, mat)
  }, [points])

  return (
    <group visible={visible}>
      {/* 样条曲线 */}
      {lineObject && <primitive object={lineObject} />}
      {/* 控制点球体 */}
      {points.map((p, i) => (
        <mesh key={i} position={p}>
          <sphereGeometry args={[0.8, 12, 8]} />
          <meshBasicMaterial color={0xff8800} />
        </mesh>
      ))}
    </group>
  )
}

export function SplineWidgets() {
  const splines = useToothStore((s) => s.splines)

  return (
    <>
      {splines.map((spline) => (
        <SingleSpline key={spline.index} data={spline} />
      ))}
    </>
  )
}
