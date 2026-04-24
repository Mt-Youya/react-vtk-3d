import * as THREE from "three"
import { OrbitControls } from "three/addons/controls/OrbitControls.js"
import type { CameraInfo } from "./types"

/**
 * WebGLRenderer + Scene + Camera + OrbitControls
 * 替代 vtkFullScreenRenderWindow
 */
export class ThreeRenderer {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  controls: OrbitControls
  container: HTMLElement

  private animFrameId: number | null = null

  constructor(container: HTMLElement) {
    this.container = container

    // ── WebGLRenderer ──────────────────────────────────────────────────────
    this.renderer = new THREE.WebGLRenderer({ antialias: true })
    this.renderer.setPixelRatio(window.devicePixelRatio)
    this.renderer.setSize(container.clientWidth, container.clientHeight)
    this.renderer.outputColorSpace = THREE.SRGBColorSpace
    container.appendChild(this.renderer.domElement)

    // ── Scene ──────────────────────────────────────────────────────────────
    this.scene = new THREE.Scene()
    this.scene.background = new THREE.Color(0x1a1a1a)

    // ── Camera ─────────────────────────────────────────────────────────────
    const aspect = container.clientWidth / container.clientHeight
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 10000)
    this.camera.position.set(0, 0, 200)

    // ── Controls ───────────────────────────────────────────────────────────
    this.controls = new OrbitControls(this.camera, this.renderer.domElement)
    this.controls.enableDamping = false // 禁用 damping 避免需要动画循环
    this.controls.addEventListener("change", () => this._renderOnce())

    // ── 光照 ───────────────────────────────────────────────────────────────
    const ambient = new THREE.AmbientLight(0xffffff, 0.6)
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8)
    dirLight.position.set(1, 2, 3)
    this.scene.add(ambient, dirLight)

    // ── 响应容器尺寸变化 ───────────────────────────────────────────────────
    const resizeObserver = new ResizeObserver(() => this._onResize())
    resizeObserver.observe(container)
  }

  private _onResize(): void {
    const w = this.container.clientWidth
    const h = this.container.clientHeight
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
    this.renderer.setSize(w, h)
    this._renderOnce()
  }

  /** 直接渲染一帧（不触发 controls.update，避免递归） */
  private _renderOnce(): void {
    this.renderer.render(this.scene, this.camera)
  }

  render(): void {
    this.controls.update()
    this._renderOnce()
  }

  // ── 相机控制 ──────────────────────────────────────────────────────────────

  setCamera(info: CameraInfo): void {
    const [focalPoint, viewUp, position] = info
    this.camera.position.set(...position)
    this.camera.up.set(...viewUp)
    this.controls.target.set(...focalPoint)
    this.controls.update()
    this.render()
  }

  getCamera(): THREE.PerspectiveCamera {
    return this.camera
  }

  getCameraInfo(): CameraInfo {
    const pos = this.camera.position
    const target = this.controls.target
    const up = this.camera.up
    return [
      [target.x, target.y, target.z],
      [up.x, up.y, up.z],
      [pos.x, pos.y, pos.z],
    ]
  }

  resetCamera(info?: CameraInfo): void {
    if (info) {
      this.setCamera(info)
    } else {
      this.camera.position.set(0, 0, 200)
      this.camera.up.set(0, 1, 0)
      this.controls.target.set(0, 0, 0)
      this.controls.update()
      this.render()
    }
  }

  fitToScene(): void {
    const box = new THREE.Box3().setFromObject(this.scene)
    if (box.isEmpty()) return
    const center = box.getCenter(new THREE.Vector3())
    const size = box.getSize(new THREE.Vector3())
    const maxDim = Math.max(size.x, size.y, size.z)
    const fov = this.camera.fov * (Math.PI / 180)
    const dist = maxDim / (2 * Math.tan(fov / 2)) * 1.5

    this.camera.position.set(center.x, center.y, center.z + dist)
    this.camera.up.set(0, 1, 0)
    this.controls.target.copy(center)
    this.controls.update()
    this.render()
  }

  dispose(): void {
    if (this.animFrameId !== null) cancelAnimationFrame(this.animFrameId)
    this.controls.dispose()
    this.renderer.dispose()
    if (this.renderer.domElement.parentNode) {
      this.renderer.domElement.parentNode.removeChild(this.renderer.domElement)
    }
  }
}
