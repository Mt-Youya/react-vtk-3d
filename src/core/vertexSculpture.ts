import macro from "@kitware/vtk.js/macro"
import vtkPolyData from "@kitware/vtk.js/Common/DataModel/PolyData"
import vtkPoints from "@kitware/vtk.js/Common/Core/Points"
import vtkCellArray from "@kitware/vtk.js/Common/Core/CellArray"
import vtkDataArray from "@kitware/vtk.js/Common/Core/DataArray"
import { bSearch } from "./ordered-list"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = any

function vertexSculpture(publicAPI: AnyObj, model: AnyObj): void {
    model.classHierarchy.push("vertexSculpture")

    let removingPoints: number[] = []
    let cachedPolyData: AnyObj = null

    publicAPI.requestData = (inData: AnyObj[], outData: AnyObj[]) => {
        if (!inData[0]) return

        if (cachedPolyData) {
            outData[0] = cachedPolyData
        } else {
            cachedPolyData = vtkPolyData.newInstance()
            cachedPolyData.shallowCopy(inData[0])
            outData[0] = cachedPolyData
        }

        if (!removingPoints?.length) {
            return
        }
        removingPoints.sort((a, b) => a - b)
        const newPoints = vtkPoints.newInstance()
        const points = cachedPolyData.getPoints()
        const polys = cachedPolyData.getPolys()
        const newPolys = vtkCellArray.newInstance()
        const idxMap = new Map<number, number>()
        const pointsLen: number = points.getNumberOfPoints()

        let removingIdx = 0
        for (let i = 0; i < pointsLen; i++) {
            if (removingIdx >= removingPoints.length || i != removingPoints[removingIdx]) {
                newPoints.insertNextPoint(...points.getPoint(i))
                const newI: number = newPoints.getNumberOfPoints() - 1
                if (i != newI) {
                    idxMap.set(i, newI)
                }
            } else {
                removingIdx++
            }
        }

        const len: number = polys.getNumberOfCells()
        let cellIdx = 0
        const dataArr = polys.getData()
        const cellData = cachedPolyData.getCellData()
        const pointData = cachedPolyData.getPointData()
        const scalars = cellData.getScalars()
        const pScalars = pointData.getScalars()
        const normals = cellData.getNormals()
        const newScalars = scalars
            ? vtkDataArray.newInstance({
                  empty: true,
              })
            : null
        const newPScalars = pScalars
            ? vtkDataArray.newInstance({
                  empty: true,
              })
            : null
        void newPScalars
        const newNormals = normals
            ? vtkDataArray.newInstance({
                  empty: true,
              })
            : null
        if (normals) {
            newNormals.setNumberOfComponents(normals.getNumberOfComponents())
        }
        for (let i = 0; i < len; i++) {
            const poly = polys.getCell(cellIdx)
            cellIdx += dataArr[cellIdx] + 1
            if (!poly.length) continue
            let found = false
            for (const idx of poly) {
                if (bSearch(removingPoints, idx) != -1) {
                    found = true
                    break
                }
            }

            if (!found) {
                const newPoly = poly.map((pointIdx: number) =>
                    idxMap.has(pointIdx) ? idxMap.get(pointIdx) : pointIdx,
                )
                newPolys.insertNextCell(newPoly)
                if (scalars) {
                    newScalars.insertNextTuple(scalars.getTuple(i))
                }
                if (normals) {
                    newNormals.insertNextTuple(normals.getTuple(i))
                }
            }
        }
        cachedPolyData.setPoints(newPoints)
        cachedPolyData.setPolys(newPolys)
        if (newScalars) {
            cellData.setScalars(newScalars)
        }
        if (newNormals) {
            cellData.setNormals(newNormals)
        }

        removingPoints = []
    }

    publicAPI.removePoints = (indexArr: number[]) => {
        removingPoints = indexArr
        publicAPI.modified()
        publicAPI.update()
    }

    publicAPI.setCellInfo = (cellIdx: number, toothIdx: number) => {
        if (!cachedPolyData) return

        const cellData = cachedPolyData.getCellData()
        let scalars = cellData.getScalars()
        if (!scalars) {
            scalars = vtkDataArray.newInstance({
                size: cachedPolyData.getNumberOfCells(),
                numberOfComponents: 1,
            })
            scalars.getData().fill(0)
            cellData.setScalars(scalars)
        }

        scalars.setTuple(cellIdx, [toothIdx])
        scalars.modified()
        cachedPolyData.modified()
    }

    publicAPI.getCachedPolyData = () => {
        return cachedPolyData
    }

    publicAPI.reset = () => {
        cachedPolyData = null
        publicAPI.modified()
        publicAPI.update()
    }
}

const DEFAULT_VALUES = {
    polyData: null,
}

function extend(publicAPI: AnyObj, model: AnyObj, initialValues: AnyObj = {}): void {
    Object.assign(model, DEFAULT_VALUES, initialValues)
    macro.obj(publicAPI, model)
    macro.algo(publicAPI, model, 1, 1)
    macro.setGet(publicAPI, model, ["polyData"])
    vertexSculpture(publicAPI, model)
}

const newInstance = macro.newInstance(extend, "vertexSculpture")

const vertexSculpture$1 = {
    newInstance,
    extend,
}

export { vertexSculpture$1 as default, extend, newInstance }
