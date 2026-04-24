export type Point2D = [number, number]
export type Point3D = [number, number, number]
export type ToothPosition = "up" | "down"
export type ArchSection = "sharp" | "frontMolar" | "molar"
export type CameraInfo = [Point3D, Point3D, Point3D]

export interface ModelFileInfo {
  mandibleFile: string
  maxillaFile: string
  downFilename: string
  upFilename: string
}

export interface ToothInfo {
  num: string | number
  value: number
}

export interface ArchWidthGroup {
  name: string
  points: [Point3D, Point3D]
}

export type ArchWidthData = Record<string, ArchWidthGroup>

/** renderToothOrder 中每颗牙齿的屏幕坐标信息 */
export interface ToothOrderPoint {
  name: string
  coordinate: [{ x: number; y: number }, { x: number; y: number }]
}

export interface BoltonInfo {
  rate: number
  dviations: number
}

export interface InfoSideData {
  topFileName: string
  downFileName: string
  topResultVtpUrl: string
  downResultVtpUrl: string
  topWidthGps: ArchWidthData
  downWidthGps: ArchWidthData
  topToothList: ToothInfo[]
  downToothList: ToothInfo[]
  topTotalToothWidth: number
  downTotalToothWidth: number
  topTotalArchLength: number
  downTotalArchLength: number
  crowdedUpper: number
  crowdedLower: number
  teethFgDesc: string
  teethFhDesc: string
  indCoverOverbiteDesc?: string
  frontBolton?: BoltonInfo
  allBolton?: BoltonInfo
}

export interface ModelInfo {
  filename: string
  deleted: boolean
}

// VTK 对象的宽松类型别名，后续可逐步精化
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type VTKObject = Record<string, any>

export interface CoreMethods {
  triggerInitScene(buffers: ArrayBuffer[], forceFrontFace?: boolean, type?: string): Promise<unknown>
  handleDelete(isShiftKey?: boolean): void
  handleSpace(): void
  handlePolygonSelection(): void
  handleSelection(): void
  handleEscape(): void
  handleReset(): void
  handleTeethVisible(tooth?: ToothPosition): void
  handleTurnover(): void
  /** 返回 STL 文本（ASCII 格式），每个模型一个字符串 */
  getFileBuffer(): string[]
  getCamera(): VTKObject
  setCamera(info: CameraInfo): void
  /** 返回 VTP XML 文本，每个模型一个字符串 */
  getNowFile(): string[]
  /** @deprecated 拼写错误，请使用 getSingleNowFile */
  getSinleNowFile(index: number): string
  getSingleNowFile(index: number): string
  getFullscreenRenderer(): VTKObject
  triggerFinalFile(buffers: string[]): void
  initModel(idx: number, readerType: string): void
  triggerFile(buffer: string, idx: number): void
  addLine(point1: Point3D, point2: Point3D): void
  toggleLight(): void
  switchView(type: 0 | 1 | 2, selectedIdx?: number): void
  getScreenMapModelPos(point: { x: number; y: number }): Point3D | null
  renderToothOrder(points: ToothOrderPoint[], viewUp: Point3D, modelIdx: number): void
  getFrontViewCameraInfo(): CameraInfo
  getFirstVisibleToothModel(): VTKObject | null
  addSpline(points: Point3D[], index: number, normal: Point3D): void
  setSplineWidgetVisible(value: boolean, index: number): void
  addToothWidthLabels(
    type: ToothPosition,
    key: string,
    name: string,
    P1: Point3D,
    P2?: Point3D,
  ): void
  /** 处理根元素点击事件（使用原生 MouseEvent 以兼容 VTK 坐标计算） */
  handleRootClick?(e: MouseEvent): void
}

export interface ApiResponse<T = unknown> {
  code: number
  data: T
  message?: string
}
