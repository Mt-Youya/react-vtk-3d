import type { ToothPosition } from "@/types"
import { EventManager } from "@/utils/eventManager"
import { DeviceUtils } from "@/utils/device"

// These were imported from missing @/store/* modules — stubbed out
type ArchSection = "sharp" | "frontMolar" | "molar"

const keys: ArchSection[] = ["sharp", "frontMolar", "molar"]

type ArchWidthPoint = [number, number, number] | null

interface ArchWidthEntry {
  points: [ArchWidthPoint, ArchWidthPoint]
  value?: number
  name?: string
}

const archWidthStore: Record<string, Record<string, ArchWidthEntry>> = {
  up: {
    sharp: { points: [null, null] },
    frontMolar: { points: [null, null] },
    molar: { points: [null, null] },
  },
  down: {
    sharp: { points: [null, null] },
    frontMolar: { points: [null, null] },
    molar: { points: [null, null] },
  },
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
;(archWidthStore as any).setTypeVal = (type: string, pos: string, key: string, val: unknown) => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(archWidthStore[type][pos] as any)[key] = val
}

// TriggerScene stub — was from missing @/store
const TriggerScene = {
  context: {
    getScreenMapModelPos: (_point: { x: number; y: number }): [number, number, number] => [0, 0, 0],
    addToothWidthLabels: (
      _type: string,
      _pos: string,
      _name: string,
      _p1: unknown,
      _p2?: unknown,
    ) => {},
  },
}

// NewInstances stub — was from missing @/store/NewInstances
const NewInstances = {
  getInstance: (_name: string): { setArchWidthData: (key: string, val: number) => void } => ({
    setArchWidthData: () => {},
  }),
}

const kMapInfo: Record<ArchSection, string> = {
  sharp: "archWidthFangs",
  frontMolar: "archWidthPremolar",
  molar: "archWidthMolar",
}

export default class ArchWidth {
  #container: HTMLElement | null = null
  #archBox: HTMLElement | null = null
  #type: ToothPosition = "up"
  #pos: ArchSection = "sharp"
  #name: string | null = null
  #tag: HTMLSpanElement | null = null
  #eventManager: EventManager = new EventManager()

  constructor(container: HTMLElement, type: string, pos: string, name: string) {
    if (type != "up" && type != "down") type = "up"
    if (!keys.includes(pos as ArchSection)) pos = keys[0]
    const archBox = document.createElement("div")
    const tag = document.createElement("span")
    tag.style.cssText =
      "font-size:12px;background-color:#fff;padding:2px 12px;position:absolute;top:0;left:0;white-space: nowrap;opacity:0;"
    tag.innerText = name
    archBox.append(tag)
    const boundingRect = container.getBoundingClientRect()
    archBox.style.cssText = `position: absolute; left: 0; bottom: 0; width:${boundingRect.width}px;height:${boundingRect.height}px;cursor:default;`
    container.insertAdjacentElement("afterend", archBox)
    this.#container = container
    this.#archBox = archBox
    this.#type = type as ToothPosition
    this.#pos = pos as ArchSection
    this.#name = name
    this.#tag = tag
    this.#init()
  }

  #init(): void {
    const _T = this
    let clickCount = 0

    function getMousePosition(e: MouseEvent): { x: number; y: number } {
      const rect = _T.#container!.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      return { x, y }
    }

    const handleClick = (e: MouseEvent) => {
      const type = _T.#type,
        pos = _T.#pos,
        name = _T.#name!
      const { x, y } = getMousePosition(e)
      const { getScreenMapModelPos, addToothWidthLabels } = TriggerScene.context
      const dpr = DeviceUtils.getDPR()
      const p = getScreenMapModelPos({
        x: x * dpr,
        y: (this.#container!.clientHeight - y) * dpr,
      })
      if (!p[0] && !p[1] && !p[2]) return
      archWidthStore[type][pos].points[clickCount] = p
      const { points } = archWidthStore[type][pos]
      const [p1, p2] = points
      if (clickCount) {
        const val = Math.sqrt(
          Math.pow(p2![0] - p1![0], 2) +
            Math.pow(p2![1] - p1![1], 2) +
            Math.pow(p2![2] - p1![2], 2),
        )
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ;(archWidthStore as any).setTypeVal(type, pos, "value", val)
        this.#getInstance("InfoSide").setArchWidthData(
          kMapInfo[pos] + (type == "up" ? "Upper" : "Lower"),
          val,
        )
        addToothWidthLabels(type, pos, name, p1, p2)
      } else {
        addToothWidthLabels(type, pos, name, p1)
      }
      clickCount = clickCount == 0 ? 1 : 0
    }

    const handleMouseEnter = (e: MouseEvent) => {
      const { x, y } = getMousePosition(e)
      this.#tag!.style.top = y + 15 + "px"
      this.#tag!.style.left = x + 15 + "px"
      this.#tag!.style.opacity = "1"
    }

    const handleMouseMove = (e: MouseEvent) => {
      const { x, y } = getMousePosition(e)
      this.#tag!.style.top = y + 15 + "px"
      this.#tag!.style.left = x + 15 + "px"
    }

    const handleMouseLeave = () => {
      this.#tag!.style.opacity = "0"
    }

    // 使用 EventManager 统一管理，确保 dispose() 时能正确移除
    this.#eventManager
      .on(this.#archBox!, "click", handleClick as EventListener)
      .on(this.#archBox!, "mouseenter", handleMouseEnter as EventListener)
      .on(this.#archBox!, "mousemove", handleMouseMove as EventListener)
      .on(this.#archBox!, "mouseleave", handleMouseLeave)
  }

  #getInstance(name: string): { setArchWidthData: (key: string, val: number) => void } {
    return NewInstances.getInstance(name)
  }

  remove(): void {
    this.#eventManager.dispose()
    this.#archBox!.remove()
  }
}
