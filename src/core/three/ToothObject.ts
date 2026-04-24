import * as THREE from "three"
import { parseVTP } from "@/lib/VTKLoader"

/** 与 VTKLoader.ts 中的 LABEL_LUT 完全一致（26 色） */
const LABEL_LUT: [number, number, number][] = [
  [90, 65, 60],   // 0  牙龈  - 深褐灰
  [255, 60, 60],  // 1        - 红
  [60, 180, 255], // 2        - 天蓝
  [255, 200, 0],  // 3        - 金黄
  [140, 60, 255], // 4        - 紫
  [60, 220, 80],  // 5        - 绿
  [255, 120, 0],  // 6        - 橙
  [0, 200, 220],  // 7        - 青
  [220, 60, 180], // 8        - 玫红
  [180, 230, 60], // 9        - 黄绿
  [60, 80, 220],  // 10       - 深蓝
  [255, 160, 60], // 11       - 浅橙
  [60, 200, 160], // 12       - 绿松石
  [200, 60, 100], // 13       - 深玫红
  [100, 255, 180],// 14       - 薄荷绿
  [180, 100, 255],// 15       - 淡紫
  [255, 220, 100],// 16
  [100, 160, 60], // 17
  [60, 120, 200], // 18
  [200, 80, 200], // 19
  [160, 220, 80], // 20
  [80, 60, 160],  // 21
  [220, 140, 80], // 22
  [100, 200, 100],// 23
  [160, 80, 60],  // 24
  [80, 160, 240], // 25
]

const NAN_COLOR: [number, number, number] = [90, 65, 60]

function labelToRGB(label: number): [number, number, number] {
  const idx = Math.round(label)
  return idx >= 0 && idx < LABEL_LUT.length ? LABEL_LUT[idx] : NAN_COLOR
}

export type Point2D = [number, number]
export type Point3D = [number, number, number]

/**
 * 牙齿模型对象
 * 替代 toothModel.ts（vtk.js）
 *
 * 包含：
 *   mainMesh     — 主显示网格（vertexColors）
 *   wireMesh     — 绿色线框
 *   highlightPoints — 青色高亮点云
 */
export class ToothObject {
  name: string // "l" | "u"

  mainMesh: THREE.Mesh
  wireMesh: THREE.LineSegments
  highlightPoints: THREE.Points

  /** 工作几何（可被雕刻修改） */
  workGeo: THREE.BufferGeometry = new THREE.BufferGeometry()
  /** 原始几何（用于 reset） */
  baseGeo: THREE.BufferGeometry = new THREE.BufferGeometry()

  /** 每个三角形的 label 值（与 VTKLoader 的 cellLabels 对应） */
  cellLabels: Float32Array | null = null

  constructor(name: string) {
    this.name = name

    // 主网格
    this.mainMesh = new THREE.Mesh(
      this.workGeo,
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        side: THREE.DoubleSide,
        roughness: 0.6,
        metalness: 0.1,
      }),
    )
    this.mainMesh.name = name

    // 线框
    this.wireMesh = new THREE.LineSegments(
      new THREE.WireframeGeometry(this.workGeo),
      new THREE.LineBasicMaterial({ color: 0x006600, transparent: true, opacity: 0.3 }),
    )
    this.wireMesh.visible = false

    // 高亮点云
    this.highlightPoints = new THREE.Points(
      new THREE.BufferGeometry(),
      new THREE.PointsMaterial({ color: 0x00ffff, size: 2, sizeAttenuation: false }),
    )
  }

  /** 从 VTP ArrayBuffer 加载 */
  async loadVTP(buffer: ArrayBuffer): Promise<void> {
    const { positions, normals, colors } = await parseVTP(buffer)
    this._buildGeometry(positions, normals, colors, null)
  }

  /** 从已解析的数组数据加载（供 STL 路径使用） */
  loadFromArrays(
    positions: Float32Array,
    normals: Float32Array | null,
    colors: Float32Array | null,
    cellLabels: Float32Array | null,
  ): void {
    this._buildGeometry(positions, normals, colors, cellLabels)
  }

  private _buildGeometry(
    positions: Float32Array,
    normals: Float32Array | null,
    colors: Float32Array | null,
    cellLabels: Float32Array | null,
  ): void {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute("position", new THREE.BufferAttribute(positions.slice(), 3))
    if (normals) {
      geo.setAttribute("normal", new THREE.BufferAttribute(normals.slice(), 3))
    } else {
      geo.computeVertexNormals()
    }

    // 颜色：优先使用传入的 colors，否则用 cellLabels 生成
    let colorData = colors
    if (!colorData && cellLabels) {
      const triCount = positions.length / 9
      colorData = new Float32Array(triCount * 9)
      for (let t = 0; t < triCount; t++) {
        const label = t < cellLabels.length ? cellLabels[t] : -1
        const [r, g, b] = labelToRGB(label)
        const rf = r / 255, gf = g / 255, bf = b / 255
        const base = t * 9
        colorData[base + 0] = rf; colorData[base + 1] = gf; colorData[base + 2] = bf
        colorData[base + 3] = rf; colorData[base + 4] = gf; colorData[base + 5] = bf
        colorData[base + 6] = rf; colorData[base + 7] = gf; colorData[base + 8] = bf
      }
    }
    if (colorData) {
      geo.setAttribute("color", new THREE.BufferAttribute(colorData.slice(), 3))
    }

    this.cellLabels = cellLabels ? cellLabels.slice() : null

    this.baseGeo = geo
    this.workGeo = geo.clone()
    this.mainMesh.geometry = this.workGeo
    this.wireMesh.geometry = new THREE.WireframeGeometry(this.workGeo)
  }

  // ── 顶点雕刻 ──────────────────────────────────────────────────────────────

  /**
   * 移除指定三角形索引的面片（替代 vertexSculptureFilter.removePoints）
   * @param triIndices 要移除的三角形索引集合
   */
  removeTriangles(triIndices: Set<number>): void {
    if (triIndices.size === 0) return
    const srcGeo = this.workGeo
    const posAttr = srcGeo.getAttribute("position") as THREE.BufferAttribute
    const colorAttr = srcGeo.getAttribute("color") as THREE.BufferAttribute | undefined
    const normalAttr = srcGeo.getAttribute("normal") as THREE.BufferAttribute | undefined
    const triCount = posAttr.count / 3

    const keepTris: number[] = []
    for (let t = 0; t < triCount; t++) {
      if (!triIndices.has(t)) keepTris.push(t)
    }

    const newCount = keepTris.length * 3
    const newPos = new Float32Array(newCount * 3)
    const newColor = colorAttr ? new Float32Array(newCount * 3) : null
    const newNormal = normalAttr ? new Float32Array(newCount * 3) : null
    const newCellLabels = this.cellLabels ? new Float32Array(keepTris.length) : null

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
      if (newCellLabels && this.cellLabels) {
        newCellLabels[i] = this.cellLabels[t]
      }
    })

    const newGeo = new THREE.BufferGeometry()
    newGeo.setAttribute("position", new THREE.BufferAttribute(newPos, 3))
    if (newColor) newGeo.setAttribute("color", new THREE.BufferAttribute(newColor, 3))
    if (newNormal) newGeo.setAttribute("normal", new THREE.BufferAttribute(newNormal, 3))
    else newGeo.computeVertexNormals()

    this.cellLabels = newCellLabels
    this.workGeo = newGeo
    this.mainMesh.geometry = newGeo
    this.wireMesh.geometry = new THREE.WireframeGeometry(newGeo)
  }

  /**
   * 设置三角形的 label 颜色（替代 vertexSculptureFilter.setCellInfo）
   * @param triIndex 三角形索引
   * @param label    颜色 label（0-25）
   */
  setTriangleLabel(triIndex: number, label: number): void {
    const colorAttr = this.workGeo.getAttribute("color") as THREE.BufferAttribute | undefined
    if (!colorAttr) return
    const [r, g, b] = labelToRGB(label)
    const rf = r / 255, gf = g / 255, bf = b / 255
    for (let v = 0; v < 3; v++) {
      colorAttr.setXYZ(triIndex * 3 + v, rf, gf, bf)
    }
    colorAttr.needsUpdate = true

    // 同步更新 cellLabels
    if (this.cellLabels && triIndex < this.cellLabels.length) {
      this.cellLabels[triIndex] = label
    }
  }

  /** 重置到原始几何（替代 vertexSculptureFilter.reset） */
  reset(): void {
    this.workGeo = this.baseGeo.clone()
    this.mainMesh.geometry = this.workGeo
    this.wireMesh.geometry = new THREE.WireframeGeometry(this.workGeo)
  }

  // ── 可见性 ────────────────────────────────────────────────────────────────

  setVisible(visible: boolean): void {
    this.mainMesh.visible = visible
    this.wireMesh.visible = false // 线框默认不跟随
    this.highlightPoints.visible = visible
  }

  getVisible(): boolean {
    return this.mainMesh.visible
  }

  // ── 清理 ──────────────────────────────────────────────────────────────────

  dispose(): void {
    this.workGeo.dispose()
    this.baseGeo.dispose()
    ;(this.mainMesh.material as THREE.Material).dispose()
    ;(this.wireMesh.material as THREE.Material).dispose()
    ;(this.highlightPoints.material as THREE.Material).dispose()
    this.highlightPoints.geometry.dispose()
  }
}
