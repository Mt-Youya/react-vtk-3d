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

export interface CoreMethods {
    triggerInitScene(buffers: ArrayBuffer[], forceFrontFace?: boolean, type?: string): Promise<void>
    handleDelete(isShiftKey?: boolean): void
    handleSpace(): void
    handlePolygonSelection(): void
    handleSelection(): void
    handleEscape(): void
    handleReset(): void
    handleTeethVisible(tooth?: ToothPosition): void
    handleTurnover(): void
    getFileBuffer(): ArrayBuffer[]
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getCamera(): any
    setCamera(info: CameraInfo): void
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getNowFile(): any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getSinleNowFile(index: number): any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getFullscreenRenderer(): any
    triggerFinalFile(buffers: ArrayBuffer[]): void
    initModel(idx: number, readerType: string): Promise<void>
    triggerFile(buffer: ArrayBuffer, idx: number): Promise<void>
    addLine(point1: Point3D, point2: Point3D): void
    toggleLight(): void
    switchView(type: 0 | 1 | 2, selectedIdx?: number): void
    getScreenMapModelPos(point: { x: number; y: number }): Point3D | null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    renderToothOrder(points: any, viewUp: any, modelIdx: number): void
    getFrontViewCameraInfo(): Promise<CameraInfo>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getFirstVisibleToothModel(): any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    addSpline(points: any, index: number, normal: any): void
    setSplineWidgetVisible(value: boolean, index: number): void
    addToothWidthLabels(type: ToothPosition, key: string, name: string, P1: Point3D, P2?: Point3D): void
    handleRootClick(e: MouseEvent): void
}

export interface ApiResponse<T = unknown> {
    code: number
    data: T
    message?: string
}
