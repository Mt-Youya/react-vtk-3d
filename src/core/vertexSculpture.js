import macro from '@kitware/vtk.js/macro';
import vtkPolyData from '@kitware/vtk.js/Common/DataModel/PolyData';
import vtkPoints from '@kitware/vtk.js/Common/Core/Points';
import vtkCellArray from '@kitware/vtk.js/Common/Core/CellArray';
import vtkDataArray from '@kitware/vtk.js/Common/Core/DataArray';
import { bSearch } from './ordered-list';

function vertexSculpture(publicAPI, model) {
  model.classHierarchy.push('vertexSculpture');

  let removingPoints = [] // 待删除的顶点索引
  let cachedPolyData = null

  publicAPI.requestData = (inData, outData) => {
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
    const newPoints = vtkPoints.newInstance();
    const points = cachedPolyData.getPoints();
    const polys = cachedPolyData.getPolys();
    const newPolys = vtkCellArray.newInstance();
    // 删除点之后，polys 里面的索引需要重新调整
    const idxMap = new Map()
    let pointsLen = points.getNumberOfPoints();
    // 1. 删除顶点
    // 2. 建立旧顶点索引与新顶点索引的映射
    // 3. 循环所有边，把里面的旧索引用新索引替换
    let removingIdx = 0
    for (let i = 0; i < pointsLen; i++) {
      if (removingIdx >= removingPoints.length || i != removingPoints[removingIdx]) {
        newPoints.insertNextPoint(...points.getPoint(i))
        const newI = newPoints.getNumberOfPoints() - 1
        if (i != newI) {
          idxMap.set(i, newI)
        }
      } else {
        removingIdx++
      }
    }

    const len = polys.getNumberOfCells(); // [len1, x1, y1, z1, ..., lenn, xn, yn, zn]
    let cellIdx = 0;
    const dataArr = polys.getData();
    const cellData = cachedPolyData.getCellData();
    const pointData = cachedPolyData.getPointData();
    const scalars = cellData.getScalars();
    const pScalars = pointData.getScalars();
    const normals = cellData.getNormals();
    const newScalars = scalars ? vtkDataArray.newInstance({
      empty: true
    }) : null;
    const newPScalars = pScalars ? vtkDataArray.newInstance({
      empty: true
    }) : null;
    const newNormals = normals ? vtkDataArray.newInstance({
      empty: true
    }) : null;
    if (normals) {
      newNormals.setNumberOfComponents(normals.getNumberOfComponents());
    }
    for (let i = 0; i < len; i++) {
      // 移除包含删除点的多边形
      // 维持每个面的颜色不变
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
        const newPoly = poly.map(pointIdx => idxMap.has(pointIdx) ? idxMap.get(pointIdx) : pointIdx)
        newPolys.insertNextCell(newPoly)
        if (scalars) {
          newScalars.insertNextTuple(scalars.getTuple(i))
        }
        // newPScalars.insertNextTuple(pScalars.getTuple(i))
        if (normals) {
          newNormals.insertNextTuple(normals.getTuple(i))
        }
      }
    }
    cachedPolyData.setPoints(newPoints);
    cachedPolyData.setPolys(newPolys);
    if (newScalars) {
      cellData.setScalars(newScalars);
    }
    // pointData.setScalars(newPScalars);
    if (newNormals) {
      cellData.setNormals(newNormals)
    }

    removingPoints = []
  }

  publicAPI.removePoints = (indexArr) => {
    removingPoints = indexArr
    publicAPI.modified()
    publicAPI.update()
  }

  publicAPI.setCellInfo = (cellIdx, toothIdx) => {
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
  polyData: null, // vtxPolyData
}


function extend(publicAPI, model) {
  let initialValues = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : {};
  Object.assign(model, DEFAULT_VALUES, initialValues);
  macro.obj(publicAPI, model);

  macro.algo(publicAPI, model, 1, 1);
  macro.setGet(publicAPI, model, ['polyData'])
  vertexSculpture(publicAPI, model);
}

const newInstance = macro.newInstance(extend, 'vertexSculpture');

const vertexSculpture$1 = {
  newInstance,
  extend,
}

export { vertexSculpture$1 as default, extend, newInstance }