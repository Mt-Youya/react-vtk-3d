import * as THREE from "three"
import { TransformControls } from "three/addons/controls/TransformControls.js"
import type { Point3D } from "./types"

/**
 * 可交互样条曲线 Widget
 * 替代 splineWidget.ts（vtk.js）
 *
 * 使用 CatmullRomCurve3 渲染样条曲线，
 * 每个控制点绑定 TransformControls 支持拖拽。
 *
 * 注意：three.js 0.184 中 TransformControls 继承自 Controls（非 Object3D），
 * 需通过 tc.getHelper() 获取可加入场景的 Object3D。
 */
export class SplineWidget {
  private scene: THREE.Scene
  private camera: THREE.Camera
  private renderer: THREE.WebGLRenderer
  private orbitControls: { enabled: boolean }

  private controlPointMeshes: THREE.Mesh[] = []
  private transformControls: TransformControls[] = []
  private transformHelpers: THREE.Object3D[] = []
  private curve: THREE.CatmullRomCurve3
  private curveLine: THREE.Line
  private group: THREE.Group

  visible = true

  constructor(
    scene: THREE.Scene,
    camera: THREE.Camera,
    renderer: THREE.WebGLRenderer,
    orbitControls: { enabled: boolean },
  ) {
    this.scene = scene
    this.camera = camera
    this.renderer = renderer
    this.orbitControls = orbitControls

    this.curve = new THREE.CatmullRomCurve3([], false, "catmullrom", 0.5)

    const lineGeo = new THREE.BufferGeometry()
    const lineMat = new THREE.LineBasicMaterial({ color: 0xff0000, linewidth: 2 })
    this.curveLine = new THREE.Line(lineGeo, lineMat)

    this.group = new THREE.Group()
    this.group.add(this.curveLine)
    scene.add(this.group)
  }

  /** 设置控制点（替代 vtkSplineWidget.addPoints） */
  addPoints(points: Point3D[]): void {
    this._clearControlPoints()
    for (const p of points) {
      this._addControlPoint(p)
    }
    this._updateCurve()
  }

  private _addControlPoint(pos: Point3D): void {
    const sphere = new THREE.Mesh(
      new THREE.SphereGeometry(0.8, 12, 8),
      new THREE.MeshBasicMaterial({ color: 0xff8800 }),
    )
    sphere.position.set(...pos)
    this.group.add(sphere)
    this.controlPointMeshes.push(sphere)

    const tc = new TransformControls(this.camera, this.renderer.domElement)
    tc.attach(sphere)
    tc.setMode("translate")
    tc.setSize(0.5)

    // 拖拽时禁用轨道控制，避免冲突
    tc.addEventListener("dragging-changed", (event) => {
      this.orbitControls.enabled = !event.value
    })
    tc.addEventListener("change", () => {
      this._updateCurve()
    })

    // three.js 0.184: TransformControls 不再是 Object3D，
    // 需用 getHelper() 获取可加入场景的辅助对象
    const helper = tc.getHelper()
    this.scene.add(helper)
    this.transformControls.push(tc)
    this.transformHelpers.push(helper)
  }

  private _updateCurve(): void {
    if (this.controlPointMeshes.length < 2) {
      this.curveLine.geometry.setFromPoints([])
      return
    }
    this.curve.points = this.controlPointMeshes.map((m) => m.position.clone())
    const pts = this.curve.getPoints(Math.max(50, this.controlPointMeshes.length * 10))
    this.curveLine.geometry.setFromPoints(pts)
  }

  private _clearControlPoints(): void {
    for (let i = 0; i < this.transformControls.length; i++) {
      const tc = this.transformControls[i]
      const helper = this.transformHelpers[i]
      tc.detach()
      tc.dispose()
      this.scene.remove(helper)
    }
    for (const mesh of this.controlPointMeshes) {
      this.group.remove(mesh)
      mesh.geometry.dispose()
      ;(mesh.material as THREE.Material).dispose()
    }
    this.controlPointMeshes = []
    this.transformControls = []
    this.transformHelpers = []
    this.curveLine.geometry.setFromPoints([])
  }

  setVisible(value: boolean): void {
    this.visible = value
    this.group.visible = value
    for (const helper of this.transformHelpers) {
      helper.visible = value
    }
  }

  dispose(): void {
    this._clearControlPoints()
    this.scene.remove(this.group)
    this.curveLine.geometry.dispose()
    ;(this.curveLine.material as THREE.Material).dispose()
  }
}
