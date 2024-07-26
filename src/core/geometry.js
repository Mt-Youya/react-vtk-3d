import vtkMath from "@kitware/vtk.js/Common/Core/Math"
import vtkOBBTree from "@kitware/vtk.js/Filters/General/OBBTree"
import vtkCoordinate from "@kitware/vtk.js/Rendering/Core/Coordinate"

const epsilon = 0.00000000001

export function isPointInPolygonV2(vertexes, point) {
    if (vertexes.length === 2) {
        // 矩形框：[左上角, 右下角]
        const [p1, p2] = vertexes
        const topLeft = [Math.min(p1[0], p2[0]), Math.min(p1[1], p2[1])]
        const bottomRight = [Math.max(p1[0], p2[0]), Math.max(p1[1], p2[1])]
        const isInRange = (v, min, max) => v >= min && v <= max
        return isInRange(point[0], topLeft[0], bottomRight[0]) && isInRange(point[1], topLeft[1], bottomRight[1])
    } else {
        let c = 0
        let i = 0
        const npol = vertexes.length
        let j = npol - 1
        const [x, y] = point
        for (; i < npol; i++) {
            if ((((vertexes[i][1] <= y) && (y < vertexes[j][1])) ||
                    ((vertexes[j][1] <= y) && (y < vertexes[i][1]))) &&
                (x < (vertexes[j][0] - vertexes[i][0]) * (y - vertexes[i][1]) / (vertexes[j][1] - vertexes[i][1]) + vertexes[i][0])) {
                c = !c
            }
            j = i
        }
        return !!c
    }
}

/**
 *
 * 这个实现有如下问题： 当射线穿过多边形顶点时，结果不正确
 *
 * @param {*} vertexes 多边形顶点
 * @param {*} point 检测点
 * @returns
 */
export function isPointInPolygon(vertexes, point) {
    if (vertexes.length === 2) {
        // 矩形框：[左上角, 右下角]
        const [p1, p2] = vertexes
        const topLeft = [Math.min(p1[0], p2[0]), Math.min(p1[1], p2[1])]
        const bottomRight = [Math.max(p1[0], p2[0]), Math.max(p1[1], p2[1])]
        const isInRange = (v, min, max) => v >= min && v <= max
        return isInRange(point[0], topLeft[0], bottomRight[0]) && isInRange(point[1], topLeft[1], bottomRight[1])
    } else {
        // 点是否在任意多边形内
        const ray = new Ray(point, 0)
        let count = 0
        for (let i = 0; i < vertexes.length; i++) {
            const lineSegment = new LineSegment(vertexes[i], vertexes[i != 0 ? i - 1 : vertexes.length - 1])
            if (lineSegment.isInLine(ray.start)) {
                // 点在边上
                return false
            }
            const factor1 = ray.a * lineSegment.b - lineSegment.a * ray.b
            const factor2 = ray.c * lineSegment.b - lineSegment.c * ray.b
            if (!equalWithFloatPrecision(factor1, 0)) {
                // 仅有一个交点
                const x = -factor2 / factor1
                if (ray.isInRangeX(x) && lineSegment.isInRangeX(x)) {
                    count++
                }
            }
        }
        return count & 1 === 1 // 奇数
    }
}

function equalWithFloatPrecision(a, b) {
    return Math.abs(a - b) < epsilon
}

// 过 start 点向右的射线，包含 start 端点
class Ray {
    constructor(start, slop) {
        this.a = 0
        this.b = 1
        this.c = -start[1]
        this.start = start
        this.end = undefined
    }

    isInRangeX(px) {
        return px > this.start[0] || (equalWithFloatPrecision(px, this.start[0]))
    }
}

// 线段包含 start 端点，不包含 end 端点
class LineSegment {
    constructor(start, end) {
        const [x1, y1] = start
        const [x2, y2] = end
        this.a = y2 - y1
        this.b = x1 - x2
        this.c = x2 * y1 - x1 * y2
        this.start = start
        this.includeStart =
            this.end = end
    }

    isInLine(point) {
        const [x, y] = point
        return equalWithFloatPrecision(this.a * x + this.b * y + this.c, 0) && this.isInRangeX(x)
    }

    isInRangeX(px) {
        const [x1] = this.start
        const [x2] = this.end
        const xmin = Math.min(x1, x2)
        const xmax = Math.max(x1, x2)
        return (px > xmin && px < xmax) || (equalWithFloatPrecision(px, x1))
    }
}

// 计算多边形的 BBox 包围盒
export function BBox(vertexes) {
    let xmin = null
    let xmax = null
    let ymin = null
    let ymax = null
    for (const vertex of vertexes) {
        const [x, y] = vertex
        if (xmin === null || xmin > x) {
            xmin = x
        }
        if (xmax === null || xmax < x) {
            xmax = x
        }

        if (ymin === null || ymin > y) {
            ymin = y
        }
        if (ymax === null || ymax < y) {
            ymax = y
        }
    }
    return [[xmin, ymin], [xmax, ymax]]
}

function distanceBetweenPointToPlaneV2(point, planeDef) {
    const [a, b, c, d] = planeDef
    const [x1, y1, z1] = point
    return Math.abs(a * x1 + b * y1 + c * z1 + d)
}

function distanceBetweenPointToPlane1(point, norm, dotOnPlane) {
    vtkMath.normalize(norm)
    return distanceBetweenPointToPlaneV2(point, [...norm, -vtkMath.dot(norm, dotOnPlane)])
}

export function createVector3() {
    return new Array(3).fill(0)
}

export function computeSingleControlPoint(p0, p1, p2) {
    const t = 0.6
    const b = 0
    const c = 0
    const res = new Array(2).fill(null)
    if (!p0) {
        const e1 = (1 - t) * (1 + b) * (1 - c) / 2
        let v5 = createVector3()
        vtkMath.subtract([...p2, 0], [...p1, 0], v5)
        v5 = vtkMath.multiplyScalar(v5, e1)
        res[0] = v5.slice(0, 2)

        const e3 = (1 - t) * (1 - b) * (1 - c) / 2
        let v6 = createVector3()
        vtkMath.subtract([...p2, 0], [...p1, 0], v6)
        v6 = vtkMath.multiplyScalar(v6, e3)
        res[1] = v6.slice(0, 2)
    } else if (!p2) {
        const e2 = (1 - t) * (1 - b) * (1 + c) / 2
        let v5 = createVector3()
        vtkMath.subtract([...p1, 0], [...p0, 0], v5)
        v5 = vtkMath.multiplyScalar(v5, e2)
        res[0] = v5.slice(0, 2)

        const e4 = (1 - t) * (1 + b) * (1 + c) / 2
        let v6 = createVector3()
        vtkMath.subtract([...p1, 0], [...p0, 0], v6)
        v6 = vtkMath.multiplyScalar(v6, e4)
        res[1] = v6.slice(0, 2)
    } else {
        const e1 = (1 - t) * (1 + b) * (1 - c) / 2
        const e2 = (1 - t) * (1 - b) * (1 + c) / 2
        let v3 = createVector3()
        let v4 = createVector3()
        vtkMath.subtract([...p2, 0], [...p1, 0], v3)
        vtkMath.subtract([...p1, 0], [...p0, 0], v4)
        const d1 = createVector3()
        v3 = vtkMath.multiplyScalar(v3, e1)
        v4 = vtkMath.multiplyScalar(v4, e2)
        vtkMath.add(v3, v4, d1)
        res[0] = d1.slice(0, 2)

        const e3 = (1 - t) * (1 - b) * (1 - c) / 2
        const e4 = (1 - t) * (1 + b) * (1 + c) / 2
        let v5 = createVector3()
        let v6 = createVector3()
        vtkMath.subtract([...p2, 0], [...p1, 0], v5)
        vtkMath.subtract([...p1, 0], [...p0, 0], v6)
        const d2 = createVector3()
        v5 = vtkMath.multiplyScalar(v5, e3)
        v6 = vtkMath.multiplyScalar(v6, e4)
        vtkMath.add(v5, v6, d2)
        res[1] = d2.slice(0, 2)
    }

    return res
}

export function computeControlPoints(vertexes) {
    const len = vertexes.length
    const controlPoints = []
    for (let i = 0; i < len; i++) {
        const res = computeSingleControlPoint(i - 1 >= 0 ? vertexes[i - 1] : null, vertexes[i], i + 1 < len ? vertexes[i + 1] : null)
        controlPoints.push(res)
    }
    const arr = new Array(len).fill(null)
    for (let i = 1; i < len; i++) {
        const d1 = controlPoints[i - 1][1]
        const d2 = controlPoints[i][0]
        const d11 = createVector3()
        vtkMath.add([...d1, 0], [...vertexes[i - 1], 0], d11)
        const d21 = createVector3()
        vtkMath.subtract([...vertexes[i], 0], [...d2, 0], d21)
        arr[i] = [d11, d21]
    }
    return arr
}

export function uniformStlModel(reader) {
    const mesh = reader.getOutputData()
    const points = mesh.getPoints()
    const polys = mesh.getPolys()
    const len = polys.getNumberOfCells()
    const pointsLen = mesh.getNumberOfPoints()
    const dataArr = polys.getData()
    let cellIdx = 0
    const map = new Map()
    let pointIdx = 0
    const newPointsArr = []
    for (let j = 0; j < pointsLen; j++) {
        const p = points.getPoint(j)
        const key = p.join()
        if (!map.has(key)) {
            map.set(key, pointIdx)
            newPointsArr.push(...p)
            pointIdx++
        }
    }

    for (let i = 0; i < len; i++) {
        const poly = polys.getCell(cellIdx)
        const newIdxArr = []
        for (const k of poly) {
            const currentPoint = points.getPoint(k)
            newIdxArr.push(map.get(currentPoint.join()))
        }
        for (let m = 0; m < dataArr[cellIdx]; m++) {
            dataArr[cellIdx + m + 1] = newIdxArr[m]
        }
        cellIdx += dataArr[cellIdx] + 1
    }
    polys.setData(dataArr)
    points.setData(new Float32Array(newPointsArr))
    // console.log(mesh.getNumberOfPoints())
}

export function getModelMmToPx(mesh, center, viewPlaneNorm) {
    const points = mesh.getPoints()
    const pointsLen = mesh.getNumberOfPoints()
    const expectedPoints = []
    for (let i = 0; i < pointsLen; i++) {
        if (expectedPoints.length >= 10) break
        const p = points.getPoint(i)
        if (distanceBetweenPointToPlane1(p, viewPlaneNorm, center) < 0.1) {
            expectedPoints.push(p)
        }
    }

    let maxDist = -1
    let targetIdx = -1
    for (let i = 1; i < expectedPoints.length; i++) {
        const dist = distance(expectedPoints[0], expectedPoints[i])
        if (dist > maxDist) {
            targetIdx = i
            maxDist = dist
        }
    }

    const [coord1, coord2] = [expectedPoints[0], expectedPoints[targetIdx]].map(item => {
        const coordObj = vtkCoordinate.newInstance({
            value: item,
            renderer: window.renderer,
        })
        return coordObj.getComputedLocalDisplayValue()
    })

    const pxDist = distance([...coord1, 0], [...coord2, 0])
    if (pxDist < 5) {
        console.warn(`too small pxDist = ${pxDist}`)
    }

    return maxDist / pxDist
}

export function d1Tod3(arr) {
    if (!arr) return null
    const res = new Array(arr.length / 3).fill(void 0)
    for (let i = 0; i < arr.length; i += 3) {
        res[i / 3] = arr.slice(i, i + 3)
    }
    return res
}
