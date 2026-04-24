/**
 * 牙齿场景 Zustand Store
 *
 * 替代 init(container) 闭包中的所有状态变量，
 * 供 R3F 组件声明式访问和更新。
 */

import { create } from "zustand"
import * as THREE from "three"
import type { CameraInfo, Point3D, ToothPosition } from "@/types"
import type { VTPParseResult } from "@/lib/VTKLoader"

// ── 选择模式 ──────────────────────────────────────────────────────────────────

export const SelectionMode = {
  none: 0,
  rect: 1,
  polygon: 2,
} as const
export type SelectionModeValue = (typeof SelectionMode)[keyof typeof SelectionMode]

// ── 宽度标注数据 ───────────────────────────────────────────────────────────────

export interface WidthLabelEntry {
  key: string
  name: string
  points: Point3D[]
  visible: boolean
}

// ── 样条曲线数据 ───────────────────────────────────────────────────────────────

export interface SplineData {
  index: number
  points: Point3D[]
  normal: Point3D
  visible: boolean
}

// ── 牙齿编号数据 ───────────────────────────────────────────────────────────────

export interface ToothOrderData {
  modelIdx: number
  key: string
  name: string
  worldPos: Point3D
}

// ── 高亮点云数据 ───────────────────────────────────────────────────────────────

export interface HighlightPointsData {
  positions: Float32Array
  /** 对应的 tooth name */
  toothName: string
}

// ── Store 类型 ────────────────────────────────────────────────────────────────

interface ToothSceneState {
  // ── 几何数据 ──────────────────────────────────────────────────────────────
  /** 原始 VTP ArrayBuffer（下颌 "l"，上颌 "u"） */
  buffers: { l: ArrayBuffer | null; u: ArrayBuffer | null }
  /** parseVTP 解析结果（用于选择操作） */
  parseResults: { l: VTPParseResult | null; u: VTPParseResult | null }
  /** 修改后的几何（顶点删除后） */
  workGeos: { l: THREE.BufferGeometry | null; u: THREE.BufferGeometry | null }
  /** cellLabels（每三角形 label，用于颜色更新和导出） */
  cellLabels: { l: Float32Array | null; u: Float32Array | null }

  // ── 可见性 ────────────────────────────────────────────────────────────────
  toothVisible: { l: boolean; u: boolean }

  // ── 选择状态 ──────────────────────────────────────────────────────────────
  selectionMode: SelectionModeValue
  /** 每个牙齿被选中的三角形索引集合 */
  selectedFaces: { l: Set<number>; u: Set<number> }
  /** 高亮点云（选中三角形的顶点） */
  highlightPoints: { l: HighlightPointsData | null; u: HighlightPointsData | null }
  /** 多边形选择边界（CSS 像素坐标） */
  polygonBoundary: [number, number][]

  // ── 相机 ──────────────────────────────────────────────────────────────────
  cameraInfo: CameraInfo | null
  cameraVersion: number  // 每次 setCamera 递增，触发 R3F 相机更新

  // ── 可视化 ────────────────────────────────────────────────────────────────
  widthLabels: { up: Record<string, WidthLabelEntry>; down: Record<string, WidthLabelEntry> }
  splines: SplineData[]
  toothOrders: { up: ToothOrderData[]; down: ToothOrderData[] }

  // ── 光照模式 ──────────────────────────────────────────────────────────────
  lightEnabled: boolean

  // ── Actions ───────────────────────────────────────────────────────────────

  // 几何数据
  setBuffers(buffers: { l?: ArrayBuffer | null; u?: ArrayBuffer | null }): void
  setParseResult(name: "l" | "u", result: VTPParseResult): void
  setWorkGeo(name: "l" | "u", geo: THREE.BufferGeometry): void
  setCellLabels(name: "l" | "u", labels: Float32Array | null): void
  /** 批量写入解析结果（一次 set 调用，避免 Zustand 5 同步多次触发） */
  setParseAndWorkGeo(
    name: "l" | "u",
    result: VTPParseResult,
    geo: THREE.BufferGeometry,
    labels: Float32Array | null,
  ): void

  // 可见性
  setToothVisible(name: "l" | "u" | undefined, visible: boolean): void
  toggleToothVisible(tooth?: ToothPosition): void

  // 选择
  setSelectionMode(mode: SelectionModeValue): void
  setSelectedFaces(name: "l" | "u", faces: Set<number>): void
  addSelectedFaces(name: "l" | "u", faces: Set<number>): void
  clearSelection(): void
  setHighlightPoints(name: "l" | "u", data: HighlightPointsData | null): void
  setPolygonBoundary(boundary: [number, number][]): void
  addPolygonPoint(point: [number, number]): void

  // 相机
  setCameraInfo(info: CameraInfo): void

  // 宽度标注
  setWidthLabel(type: ToothPosition, key: string, entry: WidthLabelEntry): void
  removeWidthLabel(type: ToothPosition, key: string): void
  setWidthLabelVisible(type: ToothPosition, visible: boolean): void

  // 样条曲线
  setSpline(index: number, data: Omit<SplineData, "index">): void
  setSplineVisible(index: number, visible: boolean): void

  // 牙齿编号
  setToothOrders(modelIdx: number, orders: ToothOrderData[]): void
  clearToothOrders(modelIdx: number): void

  // 光照
  toggleLight(): void

  // 重置
  reset(): void
}

export const useToothStore = create<ToothSceneState>((set) => ({
  // ── 初始状态 ──────────────────────────────────────────────────────────────

  buffers: { l: null, u: null },
  parseResults: { l: null, u: null },
  workGeos: { l: null, u: null },
  cellLabels: { l: null, u: null },

  toothVisible: { l: true, u: true },

  selectionMode: SelectionMode.none,
  selectedFaces: { l: new Set(), u: new Set() },
  highlightPoints: { l: null, u: null },
  polygonBoundary: [],

  cameraInfo: null,
  cameraVersion: 0,

  widthLabels: { up: {}, down: {} },
  splines: [],
  toothOrders: { up: [], down: [] },

  lightEnabled: true,

  // ── Actions ───────────────────────────────────────────────────────────────

  setBuffers: (buffers) =>
    set((s) => ({ buffers: { ...s.buffers, ...buffers } })),

  setParseResult: (name, result) =>
    set((s) => ({ parseResults: { ...s.parseResults, [name]: result } })),

  setWorkGeo: (name, geo) =>
    set((s) => ({ workGeos: { ...s.workGeos, [name]: geo } })),

  setCellLabels: (name, labels) =>
    set((s) => ({ cellLabels: { ...s.cellLabels, [name]: labels } })),

  setParseAndWorkGeo: (name, result, geo, labels) =>
    set((s) => ({
      parseResults: { ...s.parseResults, [name]: result },
      workGeos: { ...s.workGeos, [name]: geo },
      cellLabels: { ...s.cellLabels, [name]: labels },
    })),

  setToothVisible: (name, visible) =>
    set((s) => ({
      toothVisible: name
        ? { ...s.toothVisible, [name]: visible }
        : { l: visible, u: visible },
    })),

  toggleToothVisible: (tooth) =>
    set((s) => {
      const name = tooth === "up" ? "u" : "l"
      return { toothVisible: { ...s.toothVisible, [name]: !s.toothVisible[name] } }
    }),

  setSelectionMode: (mode) => set({ selectionMode: mode }),

  setSelectedFaces: (name, faces) =>
    set((s) => ({ selectedFaces: { ...s.selectedFaces, [name]: faces } })),

  addSelectedFaces: (name, faces) =>
    set((s) => {
      const existing = s.selectedFaces[name]
      const merged = new Set([...existing, ...faces])
      return { selectedFaces: { ...s.selectedFaces, [name]: merged } }
    }),

  clearSelection: () =>
    set({
      selectedFaces: { l: new Set(), u: new Set() },
      highlightPoints: { l: null, u: null },
      polygonBoundary: [],
    }),

  setHighlightPoints: (name, data) =>
    set((s) => ({ highlightPoints: { ...s.highlightPoints, [name]: data } })),

  setPolygonBoundary: (boundary) => set({ polygonBoundary: boundary }),

  addPolygonPoint: (point) =>
    set((s) => ({ polygonBoundary: [...s.polygonBoundary, point] })),

  setCameraInfo: (info) =>
    set((s) => ({ cameraInfo: info, cameraVersion: s.cameraVersion + 1 })),

  setWidthLabel: (type, key, entry) =>
    set((s) => ({
      widthLabels: {
        ...s.widthLabels,
        [type]: { ...s.widthLabels[type], [key]: entry },
      },
    })),

  removeWidthLabel: (type, key) =>
    set((s) => {
      const updated = { ...s.widthLabels[type] }
      delete updated[key]
      return { widthLabels: { ...s.widthLabels, [type]: updated } }
    }),

  setWidthLabelVisible: (type, visible) =>
    set((s) => {
      const updated = Object.fromEntries(
        Object.entries(s.widthLabels[type]).map(([k, v]) => [k, { ...v, visible }]),
      )
      return { widthLabels: { ...s.widthLabels, [type]: updated } }
    }),

  setSpline: (index, data) =>
    set((s) => {
      const splines = [...s.splines]
      const existing = splines.findIndex((sp) => sp.index === index)
      if (existing >= 0) {
        splines[existing] = { index, ...data }
      } else {
        splines.push({ index, ...data })
      }
      return { splines }
    }),

  setSplineVisible: (index, visible) =>
    set((s) => ({
      splines: s.splines.map((sp) => (sp.index === index ? { ...sp, visible } : sp)),
    })),

  setToothOrders: (modelIdx, orders) =>
    set((s) => {
      const key = modelIdx === 0 ? "up" : "down"
      return { toothOrders: { ...s.toothOrders, [key]: orders } }
    }),

  clearToothOrders: (modelIdx) =>
    set((s) => {
      const key = modelIdx === 0 ? "up" : "down"
      return { toothOrders: { ...s.toothOrders, [key]: [] } }
    }),

  toggleLight: () => set((s) => ({ lightEnabled: !s.lightEnabled })),

  reset: () =>
    set({
      parseResults: { l: null, u: null },
      workGeos: { l: null, u: null },
      cellLabels: { l: null, u: null },
      selectedFaces: { l: new Set(), u: new Set() },
      highlightPoints: { l: null, u: null },
      polygonBoundary: [],
      cameraInfo: null,
      cameraVersion: 0,
      widthLabels: { up: {}, down: {} },
      splines: [],
      toothOrders: { up: [], down: [] },
    }),
}))
