import macro from "@kitware/vtk.js/macro"
import vtkPoints from "@kitware/vtk.js/Common/Core/Points"
import vtkCellArray from "@kitware/vtk.js/Common/Core/CellArray"
import vtkPolyData from "@kitware/vtk.js/Common/DataModel/PolyData"
import vtkCoordinate from "@kitware/vtk.js/Rendering/Core/Coordinate"
import { BBox, isPointInPolygonV2 as isPointInPolygon } from "./geometry"
import { getRenderer, getSelectorDataSource, setHlCells, clearHlCells } from "./context"
import { DeviceUtils } from "@/utils/device"
import { logger } from "@/utils/logger"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = any

type Point2D = [number, number]

function highlightSelectionPoints(publicAPI: AnyObj, model: AnyObj): void {
  model.classHierarchy.push("highlightSelectionPoints")

  let selectedPointIndexes: number[] = []

  publicAPI.requestData = (inData: AnyObj[], outData: AnyObj[]) => {
    if (!inData[0]) return

    const input = inData[0]
    if (!input.getCells()) {
      input.buildLinks()
    }
    const output = vtkPolyData.newInstance()
    outData[0] = output

    if (!model.selectionBox?.length) return
    logger.debug("model.selectionBox = ", model.selectionBox, " ", model.toothCategory)
    let selectionBox: Point2D[] = model.selectionBox
    const dpr = DeviceUtils.getDPR()
    const containerHeight = DeviceUtils.getContainerHeightPx()
    if (selectionBox.length > 2) {
      const [[xmin, ymin], [xmax, ymax]] = BBox(selectionBox)
      logger.debug("bbox = ", [xmin, ymin, xmax, ymax])
      selectionBox = [
        [xmin, containerHeight - ymax],
        [xmax, containerHeight - ymin],
      ]
      logger.debug("new selectionBox = ", selectionBox)
    }
    const selectedPoints = vtkPoints.newInstance()
    selectedPointIndexes = []
    const cellArray = vtkCellArray.newInstance()
    const [p1, p2] = selectionBox

    const boundary: Point2D[] =
      model.selectionBox.length == 2
        ? [
            [p1[0], containerHeight - p2[1]],
            [p2[0], containerHeight - p1[1]],
          ]
        : model.selectionBox

    const selectorDataSource = getSelectorDataSource()
    const selectionNodes = selectorDataSource?.output
    logger.debug("selectionNodes=", model.toothCategory, selectionNodes)
    if (selectionNodes?.length) {
      selectionNodes.forEach((selectNode: AnyObj) => {
        if (
          model.toothCategory !=
          selectNode.getProperties().prop.getMapper().getViewSpecificProperties().name
        )
          return
        const cellList = selectNode.getSelectionList()
        const hlCells = new Set<number>()
        cellList.forEach((attributeID: number) => {
          const cellPoints = input.getCellPoints(attributeID)
          const pointIds = cellPoints.cellPointIds
          pointIds.forEach((pointId: number) => {
            const point = input.getPoints().getPoint(pointId)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const coord = vtkCoordinate.newInstance({
              value: point,
              renderer: getRenderer(),
            } as any)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const pointInViewport = (coord as any).getComputedLocalDisplayValue() as Point2D
            if (isPointInPolygon(boundary, pointInViewport)) {
              hlCells.add(attributeID)
              selectedPointIndexes.push(pointId)
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const pointIndex = (selectedPoints as any).insertNextPoint(...(point as [number, number, number]))
              cellArray.insertNextCell([pointIndex])
            }
          })
        })
        setHlCells([...hlCells])
      })
    }

    output.setPoints(selectedPoints)
    output.setVerts(cellArray)
  }

  publicAPI.getSelectedPointIndexes = () => {
    const res = [...selectedPointIndexes]
    selectedPointIndexes = []
    return res
  }

  publicAPI.setSelectionBox = (v: Point2D[] | null) => {
    model.selectionBox = v
    publicAPI.modified()
    if (!v?.length) {
      clearHlCells()
    }
  }
}

const DEFAULT_VALUES = {
  selectionBox: null,
  toothCategory: null,
}

function extend(publicAPI: AnyObj, model: AnyObj, initialValues: AnyObj = {}): void {
  Object.assign(model, DEFAULT_VALUES, initialValues)
  macro.obj(publicAPI, model)
  macro.algo(publicAPI, model, 1, 1)
  macro.setGet(publicAPI, model, ["selectionBox", "toothCategory"])
  macro.get(publicAPI, model, ["selectedPointIndexes"])
  highlightSelectionPoints(publicAPI, model)
}

const newInstance = macro.newInstance(extend, "highlightSelectionPoints")

const highlightSelectionPoints$1 = {
  newInstance,
  extend,
}

export { highlightSelectionPoints$1 as default, extend, newInstance }
