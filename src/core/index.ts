import "@kitware/vtk.js/Rendering/Profiles/Geometry"
import "@kitware/vtk.js/IO/Core/DataAccessHelper/HttpDataAccessHelper"
import vtkXMLPolyDataWriter from "@kitware/vtk.js/IO/XML/XMLPolyDataWriter"
import vtkXMLWriter from "@kitware/vtk.js/IO/XML/XMLWriter"
import vtkFullScreenRenderWindow from "@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow"
import vtkInteractorStyleManipulator from "@kitware/vtk.js/Interaction/Style/InteractorStyleManipulator"
import Manipulators from "@kitware/vtk.js/Interaction/Manipulators"
import vtkCellPicker from "@kitware/vtk.js/Rendering/Core/CellPicker"
// eslint-disable-next-line @typescript-eslint/no-explicit-any
import STLWriter from "@kitware/vtk.js/IO/Geometry/STLWriter"
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const STATIC: any = (STLWriter as any).STATIC ?? STLWriter
import { FormatTypes } from "@kitware/vtk.js/IO/Geometry/STLWriter/Constants"
import ajax from "./ajax"
import PolygonSelection from "./polygon-selection"
import SelectToothIdx from "./select-tooth-idx"
import ToothModel from "./toothModel"
import { uniformStlModel } from "./geometry"
import { SelectorDataSource } from "./selectorDataSource"

import vtkLineSource from "@kitware/vtk.js/Filters/Sources/LineSource"
import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor"
import vtkMapper from "@kitware/vtk.js/Rendering/Core/Mapper"

import vtkSphereSource from "@kitware/vtk.js/Filters/Sources/SphereSource"

import vtkSplineWidget from "@/core/splineWidget"
import vtkWidgetManager from "@kitware/vtk.js/Widgets/Core/WidgetManager"
import vtkPlaneSource from "@kitware/vtk.js/Filters/Sources/PlaneSource"
import vtkPixelSpaceCallbackMapper from "@kitware/vtk.js/Rendering/Core/PixelSpaceCallbackMapper"

import vtkCircleSource from "@kitware/vtk.js/Filters/Sources/CircleSource"
import switchFrontViewWorker from "@/services/switchFrontViewWorker"
import { isArrayBuffer } from "@/utils/is"

void ajax // may be used externally

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = any

type Point3D = [number, number, number]
type Point2D = [number, number]
type CameraInfo = [Point3D, Point3D, Point3D]
type ToothPosition = "up" | "down"

export default (function () {
    const EnumSelectionMode = {
        none: 0,
        rect: 1,
        polygon: 2,
    }

    let initialized = false
    let cameraInitInfo: CameraInfo | null = null

    let selectionMode = EnumSelectionMode.none
    let boundary: Point2D[] = []

    let models: ToothModel[] = []
    const gingivaModels: (ToothModel | null)[] = [null, null]
    const cache = new Map<string, unknown>()

    let splineWidgets: Array<{ spline: AnyObj; plane?: AnyObj } | null> = [null, null]

    let toothOrders: Record<string, Record<string, AnyObj | null>> = {
        up: {},
        down: {},
    }

    let toothWidths: Record<string, Record<string, Record<string, AnyObj>>> = {
        up: {
            sharp: {},
            frontMolar: {},
            molar: {},
        },
        down: {
            sharp: {},
            frontMolar: {},
            molar: {},
        },
    }

    let coverRuler: AnyObj, toothRootPoint: AnyObj, textCtx: CanvasRenderingContext2D | null
    void coverRuler
    void toothRootPoint

    const picker = vtkCellPicker.newInstance()
    picker.setTolerance(0)

    const boxSelector = Manipulators.vtkMouseBoxSelectorManipulator.newInstance({ button: 1 })
    const iStyle = vtkInteractorStyleManipulator.newInstance()
    iStyle.addMouseManipulator(boxSelector)
    window.selectorDataSource = new SelectorDataSource()

    return function init(container: HTMLElement) {
        const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({ container })
        const renderer = fullScreenRenderer.getRenderer()
        const renderWindow = fullScreenRenderer.getRenderWindow()
        const interactor = renderWindow.getInteractor()
        document.removeEventListener("keypress", interactor.handleKeyPress)
        document.removeEventListener("keydown", interactor.handleKeyPress)
        document.removeEventListener("keyup", interactor.handleKeyUp)
        renderer.getActiveCamera().onModified(() => {
            if (container && textCtx) textCtx.clearRect(0, 0, container.clientWidth, container.clientHeight)
        })
        const apiSpecificRenderWindow = interactor.getView()

        window.renderer = renderer
        window.apiSpecificRenderWindow = apiSpecificRenderWindow

        initLabelsCanvas()

        function initScene(readerType: string): void {
            destroyScene()

            const lModel = new ToothModel(readerType, "l")
            const uModel = new ToothModel(readerType, "u")

            lModel.init(renderer)
            uModel.init(renderer)
            models.push(...[lModel, uModel])
            initialized = true
        }

        function initModel(idx: number, readerType: string): void {
            const model = models[idx]
            const name = model.name
            const modelActors = [model.actor, model.actor1, model.actor2]
            modelActors.forEach((actor) => renderer.removeActor(actor))
            model.delete()

            const newModel = new ToothModel(readerType, name)
            newModel.init(renderer)
            models[idx] = newModel
        }

        function destroyScene(): void {
            if (!initialized) return
            renderer.removeAllActors()
            models.forEach((model) => model.delete())
            models.splice(0, models.length)
            initialized = false
        }

        const initCameraInfo: CameraInfo = [
            [0, 0, 0],
            [0, 1, 0],
            [0, -1, 0],
        ]

        function render(forceFrontFace = false): Promise<boolean> | boolean {
            try {
                const arr = cameraInitInfo || initCameraInfo
                if (forceFrontFace) {
                    return switchFrontViewWorker(models[1].sourceReader, models[0].sourceReader)
                        .then((data) => {
                            cameraInitInfo = data as CameraInfo
                            setCamera(cameraInitInfo)
                            return true
                        })
                        .catch(() => false)
                }
                void arr
                return true
            } catch (err) {
                return false
            }
        }

        function handleTurnover(): void {
            if (models.length === 0) return
            const [lModel, uModel] = models
            uModel.name = "l"
            lModel.name = "u"
            models = [uModel, lModel]
            render(true)
        }

        const dpr = window.devicePixelRatio || 1
        const height = (window.innerHeight - 80) * dpr
        boxSelector.onBoxSelectChange(({ selection }: { selection: [number, number, number, number] }) => {
            const [xmin, xmax, ymin, ymax] = selection
            console.log("Apply selection:", [xmin, height - ymax, xmax, height - ymin])
            window.selectorDataSource.clear()
            window.selectorDataSource.run([
                [xmin, ymin],
                [xmax, ymax],
            ])
            models.forEach((model) => {
                model.highlightSelectionPointsFilter.setSelectionBox([
                    [xmin, ymin],
                    [xmax, ymax],
                ])
            })
            renderWindow.render()
        })

        const oldInteractorStyle = renderWindow.getInteractor().getInteractorStyle()

        const rootContainer = fullScreenRenderer.getRootContainer()
        void rootContainer

        function handleSelection(): void {
            if (selectionMode !== EnumSelectionMode.none) {
                handleEscape()
            }
            selectionMode = EnumSelectionMode.rect
            renderWindow.getInteractor().setInteractorStyle(iStyle)
        }

        function handlePolygonSelection(): void {
            if (selectionMode !== EnumSelectionMode.none) {
                handleEscape()
            }
            console.log("polygon selection")
            selectionMode = EnumSelectionMode.polygon
            oldInteractorStyle.setEnabled(false)
        }

        function handleSpace(): void {
            if (selectionMode === EnumSelectionMode.polygon) {
                if (boundary.length < 3) {
                    boundary = []
                    return
                }
                drawPolygonSelection(true)
                window.selectorDataSource.clear()
                const dpr = window.devicePixelRatio || 1
                const boundaryWithDpr: Point2D[] = boundary.map((arr) => arr.map((item) => item * dpr) as Point2D)
                window.selectorDataSource.run(boundaryWithDpr)
                models.forEach((model) => {
                    model.highlightSelectionPointsFilter.setSelectionBox(boundaryWithDpr)
                })
                renderWindow.render()
                boundary = []
            }
        }

        function handleEscape(): void {
            switch (selectionMode) {
                case EnumSelectionMode.rect: {
                    renderWindow.getInteractor().setInteractorStyle(oldInteractorStyle)
                    models.forEach((model) => {
                        model.highlightSelectionPointsFilter.setSelectionBox([])
                    })
                    break
                }
                case EnumSelectionMode.polygon: {
                    if (polygonSelection) {
                        polygonSelection.delete()
                        polygonSelection = null
                    }
                    boundary = []
                    models.forEach((model) => {
                        model.highlightSelectionPointsFilter.setSelectionBox([])
                    })
                    oldInteractorStyle.setEnabled(true)
                    break
                }
                default:
                    break
            }
            selectionMode = EnumSelectionMode.none
        }

        function handleDelete(isShiftKey?: boolean): void {
            if (isShiftKey) {
                for (const model of models) {
                    if (!model.actor.getVisibility()) continue

                    const removingPoints = model.pointsInBoundary()
                    if (removingPoints.length) {
                        model.highlightSelectionPointsFilter.setSelectionBox([])
                        model.vertexSculptureFilter.removePoints(removingPoints)
                        renderWindow.render()
                        if (selectionMode === EnumSelectionMode.polygon) {
                            polygonSelection!.delete()
                            polygonSelection = null
                            boundary = []
                        }
                    }
                }
            } else {
                for (const model of models) {
                    let idxArr: number[] = model.highlightSelectionPointsFilter.getSelectedPointIndexes()
                    idxArr = model.collapseInward(idxArr)
                    model.highlightSelectionPointsFilter.setSelectionBox([])
                    model.vertexSculptureFilter.removePoints(idxArr)
                }

                renderWindow.render()
                if (selectionMode === EnumSelectionMode.polygon) {
                    polygonSelection!.delete()
                    polygonSelection = null
                    boundary = []
                }
            }
        }

        function getPointerPosition(e: MouseEvent, container: HTMLElement): { x: number; y: number } {
            const rect = container.getBoundingClientRect()
            const x = e.clientX - rect.left
            const y = e.clientY - rect.top
            return { x, y }
        }

        let polygonSelection: PolygonSelection | null = null
        container.addEventListener("click", (e: MouseEvent) => {
            if (selectionMode !== EnumSelectionMode.polygon) return
            const { x, y } = getPointerPosition(e, container)
            boundary.push([x, y])
            drawPolygonSelection(false)
        })

        let selectToothIdx: SelectToothIdx | null = null
        renderWindow.getInteractor().onLeftButtonPress(() => {
            if (selectToothIdx) {
                selectToothIdx.delete()
                selectToothIdx = null
            }
        })

        function handleRightClick(callData: AnyObj): void {
            if (renderer !== callData.pokedRenderer) {
                return
            }
            console.log("right click")

            const pos = callData.position
            const point: Point3D = [pos.x, pos.y, 0.0]

            picker.pick(point, renderer)
            if (!picker.getActors().length) {
                return
            }

            const pickedCellId: number = picker.getCellId()
            const initSelected = null
            if (selectToothIdx) {
                selectToothIdx.delete()
            }
            const containerHeight = window.innerHeight - 80
            const dpr = window.devicePixelRatio || 1
            const winPos: [number, number] = [(pos.x / dpr) + 3, 3 + containerHeight - (pos.y / dpr)]
            selectToothIdx = new SelectToothIdx(container.parentElement!, winPos, initSelected, (toothIdx) => {
                const idx =
                    picker.getActors()[0].getMapper().getViewSpecificProperties()["name"] == "l" ? 0 : 1
                if ((window as Window & { hlCells?: number[] }).hlCells?.length) {
                    const selectionList = (window as Window & { hlCells?: number[] }).hlCells!
                    for (let i = 0; i < selectionList.length; i++) {
                        models[idx].vertexSculptureFilter.setCellInfo(selectionList[i], toothIdx)
                    }
                    models[idx].highlightSelectionPointsFilter.setSelectionBox([])
                } else {
                    models[idx].vertexSculptureFilter.setCellInfo(pickedCellId, toothIdx)
                }
                renderWindow.render()
            })
        }

        function getScreenMapModelPos(point: { x: number; y: number }): Point3D {
            picker.pick([point.x, point.y, 0.0], renderer)
            if (!picker.getActors().length) {
                return [0, 0, 0]
            }
            return picker.getPickPosition() as Point3D
        }

        renderWindow.getInteractor().onRightButtonPress(handleRightClick)

        function drawPolygonSelection(autoClose: boolean): void {
            if (!polygonSelection) {
                polygonSelection = new PolygonSelection(container)
            }
            polygonSelection.update(boundary, autoClose)
        }

        function handleTeethVisible(tooth: ToothPosition = "up"): void {
            const fileIdx = tooth === "up" ? 1 : 0
            const model = models[fileIdx]
            const val = !model.actor.getVisibility()
            model.actor.setVisibility(val)
            model.actor1.setVisibility(val)
            model.actor2.setVisibility(val)
            handleArchWidthVisible(tooth, val)
            renderWindow.render()
        }

        function loadVtp(index: number, txt: string): void {
            const textEncoder = new TextEncoder()
            models[index].sourceReader.parseAsArrayBuffer(textEncoder.encode(txt))
            models[index].vertexSculptureFilter.reset()
            models[index].sourceReader.modified()
            renderWindow.render()
        }
        void loadVtp

        function triggerInitScene(
            buffers: ArrayBuffer[],
            forceFrontFace?: boolean,
            type?: string,
        ): Promise<unknown> {
            return new Promise((resolve) => {
                requestIdleCallback((idle) => {
                    if (idle.timeRemaining() > 0) {
                        resolve(_triggerInitScene(buffers, forceFrontFace ?? true, type))
                    }
                })
            })
        }

        function _triggerInitScene(
            buffers: ArrayBuffer[],
            forceFrontFace: boolean,
            type = "stl",
        ): Promise<boolean> | boolean {
            if (!buffers?.length) return false
            initScene(type)
            const textEncoder = type === "vtp" ? new TextEncoder() : null
            for (let i = 0; i < models.length; i++) {
                if (type === "vtp") {
                    const buffer = isArrayBuffer(buffers[i]) ? buffers[i] : textEncoder?.encode(buffers[i] as unknown as string)
                    models[i].sourceReader.parseAsArrayBuffer(buffer)
                } else {
                    models[i].sourceReader.parseAsArrayBuffer(buffers[i])
                }

                console.time("uniform")
                uniformStlModel(models[i].sourceReader)
                console.timeEnd("uniform")
            }
            if (!cache.get("buffers")) {
                cache.set("buffers", buffers)
            }
            return render(forceFrontFace)
        }

        function triggerModifyScene(buffers: string[]): Promise<boolean> | boolean {
            if (!buffers?.length) return false
            initScene("vtp")
            models.forEach((model, index) => {
                const textEncoder = new TextEncoder()
                model.sourceReader.parseAsArrayBuffer(textEncoder.encode(buffers[index]))
            })
            return render()
        }
        void triggerModifyScene

        function getCamera(): AnyObj {
            return renderer.getActiveCamera()
        }

        function setCamera(setInfo: CameraInfo): void {
            const camera = renderer.getActiveCamera()
            camera.setFocalPoint(...setInfo[0])
            camera.setViewUp(...setInfo[1])
            camera.setPosition(...setInfo[2])
            renderWindow.render()
        }

        function handleReset(): Promise<boolean> | boolean {
            const buffers = cache.get("buffers") as ArrayBuffer[]
            return _triggerInitScene(buffers, false)
        }

        function getFileBuffer(): string[] {
            const files: string[] = []
            for (const model of models) {
                const file = STATIC.writeSTL(model.vertexSculptureFilter.getCachedPolyData(), FormatTypes.ASCII)
                files.push(file)
            }
            return files
        }

        function getNowFile(): string[] {
            const writer = vtkXMLPolyDataWriter.newInstance()
            writer.setFormat(vtkXMLWriter.FormatTypes.ASCII)
            const files: string[] = []
            for (const model of models) {
                const file = writer.write(model.vertexSculptureFilter.getCachedPolyData())
                files.push(file)
            }
            return files
        }

        function getSinleNowFile(index: number): string {
            const writer = vtkXMLPolyDataWriter.newInstance()
            writer.setFormat(vtkXMLWriter.FormatTypes.ASCII)
            const model = models[index]
            return writer.write(model.vertexSculptureFilter.getCachedPolyData())
        }

        function getFullscreenRenderer(): AnyObj {
            return fullScreenRenderer
        }

        function triggerFinalFile(buffers: string[]): boolean {
            if (!buffers?.length) return false
            initScene("vtp")
            models.forEach((model, index) => {
                const textEncoder = new TextEncoder()
                models[index].sourceReader.parseAsArrayBuffer(textEncoder.encode(buffers[index]))
                models[index].vertexSculptureFilter.reset()
                models[index].sourceReader.modified()
            })
            return renderWindow.render()
        }

        function triggerFile(buffer: string, idx: number): boolean {
            const textEncoder = new TextEncoder()
            models[idx].sourceReader.parseAsArrayBuffer(textEncoder.encode(buffer))
            models[idx].vertexSculptureFilter.reset()
            models[idx].sourceReader.modified()
            return renderWindow.render()
        }

        function getToothMarkedPointIds(idx: number): number[] {
            if (!models[idx]) return []
            const { vertexSculptureFilter } = models[idx]
            const cachedPolyData = vertexSculptureFilter.getCachedPolyData()
            const scalars = cachedPolyData.getCellData().getScalars()
            if (scalars) {
                const scalarsData: number[] = scalars.getData()
                const markedPointIds: number[] = []
                for (let i = 0; i < scalarsData.length; i++) {
                    if (!scalarsData[i]) continue
                    const cellPintsIds: number[] = cachedPolyData.getCellPoints(i).cellPointIds
                    markedPointIds.push(...cellPintsIds)
                }
                return [...new Set(markedPointIds)]
            } else {
                return []
            }
        }

        function setGingivaModel(idx: number): void {
            if (gingivaModels[idx]) {
                const gModel = gingivaModels[idx]!
                const modelActors = [gModel.actor, gModel.actor1, gModel.actor2]
                modelActors.forEach((actor) => renderer.removeActor(actor))
                gModel.delete()
            }
            const model = new ToothModel("vtp", models[idx].name)
            model.init(renderer)
            gingivaModels[idx] = model
            const filter = model.vertexSculptureFilter
            filter.setInputData(models[idx].vertexSculptureFilter.getOutputData())
            filter.modified()
            filter.update()
            const removePoints = getToothMarkedPointIds(idx)
            filter.removePoints(removePoints)
            model.actor.setVisibility(false)
            model.actor1.setVisibility(false)
            model.actor2.setVisibility(false)
            renderWindow.render()
        }
        void setGingivaModel

        function initLabelsCanvas(): void {
            const textCanvas = document.createElement("canvas")
            textCanvas.setAttribute("width", String(container.clientWidth))
            textCanvas.setAttribute("height", String(container.clientHeight))
            textCanvas.classList.add("textCanvas", "absolute", "top-0", "left-0")
            container.appendChild(textCanvas)
            textCtx = textCanvas.getContext("2d")
        }

        function renderToothOrder(points: Array<{ name: string; coordinate: [{ x: number; y: number }, { x: number; y: number }] }>, viewUp: Point3D, modelIdx: number): void {
            const key = modelIdx === 0 ? "up" : "down"
            if (JSON.stringify(toothOrders[key]) === "{}") {
                points.forEach((item) => {
                    toothOrders[key][item.name] = {
                        face: null,
                        num: null,
                    }
                })
            }
            let maxPosVal = 0,
                maxPosIdx = 0
            for (let i = 0; i < viewUp.length; i++) {
                const item = viewUp[i]
                maxPosIdx = Math.abs(item) > Math.abs(maxPosVal) ? i : maxPosIdx
                maxPosVal = Math.abs(item) > Math.abs(maxPosVal) ? item : maxPosVal
            }
            const cdeFlag = maxPosVal > 0 ? -1 : 1
            const defaultVal = modelIdx === 0 ? -10 : 10
            const orderCenters = points.map(({ name, coordinate: [p1, p2] }) => {
                const cde1 = (p1.x + p2.x) / 2
                const cde2 = (p1.y + p2.y) / 2
                const pos: Point3D = [
                    cde1,
                    maxPosIdx === 1 ? cdeFlag * defaultVal : cdeFlag * cde2,
                    maxPosIdx === 2 ? cdeFlag * defaultVal : cdeFlag * cde2,
                ]
                return { name, pos }
            })
            orderCenters.forEach(({ pos, name }, index) => {
                addToothOrder(pos, viewUp, name, key, index === 0)
            })
            renderWindow.render()
        }

        function addToothOrder(center: Point3D, viewUp: Point3D, name: string, key: string, isRefresh: boolean): void {
            if (toothOrders[key][name]) {
                const { actor, textActor } = toothOrders[key][name]!
                renderer.removeActor(actor)
                renderer.removeActor(textActor)
                toothOrders[key][name] = null
            }
            const cylinderSource = vtkCircleSource.newInstance()
            const actor = vtkActor.newInstance()
            const mapper = vtkMapper.newInstance()
            actor.setVisibility(false)
            cylinderSource.setResolution(32)
            cylinderSource.setCenter(center)
            cylinderSource.setDirection(viewUp)
            actor.setMapper(mapper)
            mapper.setInputConnection(cylinderSource.getOutputPort())
            const textActor = vtkActor.newInstance()
            const psMapper = vtkPixelSpaceCallbackMapper.newInstance()
            textActor.setVisibility(false)
            psMapper.setInputConnection(cylinderSource.getOutputPort())
            psMapper.setCallback((coordsList: number[][]) => {
                if (textCtx && container) {
                    isRefresh && textCtx.clearRect(0, 0, container.clientWidth, container.clientHeight)
                    const [x1, y1] = coordsList[0],
                        [x2, y2] = coordsList[Math.floor(coordsList.length / 2)]
                    textCtx.font = "14px serif"
                    textCtx.textAlign = "center"
                    textCtx.textBaseline = "middle"
                    textCtx.fillText(name, (x1 + x2) / 2, container.clientHeight - (y1 + y2) / 2)
                }
            })
            textActor.setMapper(psMapper)
            renderer.addActor(textActor)
            renderer.addActor(actor)
            toothOrders[key][name] = {
                cylinderSource,
                actor,
                mapper,
                textActor,
                psMapper,
            }
        }

        function handleGingivaAbout(idx: number): boolean {
            if (!gingivaModels[idx]) return false
            const gModel = gingivaModels[idx]!
            const gVal = !gModel.actor.getVisibility()
            const orders = toothOrders[idx === 1 ? "up" : "down"]
            for (const k in orders) {
                const { actor, textActor } = orders[k]!
                actor.setVisibility(gVal)
                textActor.setVisibility(gVal)
            }
            textCtx!.clearRect(0, 0, container.clientWidth, container.clientHeight)
            gModel.actor.setVisibility(gVal)
            gModel.actor1.setVisibility(gVal)
            gModel.actor2.setVisibility(gVal)
            renderWindow.render()
            return true
        }
        void handleGingivaAbout

        function addToothWidthLabels(type: ToothPosition, key: string, name: string, P1: Point3D, P2?: Point3D): void {
            for (const k in toothWidths[type][key]) {
                renderer.removeActor(toothWidths[type][key][k])
            }
            if (P1 && !P2) {
                const p1 = addSphere(P1)
                const text1 = addTextTag(P1, name)
                toothWidths[type][key] = { p1, text1 }
            }
            if (P1 && P2) {
                const p1 = addSphere(P1)
                const p2 = addSphere(P2)
                const line = addLine(P1, P2)
                const text1 = addTextTag(P1, name)
                const text2 = addTextTag(P2, name)
                toothWidths[type][key] = { p1, p2, line, text1, text2 }
            }
            for (const k in toothWidths[type][key]) {
                renderer.addActor(toothWidths[type][key][k])
            }
            if (container && textCtx) textCtx.clearRect(0, 0, container.clientWidth, container.clientHeight)
            renderWindow.render()
        }

        function addTextTag(center: Point3D, name: string): AnyObj {
            const planeSource = vtkPlaneSource.newInstance()
            const actor = vtkActor.newInstance()
            const mapper = vtkMapper.newInstance()
            planeSource.setCenter(center)
            mapper.setInputConnection(planeSource.getOutputPort())
            actor.setMapper(mapper)
            const textActor = vtkActor.newInstance()
            const psMapper = vtkPixelSpaceCallbackMapper.newInstance()
            psMapper.setInputConnection(planeSource.getOutputPort())
            psMapper.setCallback((coordsList: number[][]) => {
                if (textCtx && container) {
                    const dpr = window.devicePixelRatio || 1
                    const [x1, y1] = coordsList[0],
                        [x2, y2] = coordsList[Math.floor(coordsList.length / 2)],
                        x = ((x1 + x2) / dpr / 2),
                        y = container.clientHeight - (y1 + y2) / dpr / 2
                    addTextBg(textCtx, x, y + 20)
                    textCtx.font = "12px serif"
                    textCtx.textAlign = "center"
                    textCtx.textBaseline = "middle"
                    textCtx.fillText(name, x, y + 20)
                }
            })
            textActor.setMapper(psMapper)
            return textActor
        }

        function addTextBg(ctx: CanvasRenderingContext2D, top: number, left: number): void {
            const radius = 10
            const width = 84,
                height = 20,
                x = top - width / 2,
                y = left - height / 2
            ctx.beginPath()
            ctx.moveTo(x + radius, y)
            ctx.arcTo(x + width, y, x + width, y + height, radius)
            ctx.arcTo(x + width, y + height, x, y + height, radius)
            ctx.arcTo(x, y + height, x, y, radius)
            ctx.arcTo(x, y, x + width, y, radius)
            ctx.fillStyle = "#ffffff"
            ctx.fill()
            ctx.closePath()
            ctx.fillStyle = "#000"
        }

        function handleArchWidthVisible(type: ToothPosition, visible: boolean): void {
            const tw_actors = toothWidths[type]
            for (const k in tw_actors) {
                for (const j in tw_actors[k]) {
                    if (tw_actors[k][j]?.setVisibility) {
                        tw_actors[k][j].setVisibility(visible)
                    }
                }
            }
            if (container && textCtx) textCtx.clearRect(0, 0, container.clientWidth, container.clientHeight)
        }

        function addLine(point1: Point3D, point2: Point3D): AnyObj {
            const lineSource = vtkLineSource.newInstance({
                point1,
                point2,
            })
            const actor = vtkActor.newInstance()
            actor.getProperty().setLineWidth(1)
            actor.getProperty().setColor(1, 1, 1)
            const mapper = vtkMapper.newInstance()
            actor.setMapper(mapper)
            mapper.setInputConnection(lineSource.getOutputPort())
            return actor
        }

        function initSpline(index: number): void {
            const widgetManager = vtkWidgetManager.newInstance()
            widgetManager.setRenderer(renderer)
            const spline = vtkSplineWidget.newInstance()
            splineWidgets[index] = { spline }
            const widgetState = spline.getWidgetState()
            widgetState.setSplineClosed(false)
            widgetState.setSplineTension(0)
            widgetState.setSplineBias(0)
            widgetState.setSplineContinuity(0)
            widgetState.setSplineBoundaryCondition(1)
            const widgetRepresentation = widgetManager.addWidget(spline)
            widgetRepresentation.setFill()
            widgetRepresentation.setOutputBorder(true)
            widgetRepresentation.setBorderColor([1, 0, 0])
            widgetManager.grabFocus(spline)
            widgetManager.releaseFocus()
        }

        function addSpline(points: Point3D[], index: number, _normal: Point3D): void {
            if (!splineWidgets[index]) {
                initSpline(index)
            }
            const { spline } = splineWidgets[index]!
            const widgetState = spline.getWidgetState()
            widgetState.clearHandleList()
            spline.addPoints(points)
            renderWindow.render()
        }

        function setSplineWidgetVisible(value: boolean, index: number): void {
            if (!splineWidgets[index]) return
            const { spline } = splineWidgets[index]!
            spline.setVisibility(value)
            renderWindow.render()
        }

        function addPlanSource(normal: Point3D, center: Point3D, index: number): void {
            const planeSource = vtkPlaneSource.newInstance()
            const mapper = vtkMapper.newInstance()
            const actor = vtkActor.newInstance()
            actor.getProperty().setColor(0, 1, 0)
            actor.getProperty().setOpacity(0.2)
            const [x1, y1, z1] = planeSource.getPoint1()
            const [x2, y2, z2] = planeSource.getPoint2()
            planeSource.setPoint1([x1 * 70, y1 * 70, z1 * 70])
            planeSource.setPoint2([x2 * 70, y2 * 70, z2 * 70])
            planeSource.setCenter(center)
            planeSource.setNormal(normal)
            mapper.setInputConnection(planeSource.getOutputPort())
            actor.setMapper(mapper)
            renderer.addActor(actor)
            splineWidgets[index]!.plane = { planeSource, mapper, actor }
        }
        void addPlanSource

        function addSphere(pos: Point3D): AnyObj {
            const [x, y, z] = pos
            const sphereSource = vtkSphereSource.newInstance()
            sphereSource.setCenter(pos)
            sphereSource.setThetaResolution(16)
            sphereSource.setPhiResolution(8)
            const actor = vtkActor.newInstance()
            const mapper = vtkMapper.newInstance()
            actor.getProperty().setColor(x ? 1 : 0, y ? 1 : 0, z ? 1 : 0)
            mapper.setInputConnection(sphereSource.getOutputPort())
            actor.setMapper(mapper)
            return actor
        }

        function toggleLight(): void {
            models.forEach((model) => {
                const v = !model.actor.getProperty().getLighting()
                model.actor.getProperty().setLighting(v)
                model.actor1.getProperty().setLighting(v)
            })
            renderWindow.render()
        }

        function getFrontViewCameraInfo(): CameraInfo {
            return (
                cameraInitInfo || [
                    [0, 0, 0],
                    [0, 1, 0],
                    [0, -1, 0],
                ]
            )
        }

        function resetCamera(): void {
            const camera = renderer.getActiveCamera()
            const arr = getFrontViewCameraInfo()
            camera.setViewUp(arr[1])
            camera.setPosition(...arr[2])
            camera.setFocalPoint(...arr[0])
        }

        function switchView(type: 0 | 1 | 2, selectedIdx: number | null = null): void {
            switch (type) {
                case 0: {
                    resetCamera()
                    renderer.resetCamera()
                    renderWindow.render()
                    break
                }
                case 1: {
                    resetCamera()
                    const camera = renderer.getActiveCamera()
                    camera.elevation(87 * (selectedIdx == 0 ? -1 : 1))
                    renderer.resetCamera()
                    renderWindow.render()
                    break
                }
                case 2: {
                    resetCamera()
                    const camera = renderer.getActiveCamera()
                    camera.azimuth(180)
                    renderer.resetCamera()
                    renderWindow.render()
                    break
                }
            }
        }

        function getFirstVisibleToothModel(): null {
            return null
        }

        return {
            triggerInitScene,
            handleDelete,
            handleSpace,
            handlePolygonSelection,
            handleSelection,
            handleEscape,
            handleReset,
            handleTeethVisible,
            handleTurnover,
            getFileBuffer,
            getCamera,
            setCamera,
            getNowFile,
            getSinleNowFile,
            getFullscreenRenderer,
            triggerFinalFile,
            initModel,
            triggerFile,
            addLine,
            toggleLight,
            switchView,
            getScreenMapModelPos,
            renderToothOrder,
            getFrontViewCameraInfo,
            getFirstVisibleToothModel,
            addSpline,
            setSplineWidgetVisible,
            addToothWidthLabels,
        }
    }
})()
