import vtkMath from "@kitware/vtk.js/Common/Core/Math"
import { d1Tod3 } from "@/core/geometry.js"

self.onmessage = ev => {
    const result = switchFrontViewWorker(ev.data)
    self.postMessage(result)
}

function createVector3() {
    return new Array(3).fill(0)
}

function switchFrontViewWorker({ obbData, boundary, meshData }) {
    let [norm, vaxis, center] = checkLeft(d1Tod3(obbData))
    const uCenter = massCenterOfCube(boundary.uMesh)
    const lCenter = massCenterOfCube(boundary.lMesh)
    const expectedVaxis = createVector3()
    vtkMath.subtract(uCenter, lCenter, expectedVaxis)
    vtkMath.normalize(expectedVaxis)
    vtkMath.normalize(vaxis)
    const temp = angleBetweenVectors(expectedVaxis, vaxis) / Math.PI * 180

    if (temp > 50) {
        vaxis = vtkMath.multiplyScalar(vaxis, -1)
    }

    const pos = createVector3()
    let z = createVector3()
    vtkMath.normalize(norm)
    vtkMath.cross(vaxis, norm, z)
    vtkMath.normalize(z)
    const center1 = createVector3()
    vtkMath.add(uCenter, z, center1)
    const pointAtFrontFace = findPointAtFrontFace(meshData, [...norm, -(vtkMath.dot(norm, uCenter))], [uCenter, center1])
    const lineToFrontFace = createVector3()
    vtkMath.subtract(pointAtFrontFace, uCenter, lineToFrontFace)
    vtkMath.normalize(lineToFrontFace)
    const temp2 = angleBetweenVectors(lineToFrontFace, z) / Math.PI * 180
    // console.log([temp, temp1, temp2, pointAtFrontFace])
    if (temp2 > 90) {
        z = vtkMath.multiplyScalar(z, -1)
    }

    vtkMath.add(center, vtkMath.multiplyScalar(z, 150.5), pos)
    return [center, vaxis, pos]
}

function checkLeft(points) {
    const [arr1, points1] = constructArr1(points)
    let j = -1
    for (let i = 0; i <= points1.length; i++) {
        if (isPointInPlane(arr1, points1[i])) {
            arr1.push(points1[i])
            j = i
            break
        }
    }

    if (j === -1) {
        return null
    }
    const arr2 = points1.slice(0)
    arr2.splice(j, 1)
    const w1 = distanceBetweenPointToPlane(arr1[0], arr2)

    const arr3 = [
        [0, 1, getDistance(arr1[0], arr1[1])],
        [1, 2, getDistance(arr1[1], arr1[2])],
        [2, 3, getDistance(arr1[2], arr1[3])],
        [3, 0, getDistance(arr1[3], arr1[0])],
        [0, 2, getDistance(arr1[0], arr1[2])],
        [1, 3, getDistance(arr1[1], arr1[3])],
    ]
    arr3.sort((a, b) => a[2] - b[2])
    const w2Item = arr3[0]
    const w3Item = arr3[2]
    const maxW = Math.max(w1, w2Item[2], w3Item[2])
    let h = null
    if (maxW === w2Item[2]) {
        h = createVector3()
        vtkMath.subtract(arr1[w2Item[0]], arr1[w2Item[1]], h)
    } else if (maxW === w3Item[2]) {
        h = createVector3()
        vtkMath.subtract(arr1[w3Item[0]], arr1[w3Item[1]], h)
    } else {
        h = normalOfPlane(arr1)
    }
    const minW = Math.min(w1, w2Item[2], w3Item[2])
    let v = null
    if (minW === w2Item[2]) {
        v = createVector3()
        vtkMath.subtract(arr1[w2Item[0]], arr1[w2Item[1]], v)
    } else if (minW === w2Item[2]) {
        v = createVector3()
        vtkMath.subtract(arr1[w3Item[0]], arr1[w3Item[1]], v)
    } else {
        v = normalOfPlane(arr1)
    }

    let dist = getDistance(arr1[0], arr2[0])
    let diagonalPoint = arr2[0]
    for (let i = 1; i < arr2.length; i++) {
        const temp = getDistance(arr1[0], arr2[i])
        if (temp > dist) {
            dist = temp
            diagonalPoint = arr2[i]
        }
    }

    let c = createVector3()
    vtkMath.add(arr1[0], diagonalPoint, c)
    c = vtkMath.multiplyScalar(c, .5)

    return [h, v, c]
}


function distanceBetweenPointToPlane(point, points) {
    const [p1, p2, p3] = points
    const v1 = createVector3()
    vtkMath.subtract(p3, p1, v1)
    const v2 = createVector3()
    vtkMath.subtract(p2, p1, v2)
    const cp = createVector3()
    vtkMath.cross(v1, v2, cp)
    vtkMath.normalize(cp)
    const [a, b, c] = cp
    let d = -vtkMath.dot(cp, p3)
    return distanceBetweenPointToPlaneV2(point, [a, b, c, d])
}

function isPointInPlane(points, point) {
    return Math.abs(distanceBetweenPointToPlane(point, points)) < 0.00001
}

function normalOfPlane(points) {
    const [p1, p2, p3] = points
    const v1 = createVector3()
    vtkMath.subtract(p3, p1, v1)
    const v2 = createVector3()
    vtkMath.subtract(p2, p1, v2)
    const res = createVector3()
    vtkMath.cross(v1, v2, res)
    return res
}

function constructArr1(points) {
    const p1 = points[0]
    const arr = [[1, getDistance(p1, points[1])], [2, getDistance(p1, points[2])]]
    for (let i = 3; i < points.length; i++) {
        const dist = getDistance(p1, points[i])
        if (dist < arr[0][1]) {
            arr[0] = [i, dist]
        } else if (dist < arr[1][1]) {
            arr[1] = [i, dist]
        }
    }

    const idxArr = [0, ...arr.map(arr1 => arr1[0])]
    const points1 = points.filter((item, idx) => !idxArr.includes(idx))

    return [[p1, ...arr.map(arr1 => points[arr1[0]])], points1]
}

function distanceBetweenPointToPlaneV2(point, planeDef) {
    const [a, b, c, d] = planeDef
    const [x1, y1, z1] = point
    return Math.abs(a * x1 + b * y1 + c * z1 + d)
}

function getDistance(p1, p2) {
    const [x1, y1, z1] = p1
    const [x2, y2, z2] = p2
    return Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2) + Math.pow(z1 - z2, 2))
}

function massCenterOfCube(points) {
    let dist = getDistance(points[0], points[1])
    let diagonalPoint = points[1]
    for (let i = 2; i < points.length; i++) {
        const temp = getDistance(points[0], points[i])
        if (temp > dist) {
            dist = temp
            diagonalPoint = points[i]
        }
    }
    let c = createVector3()
    vtkMath.add(points[0], diagonalPoint, c)
    c = vtkMath.multiplyScalar(c, .5)

    return c
}

function angleBetweenVectors(v1, v2) {
    vtkMath.normalize(v1)
    vtkMath.normalize(v2)
    return Math.acos(vtkMath.dot(v1, v2))
}

function findPointAtFrontFace(data, planeDef, centerLine) {
    const points = d1Tod3(data)
    const arr = []
    const maxItemCount = 5
    for (let i = 0; i < points.length; i++) {
        if (arr.length >= maxItemCount) break
        if (distanceBetweenPointToPlaneV2(points[i], planeDef) < 1 && distanceBetweenPointToLine(points[i], centerLine) < 1) {
            arr.push(points[i])
        }
    }
    if (arr.length < 3) {
        return arr[0]
    } else {
        const arr1 = [
            [0, 1, getDistance(arr[0], arr[1])],
            [1, 2, getDistance(arr[1], arr[2])],
            [0, 2, getDistance(arr[0], arr[2])],
        ]
        arr1.sort((a, b) => a[2] - b[2])
        return arr[arr1[0][0]]
    }
}

function distanceBetweenPointToLine(x0, pointsOfLine) {
    const [x1, x2] = pointsOfLine
    const v3 = createVector3()
    const v4 = createVector3()
    const v5 = createVector3()
    vtkMath.subtract(x2, x1, v3)
    vtkMath.subtract(x1, x0, v4)
    vtkMath.cross(v3, v4, v5)
    return getDistance(v5, [0, 0, 0]) / getDistance(v3, [0, 0, 0])
}