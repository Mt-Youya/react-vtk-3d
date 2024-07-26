import macro from '@kitware/vtk.js/macro';
import vtkPoints from '@kitware/vtk.js/Common/Core/Points';
import vtkCellArray from '@kitware/vtk.js/Common/Core/CellArray';
import vtkPolyData from '@kitware/vtk.js/Common/DataModel/PolyData';
import vtkCoordinate from '@kitware/vtk.js/Rendering/Core/Coordinate';
import { BBox, isPointInPolygonV2 as isPointInPolygon } from './geometry';

// 如果是多边形选区的话，先找到多边形的BBox，再判断这些顶点是否再多边形中
function highlightSelectionPoints(publicAPI, model) {
  model.classHierarchy.push('highlightSelectionPoints');

  let selectedPointIndexes = []

  publicAPI.requestData = (inData, outData) => {
    if (!inData[0]) return

    const input = inData[0]
    if (!input.getCells()) {
      input.buildLinks();
    }
    const output = vtkPolyData.newInstance();
    outData[0] = output;

    if (!model.selectionBox?.length) return
    console.log('model.selectionBox = ', model.selectionBox, ' ', model.toothCategory)
    let selectionBox = model.selectionBox
    const dpr = window.devicePixelRatio || 1
    const containerHeight = (window.innerHeight - 80) * dpr // TODO: 获取 RenderWindow.topContainer.Height
    // selectionBox 的原点在左下角
    if (selectionBox.length > 2) {
      const [[xmin, ymin], [xmax, ymax]] = BBox(selectionBox)
      console.log('bbox = ', [xmin, ymin, xmax, ymax])
      selectionBox = [[xmin, containerHeight - ymax], [xmax, containerHeight - ymin]]
      console.log('new selectionBox = ', selectionBox)
    }
    const selectedPoints = vtkPoints.newInstance();
    selectedPointIndexes = [];
    const cellArray = vtkCellArray.newInstance();
    const [p1, p2] = selectionBox

    const boundary = model.selectionBox.length == 2  ? [[p1[0], containerHeight - p2[1]], [p2[0], containerHeight - p1[1]]] : model.selectionBox

    const selectionNodes = window.selectorDataSource.output
    console.log('selectionNodes=', model.toothCategory, selectionNodes)
    if (selectionNodes?.length) {
      selectionNodes.forEach(selectNode => {
        // 只处理其所属的 actor
        if (model.toothCategory != selectNode.getProperties().prop.getMapper().getViewSpecificProperties().name) return
        const cellList = selectNode.getSelectionList();
        const hlCells = new Set()
        cellList.forEach(attributeID => {
          const cellPoints = input.getCellPoints(attributeID)
          const pointIds = cellPoints.cellPointIds;
          pointIds.forEach(pointId => {
            const point = input.getPoints().getPoint(pointId)
            const coord = vtkCoordinate.newInstance({
              value: point,
              renderer: window.renderer
            })
            const pointInViewport = coord.getComputedLocalDisplayValue()
            if (isPointInPolygon(boundary, pointInViewport)) {
              hlCells.add(attributeID)
              selectedPointIndexes.push(pointId)
              const pointIndex = selectedPoints.insertNextPoint(...point);
              cellArray.insertNextCell([pointIndex]);
            }
          })
        })
        window.hlCells = [...hlCells]
      })
    }

    output.setPoints(selectedPoints);
    output.setVerts(cellArray);
  }

  publicAPI.getSelectedPointIndexes = () => {
    const res = [...selectedPointIndexes]
    selectedPointIndexes = []
    return res
  }

  publicAPI.setSelectionBox = v => {
    model.selectionBox = v
    publicAPI.modified()
    if (!v?.length) {
      window.hlCells = []
    }
  }
}

const DEFAULT_VALUES = {
  selectionBox: null, // [p1, p2, ... pn]
  toothCategory: null, // L / U
}

function extend(publicAPI, model) {
  let initialValues = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  Object.assign(model, DEFAULT_VALUES, initialValues);
  macro.obj(publicAPI, model);

  macro.algo(publicAPI, model, 1, 1);
  macro.setGet(publicAPI, model, ['selectionBox', 'toothCategory'])
  macro.get(publicAPI, model, ['selectedPointIndexes'])
  highlightSelectionPoints(publicAPI, model);
}

const newInstance = macro.newInstance(extend, 'highlightSelectionPoints');

const highlightSelectionPoints$1 = {
  newInstance,
  extend,
}

export {highlightSelectionPoints$1 as default, extend, newInstance}