import { computeControlPoints } from "./geometry"
import { C, T } from "@/apis/ct-values"
import { Bezier } from "@/apis/bezier"
import { EventManager } from "@/utils/eventManager"
import { logger } from "@/utils/logger"

// archBezierStore was from a missing @/store/archBezier module — stubbed out
const archBezierStore = {
  setPoint: (_points: unknown) => {},
  setArchLength: (_len: number) => {},
}

interface BezierPoint {
  Pm: { x: number; y: number }
  Pc1: { x: number; y: number } | null
  Pc2: { x: number; y: number } | null
}

export default class ArchBezierLine {
  points: BezierPoint[] = []
  private canvas: HTMLCanvasElement
  private container: HTMLElement
  private archViewBox: HTMLElement
  private ctx: CanvasRenderingContext2D
  private maxLength: number
  private eventManager: EventManager = new EventManager()

  constructor(container: HTMLElement, maxLength = 7) {
    const archViewBox = document.createElement("div")
    const canvas = document.createElement("canvas")
    const boundingRect = container.getBoundingClientRect()
    archViewBox.style.cssText = `position: absolute; left: 0; bottom: 0; width:${boundingRect.width};height:${boundingRect.height};`
    canvas.style.cssText = "width: 100%;height:100%;"
    canvas.width = boundingRect.width
    canvas.height = boundingRect.height
    archViewBox.appendChild(canvas)
    container.insertAdjacentElement("afterend", archViewBox)
    this.canvas = canvas
    this.container = container
    this.archViewBox = archViewBox
    this.ctx = canvas.getContext("2d")!
    this.maxLength = maxLength
    this.init()
  }

  private init(): void {
    let pointDownIdx: number | null = null
    let ctrlParentIdx: number | null = null
    let ctrlKey: "Pc1" | "Pc2" | null = null
    let pointActiveIdx: number | null = null
    let downTime = 0
    let upTime = 0
    const _T = this

    function getMousePosition(e: MouseEvent): { x: number; y: number } {
      const rect = _T.container.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      return { x, y }
    }

    function calcMouseEnterPoint(
      x: number,
      y: number,
      point: { x: number; y: number },
      radius: number,
    ): boolean {
      return (
        x <= point.x + radius &&
        x >= point.x - radius &&
        y <= point.y + radius &&
        y >= point.y - radius
      )
    }

    function resetPoints(e: MouseEvent): void {
      const { Pm, Pc1, Pc2 } = _T.points[pointDownIdx!]
      const { x, y } = getMousePosition(e)
      const M_x = x - Pm.x,
        M_y = y - Pm.y
      _T.points[pointDownIdx!].Pm = { x, y }
      if (Pc1) _T.points[pointDownIdx!].Pc1 = { x: Pc1.x + M_x, y: Pc1.y + M_y }
      if (Pc2) _T.points[pointDownIdx!].Pc2 = { x: Pc2.x + M_x, y: Pc2.y + M_y }
      archBezierStore.setPoint(_T.points)
    }

    const handleContextMenu = (e: Event) => {
      e.preventDefault()
    }

    const handleClick = (e: MouseEvent) => {
      if (upTime - downTime > 200) return

      const { x, y } = getMousePosition(e)
      let activeIdx: number | null = null
      for (let i = 0; i < this.points.length; i++) {
        const { Pm } = this.points[i]
        if (calcMouseEnterPoint(x, y, { ...Pm }, 5)) {
          activeIdx = i
          break
        }
      }
      if (activeIdx === null) {
        pointActiveIdx = null
        this.updatePoints({ x, y })
      } else {
        pointActiveIdx = activeIdx
        this.updateStage(pointActiveIdx)
      }
    }

    const handleMouseDown = (e: MouseEvent) => {
      downTime = new Date().getTime()
      if (this.points.length === 0) return
      const { points } = _T
      const { x, y } = getMousePosition(e)
      for (let i = 0; i < points.length; i++) {
        const { Pm, Pc1, Pc2 } = points[i]

        const inPc1 = Pc1 ? calcMouseEnterPoint(x, y, { ...Pc1 }, 3) : false
        const inPc2 = Pc2 ? calcMouseEnterPoint(x, y, { ...Pc2 }, 3) : false
        if (calcMouseEnterPoint(x, y, { ...Pm }, 5)) {
          pointDownIdx = i
          break
        } else if (inPc1 || inPc2) {
          ctrlParentIdx = i
          ctrlKey = inPc1 ? "Pc1" : inPc2 ? "Pc2" : null
          break
        } else {
          this.updateStage()
        }
      }
    }

    const handleMouseMove = (e: MouseEvent) => {
      if (this.points.length === 0) return

      if (pointDownIdx !== null) {
        resetPoints(e)
        this.updateStage()
        this.calcArchLength()
      }

      if (ctrlParentIdx !== null && ctrlKey) {
        this.points[ctrlParentIdx][ctrlKey] = getMousePosition(e)
        this.updateStage(ctrlParentIdx)
        this.calcArchLength()
      }

      if (pointActiveIdx !== null) _T.updateStage(pointActiveIdx)

      const { x, y } = getMousePosition(e)
      for (let i = 0; i < _T.points.length; i++) {
        const { Pm, Pc1, Pc2 } = _T.points[i]
        const inPc1 = Pc1 ? calcMouseEnterPoint(x, y, { ...Pc1 }, 3) : false
        const inPc2 = Pc2 ? calcMouseEnterPoint(x, y, { ...Pc2 }, 3) : false
        if (calcMouseEnterPoint(x, y, { ...Pm }, 5)) {
          this.archViewBox.style.cursor = "pointer"
          break
        } else if ((inPc1 || inPc2) && pointActiveIdx === i) {
          this.archViewBox.style.cursor = "move"
          break
        } else {
          this.archViewBox.style.cursor = "default"
        }
      }
    }

    const handleMouseUp = () => {
      upTime = new Date().getTime()
      pointDownIdx = null
      ctrlParentIdx = null
      ctrlKey = null
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (pointActiveIdx === null) return
      if (e.keyCode === 46 || e.key === "Delete") {
        this.points = this.points.filter((_, index) => index !== pointActiveIdx)
        archBezierStore.setPoint(this.points)
        this.updateStage()
        pointActiveIdx = null
      }
    }

    // 使用 EventManager 统一管理所有事件监听器，防止内存泄漏
    this.eventManager
      .on(this.canvas, "contextmenu", handleContextMenu)
      .on(this.archViewBox, "click", handleClick as EventListener)
      .on(this.canvas, "mousedown", handleMouseDown as EventListener)
      .on(this.canvas, "mousemove", handleMouseMove as EventListener)
      .on(this.canvas, "mouseup", handleMouseUp)
      .on(document, "keyup", handleKeyUp as EventListener)
  }

  computeLength(curve: InstanceType<typeof Bezier>): number {
    const z = 0.5,
      len = T.length
    let sum = 0
    for (let i = 0, t: number; i < len; i++) {
      t = z * T[i] + z
      sum += C[i] * this.arcfn(curve.derivative(t))
    }
    return z * sum
  }

  arcfn(d: { x: number; y: number }): number {
    return Math.sqrt(d.x * d.x + d.y * d.y)
  }

  calcArchLength(): void {
    const { points } = this
    if (points.length < 2) return
    let len = 0
    for (let i = 1; i < points.length; i++) {
      const P1 = points[i - 1].Pm,
        P2 = points[i - 1].Pc2,
        P3 = points[i].Pc1,
        P4 = points[i].Pm
      const curve = new Bezier([P1, P2, P3, P4])
      len += this.computeLength(curve)
    }
    archBezierStore.setArchLength(len)
  }

  exampleCalc(pointData: number[]): void {
    const points: { x: number; y: number }[] = []
    for (let i = 0; i < pointData.length; i += 2) {
      points.push({ x: pointData[i], y: pointData[i + 1] })
    }
    const curve = new Bezier(points)
    const len = this.computeLength(curve)
    logger.debug("exampleCalc length:", len)
  }

  updatePoints({ x, y }: { x: number; y: number }): void {
    if (this.points.length === this.maxLength) return
    this.points.push({ Pm: { x, y }, Pc1: null, Pc2: null })
    if (this.points.length > 1) {
      const { points } = this
      const ctrlPoints = computeControlPoints(
        points.map((item) => [item.Pm.x, item.Pm.y] as [number, number]),
      )
      for (let i = 1; i < points.length; i++) {
        const cp = ctrlPoints[i]
        if (!cp) continue
        const [d1, d2] = cp
        const [d1_x, d1_y] = d1
        const [d2_x, d2_y] = d2
        this.points[i].Pc1 = { x: d2_x, y: d2_y }
        this.points[i - 1].Pc2 = { x: d1_x, y: d1_y }
      }
    }
    archBezierStore.setPoint(this.points)
    this.calcArchLength()
    this.updateStage()
  }

  updateStage(activeIdx?: number | null): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
    for (let i = 0; i < this.points.length; i++) {
      const { Pc1 } = this.points[i]
      const Pc2 = this.points[i - 1] ? this.points[i - 1].Pc2 : null
      if (Pc1 && Pc2) this.drawBezierLine(i)
      if (activeIdx != null && activeIdx === i) this.drawBezierCtrlTools(i)
    }
    for (let i = 0; i < this.points.length; i++) {
      const { Pm } = this.points[i]
      this.drawPoints(Pm.x, Pm.y)
    }
  }

  drawBezierLine(idx: number): void {
    const ctx = this.ctx
    const { Pm, Pc1 } = this.points[idx]
    const prevPoint = this.points[idx - 1]
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(Pm.x, Pm.y)
    ctx.bezierCurveTo(
      Pc1!.x,
      Pc1!.y,
      prevPoint.Pc2!.x,
      prevPoint.Pc2!.y,
      prevPoint.Pm.x,
      prevPoint.Pm.y,
    )
    ctx.fillStyle = "#fff"
    ctx.lineWidth = 2
    ctx.strokeStyle = "red"
    ctx.stroke()
  }

  drawPoints(Px: number, Py: number): void {
    const ctx = this.ctx
    ctx.save()
    ctx.beginPath()
    ctx.moveTo(Px, Py)
    ctx.arc(Px, Py, 5, 0, 2 * Math.PI)
    ctx.fillStyle = "#fff"
    ctx.strokeStyle = "#fff"
    ctx.fill()
    ctx.stroke()
    ctx.closePath()
  }

  drawBezierCtrlTools(idx: number): void {
    const ctx = this.ctx
    const { Pm, Pc1, Pc2 } = this.points[idx]
    ctx.save()
    ctx.beginPath()
    ctx.fillStyle = "red"
    if (Pc1) {
      ctx.moveTo(Pc1.x, Pc1.y)
      ctx.arc(Pc1.x, Pc1.y, 4, 0, 2 * Math.PI)
      ctx.fill()
    }
    if (Pc2) {
      ctx.moveTo(Pc2.x, Pc2.y)
      ctx.arc(Pc2.x, Pc2.y, 4, 0, 2 * Math.PI)
      ctx.fill()
    }
    ctx.setLineDash([1, 5])
    ctx.lineWidth = 1
    ctx.strokeStyle = "red"
    if (Pc1) {
      ctx.moveTo(Pc1.x, Pc1.y)
      ctx.lineTo(Pm.x, Pm.y)
    }
    if (Pc2) {
      ctx.moveTo(Pc2.x, Pc2.y)
      ctx.lineTo(Pm.x, Pm.y)
    }
    ctx.stroke()
    ctx.setLineDash([])
    ctx.closePath()
  }

  remove(): void {
    // 清理所有事件监听器，防止内存泄漏
    this.eventManager.dispose()
    archBezierStore.setPoint([])
    this.archViewBox.remove()
  }
}
