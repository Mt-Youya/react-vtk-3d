/**
 * 纯算法工具函数
 * 已移除 vtkMath / vtkOBBTree / vtkCoordinate 依赖
 */

type Point2D = [number, number]
type Point3D = [number, number, number]

const epsilon = 0.00000000001

export function isPointInPolygonV2(vertexes: Point2D[], point: Point2D): boolean {
    if (vertexes.length === 2) {
        const [p1, p2] = vertexes
        const topLeft: Point2D = [Math.min(p1[0], p2[0]), Math.min(p1[1], p2[1])]
        const bottomRight: Point2D = [Math.max(p1[0], p2[0]), Math.max(p1[1], p2[1])]
        const isInRange = (v: number, min: number, max: number) => v >= min && v <= max
        return isInRange(point[0], topLeft[0], bottomRight[0]) && isInRange(point[1], topLeft[1], bottomRight[1])
    } else {
        let c = 0
        let i = 0
        const npol = vertexes.length
        let j = npol - 1
        const [x, y] = point
        for (; i < npol; i++) {
            if (
                (((vertexes[i][1] <= y) && (y < vertexes[j][1])) ||
                    ((vertexes[j][1] <= y) && (y < vertexes[i][1]))) &&
                (x <
                    ((vertexes[j][0] - vertexes[i][0]) * (y - vertexes[i][1])) /
                        (vertexes[j][1] - vertexes[i][1]) +
                        vertexes[i][0])
            ) {
                c = c ? 0 : 1
            }
            j = i
        }
        return !!c
    }
}

/**
 * 这个实现有如下问题： 当射线穿过多边形顶点时，结果不正确
 */
export function isPointInPolygon(vertexes: Point2D[], point: Point2D): boolean {
    if (vertexes.length === 2) {
        const [p1, p2] = vertexes
        const topLeft: Point2D = [Math.min(p1[0], p2[0]), Math.min(p1[1], p2[1])]
        const bottomRight: Point2D = [Math.max(p1[0], p2[0]), Math.max(p1[1], p2[1])]
        const isInRange = (v: number, min: number, max: number) => v >= min && v <= max
        return isInRange(point[0], topLeft[0], bottomRight[0]) && isInRange(point[1], topLeft[1], bottomRight[1])
    } else {
        const ray = new Ray(point)
        let count = 0
        for (let i = 0; i < vertexes.length; i++) {
            const lineSegment = new LineSegment(vertexes[i], vertexes[i != 0 ? i - 1 : vertexes.length - 1])
            if (lineSegment.isInLine(ray.start)) {
                return false
            }
            const factor1 = ray.a * lineSegment.b - lineSegment.a * ray.b
            const factor2 = ray.c * lineSegment.b - lineSegment.c * ray.b
            if (!equalWithFloatPrecision(factor1, 0)) {
                const x = -factor2 / factor1
                if (ray.isInRangeX(x) && lineSegment.isInRangeX(x)) {
                    count++
                }
            }
        }
        return (count & 1) === 1
    }
}

function equalWithFloatPrecision(a: number, b: number): boolean {
    return Math.abs(a - b) < epsilon
}

class Ray {
    a: number
    b: number
    c: number
    start: Point2D

    constructor(start: Point2D) {
        this.a = 0
        this.b = 1
        this.c = -start[1]
        this.start = start
    }

    isInRangeX(px: number): boolean {
        return px > this.start[0] || equalWithFloatPrecision(px, this.start[0])
    }
}

class LineSegment {
    a: number
    b: number
    c: number
    start: Point2D
    end: Point2D

    constructor(start: Point2D, end: Point2D) {
        const [x1, y1] = start
        const [x2, y2] = end
        this.a = y2 - y1
        this.b = x1 - x2
        this.c = x2 * y1 - x1 * y2
        this.start = start
        this.end = end
    }

    isInLine(point: Point2D): boolean {
        const [x, y] = point
        return equalWithFloatPrecision(this.a * x + this.b * y + this.c, 0) && this.isInRangeX(x)
    }

    isInRangeX(px: number): boolean {
        const [x1] = this.start
        const [x2] = this.end
        const xmin = Math.min(x1, x2)
        const xmax = Math.max(x1, x2)
        return (px > xmin && px < xmax) || equalWithFloatPrecision(px, x1)
    }
}

export function BBox(vertexes: Point2D[]): [Point2D, Point2D] {
    let xmin: number | null = null
    let xmax: number | null = null
    let ymin: number | null = null
    let ymax: number | null = null
    for (const vertex of vertexes) {
        const [x, y] = vertex
        if (xmin === null || xmin > x) xmin = x
        if (xmax === null || xmax < x) xmax = x
        if (ymin === null || ymin > y) ymin = y
        if (ymax === null || ymax < y) ymax = y
    }
    return [
        [xmin!, ymin!],
        [xmax!, ymax!],
    ]
}

// ── 纯 JS 向量运算（替代 vtkMath） ──────────────────────────────────────────

function vec3Sub(a: Point3D, b: Point3D): Point3D {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
}

function vec3Add(a: Point3D, b: Point3D): Point3D {
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]]
}

function vec3Scale(a: Point3D, s: number): Point3D {
    return [a[0] * s, a[1] * s, a[2] * s]
}

export function createVector3(): Point3D {
    return [0, 0, 0]
}

export function computeSingleControlPoint(
    p0: Point2D | null,
    p1: Point2D,
    p2: Point2D | null,
): [Point2D, Point2D] {
    const t = 0.6
    const b = 0
    const c = 0
    const res: [Point2D | null, Point2D | null] = [null, null]

    const p13 = [...p1, 0] as Point3D

    if (!p0) {
        const e1 = ((1 - t) * (1 + b) * (1 - c)) / 2
        const v5 = vec3Scale(vec3Sub([...p2!, 0] as Point3D, p13), e1)
        res[0] = v5.slice(0, 2) as Point2D

        const e3 = ((1 - t) * (1 - b) * (1 - c)) / 2
        const v6 = vec3Scale(vec3Sub([...p2!, 0] as Point3D, p13), e3)
        res[1] = v6.slice(0, 2) as Point2D
    } else if (!p2) {
        const e2 = ((1 - t) * (1 - b) * (1 + c)) / 2
        const v5 = vec3Scale(vec3Sub(p13, [...p0, 0] as Point3D), e2)
        res[0] = v5.slice(0, 2) as Point2D

        const e4 = ((1 - t) * (1 + b) * (1 + c)) / 2
        const v6 = vec3Scale(vec3Sub(p13, [...p0, 0] as Point3D), e4)
        res[1] = v6.slice(0, 2) as Point2D
    } else {
        const e1 = ((1 - t) * (1 + b) * (1 - c)) / 2
        const e2 = ((1 - t) * (1 - b) * (1 + c)) / 2
        const v3 = vec3Scale(vec3Sub([...p2, 0] as Point3D, p13), e1)
        const v4 = vec3Scale(vec3Sub(p13, [...p0, 0] as Point3D), e2)
        const d1 = vec3Add(v3, v4)
        res[0] = d1.slice(0, 2) as Point2D

        const e3 = ((1 - t) * (1 - b) * (1 - c)) / 2
        const e4 = ((1 - t) * (1 + b) * (1 + c)) / 2
        const v5 = vec3Scale(vec3Sub([...p2, 0] as Point3D, p13), e3)
        const v6 = vec3Scale(vec3Sub(p13, [...p0, 0] as Point3D), e4)
        const d2 = vec3Add(v5, v6)
        res[1] = d2.slice(0, 2) as Point2D
    }

    return res as [Point2D, Point2D]
}

export function computeControlPoints(vertexes: Point2D[]): Array<[Point2D, Point2D] | null> {
    const len = vertexes.length
    const controlPoints: [Point2D, Point2D][] = []
    for (let i = 0; i < len; i++) {
        const res = computeSingleControlPoint(
            i - 1 >= 0 ? vertexes[i - 1] : null,
            vertexes[i],
            i + 1 < len ? vertexes[i + 1] : null,
        )
        controlPoints.push(res)
    }
    const arr: Array<[Point2D, Point2D] | null> = new Array(len).fill(null)
    for (let i = 1; i < len; i++) {
        const d1 = controlPoints[i - 1][1]
        const d2 = controlPoints[i][0]
        const d11 = vec3Add([...d1, 0] as Point3D, [...vertexes[i - 1], 0] as Point3D)
        const d21 = vec3Sub([...vertexes[i], 0] as Point3D, [...d2, 0] as Point3D)
        arr[i] = [d11.slice(0, 2) as Point2D, d21.slice(0, 2) as Point2D]
    }
    return arr
}

export function d1Tod3(arr: number[] | null | undefined): number[][] | null {
    if (!arr) return null
    const res: number[][] = new Array(arr.length / 3).fill(undefined)
    for (let i = 0; i < arr.length; i += 3) {
        res[i / 3] = arr.slice(i, i + 3)
    }
    return res
}
