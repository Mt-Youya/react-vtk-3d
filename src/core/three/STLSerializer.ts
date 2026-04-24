import * as THREE from "three"

/**
 * 将 BufferGeometry（non-indexed）序列化为 STL ASCII 字符串
 * 替代 vtkSTLWriter
 */
export function geometryToSTL(geo: THREE.BufferGeometry, name = "mesh"): string {
  const posAttr = geo.getAttribute("position") as THREE.BufferAttribute
  const normalAttr = geo.getAttribute("normal") as THREE.BufferAttribute | undefined
  const nTris = posAttr.count / 3

  const lines: string[] = [`solid ${name}`]

  const v = new THREE.Vector3()
  const v0 = new THREE.Vector3()
  const v1 = new THREE.Vector3()
  const v2 = new THREE.Vector3()
  const n = new THREE.Vector3()

  for (let t = 0; t < nTris; t++) {
    const base = t * 3
    v0.fromBufferAttribute(posAttr, base)
    v1.fromBufferAttribute(posAttr, base + 1)
    v2.fromBufferAttribute(posAttr, base + 2)

    if (normalAttr) {
      n.fromBufferAttribute(normalAttr, base)
    } else {
      // 计算面法线
      v.crossVectors(v1.clone().sub(v0), v2.clone().sub(v0)).normalize()
      n.copy(v)
    }

    lines.push(`  facet normal ${n.x} ${n.y} ${n.z}`)
    lines.push(`    outer loop`)
    lines.push(`      vertex ${v0.x} ${v0.y} ${v0.z}`)
    lines.push(`      vertex ${v1.x} ${v1.y} ${v1.z}`)
    lines.push(`      vertex ${v2.x} ${v2.y} ${v2.z}`)
    lines.push(`    endloop`)
    lines.push(`  endfacet`)
  }

  lines.push(`endsolid ${name}`)
  return lines.join("\n")
}
