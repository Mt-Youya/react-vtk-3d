import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor"
import vtkMapper from "@kitware/vtk.js/Rendering/Core/Mapper"
import vtkXMLPolyDataReader from "@kitware/vtk.js/IO/XML/XMLPolyDataReader"
import highlightSelectionPoints from "./highlightSelectionPoints"
import vertexSculpture from "./vertexSculpture"
import vtkSTLReader from "@kitware/vtk.js/IO/Geometry/STLReader"
import vtkCoordinate from "@kitware/vtk.js/Rendering/Core/Coordinate"
import { isPointInPolygonV2 as isPointInPolygon } from "./geometry"
import { UniqueOrderedList } from "./ordered-list"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = any

type Point2D = [number, number]
type Point3D = [number, number, number]

export default class ToothModel {
    readerType: string
    name: string
    sourceReader: AnyObj = null
    mapper: AnyObj = null
    mapper1: AnyObj = null
    mapper2: AnyObj = null
    actor: AnyObj = null
    actor1: AnyObj = null
    actor2: AnyObj = null
    vertexSculptureFilter: AnyObj = null
    highlightSelectionPointsFilter: AnyObj = null

    constructor(readerType: string, name: string) {
        this.readerType = readerType
        this.name = name
    }

    init(renderer: AnyObj): void {
        this.sourceReader = null
        switch (this.readerType) {
            case "stl":
                this.sourceReader = vtkSTLReader.newInstance()
                break
            case "vtp":
                this.sourceReader = vtkXMLPolyDataReader.newInstance()
                break
        }

        this.mapper = vtkMapper.newInstance({
            viewSpecificProperties: {
                name: this.name,
            },
        })
        const mapper = this.mapper
        mapper.setScalarModeToUseCellData()
        mapper.setColorModeToMapScalars()
        const lut = mapper.getLookupTable()
        const values = new Array(26).fill(null)
        values.forEach((_: null, idx: number) => (values[idx] = idx + 1))
        lut.setIndexedLookup(true)
        lut.setNanColor([1, 0.635, 0.561, 1.0])
        lut.setAnnotations(values, new Array(values.length).fill(""))
        lut.setTable([
            [150, 117, 148, 255],
            [170, 255, 255, 255],
            [255, 0, 127, 255],
            [170, 255, 127, 255],
            [0, 0, 127, 255],
            [255, 255, 127, 255],
            [255, 170, 255, 255],
            [255, 255, 255, 255],
            [77, 99, 82, 255],
            [255, 0, 255, 255],
            [255, 255, 0, 255],
            [0, 0, 255, 255],
            [0, 255, 0, 255],
            [255, 0, 0, 255],
            [0, 255, 255, 255],
            [202, 200, 232, 255],
            [68, 114, 196, 255],
            [255, 80, 80, 255],
            [0, 51, 0, 255],
            [102, 102, 255, 255],
            [204, 204, 0, 255],
            [102, 0, 51, 255],
            [231, 232, 228, 255],
            [95, 95, 95, 255],
            [102, 0, 204, 255],
            [255, 153, 0, 255],
        ])
        this.mapper1 = vtkMapper.newInstance()
        const mapper1 = this.mapper1
        mapper1.setScalarModeToUsePointData()

        this.actor = vtkActor.newInstance()
        const actor = this.actor
        actor.setMapper(mapper)
        renderer.addActor(actor)

        this.actor1 = vtkActor.newInstance()
        const actor1 = this.actor1
        actor1.setMapper(mapper1)
        actor1.getProperty().setColor(0, 0.4, 0)
        actor1.getProperty().setRepresentationToWireframe()
        actor1.setPickable(false)
        renderer.addActor(actor1)

        this.vertexSculptureFilter = vertexSculpture.newInstance()
        const vertexSculptureFilter = this.vertexSculptureFilter
        vertexSculptureFilter.setInputConnection(this.sourceReader.getOutputPort())
        mapper.setInputConnection(vertexSculptureFilter.getOutputPort())
        mapper1.setInputConnection(vertexSculptureFilter.getOutputPort())

        this.actor2 = vtkActor.newInstance()
        const actor2 = this.actor2
        this.mapper2 = vtkMapper.newInstance()
        const mapper2 = this.mapper2
        this.highlightSelectionPointsFilter = highlightSelectionPoints.newInstance({
            toothCategory: this.name,
        })
        const highlightSelectionPointsFilter = this.highlightSelectionPointsFilter
        highlightSelectionPointsFilter.setInputConnection(vertexSculptureFilter.getOutputPort())
        mapper2.setInputConnection(highlightSelectionPointsFilter.getOutputPort())
        actor2.setMapper(mapper2)
        actor2.getProperty().setColor(0, 1, 1)
        actor2.getProperty().setPointSize(6)
        actor2.getProperty().setRepresentationToPoints()
        renderer.addActor(actor2)
    }

    collapseInward(pointIdxArr: number[]): number[] {
        const mesh = this.vertexSculptureFilter.getCachedPolyData()
        const len: number = mesh.getNumberOfCells()
        const pointData = mesh.getPoints()
        let cellIdx = 0
        const dataArr = mesh.getPolys().getData()

        const currentSelectionBox: Point2D[] = this.highlightSelectionPointsFilter.getSelectionBox()
        const [p1, p2] = currentSelectionBox
        const containerHeight = window.innerHeight
        const currentBoundary: Point2D[] =
            currentSelectionBox.length == 2
                ? [
                      [p1[0], containerHeight - p2[1]],
                      [p2[0], containerHeight - p1[1]],
                  ]
                : currentSelectionBox
        let iteratation = new UniqueOrderedList(pointIdxArr)
        const faces: number[][] = []
        for (let i = 0; i < len; i++) {
            const poly = dataArr.slice(cellIdx + 1, cellIdx + 1 + dataArr[cellIdx])
            cellIdx += dataArr[cellIdx] + 1
            faces.push(poly)
        }
        const res = new UniqueOrderedList([])
        res.merge(iteratation.data)
        let orderedList: UniqueOrderedList | null = null
        let iter = 1
        do {
            orderedList = iteratation
            iteratation = new UniqueOrderedList([])
            for (let i = 0; i < faces.length; i++) {
                const poly = faces[i]
                let num = 0
                const temp: number[] = []
                for (const idx of poly) {
                    if (orderedList.findIndex(idx) != -1) {
                        num++
                    } else {
                        temp.push(idx)
                    }
                }
                if (num >= 1) {
                    for (const idx of temp) {
                        const coordObj = vtkCoordinate.newInstance({
                            value: pointData.getPoint(idx),
                            renderer: (window as Window & { renderer?: unknown }).renderer,
                        })
                        const coord = coordObj.getComputedLocalDisplayValue() as Point2D
                        if (isPointInPolygon(currentBoundary, coord)) {
                            iteratation.add(idx)
                        }
                    }
                }
            }
            res.merge(iteratation.data)
            iter++
        } while (!iteratation.empty() && iter < 5)
        return res.data
    }

    pointsInBoundary(): number[] {
        const mesh = this.vertexSculptureFilter.getCachedPolyData()
        const pointData = mesh.getPoints()
        const len: number = mesh.getNumberOfPoints()
        const pointIdxArr: number[] = []
        const currentSelectionBox: Point2D[] = this.highlightSelectionPointsFilter.getSelectionBox()
        const [p1, p2] = currentSelectionBox
        const dpr = window.devicePixelRatio || 1
        const containerHeight = (window.innerHeight - 80) * dpr
        const currentBoundary: Point2D[] =
            currentSelectionBox.length == 2
                ? [
                      [p1[0], containerHeight - p2[1]],
                      [p2[0], containerHeight - p1[1]],
                  ]
                : currentSelectionBox
        const coords: Point2D[] = []
        for (let i = 0; i < len; i++) {
            const coordObj = vtkCoordinate.newInstance({
                value: pointData.getPoint(i) as Point3D,
                renderer: (window as Window & { renderer?: unknown }).renderer,
            })
            const coord = coordObj.getComputedLocalDisplayValue() as Point2D
            coords.push(coord)
        }

        for (let i = 0; i < len; i++) {
            const coord = coords[i]
            if (isPointInPolygon(currentBoundary, coord)) {
                pointIdxArr.push(i)
            }
        }

        return pointIdxArr
    }

    delete(): void {
        const { actor, actor1, actor2, mapper, mapper1, mapper2, vertexSculptureFilter, highlightSelectionPointsFilter, sourceReader } = this
        const arr = [actor, actor1, actor2, mapper, mapper1, mapper2, vertexSculptureFilter, highlightSelectionPointsFilter, sourceReader]
        arr.forEach((item) => {
            item?.delete()
        })
    }
}
