import vtkOBBTree from "@kitware/vtk.js/Filters/General/OBBTree"
import vtkAppendPolyData from "@kitware/vtk.js/Filters/General/AppendPolyData"
import ViewWorker from "@/workers/switchFrontView.js?worker"
import { d1Tod3 } from "@/core/geometry.js"
import useIdleCallback from "@/hooks/useIdleCallback.js"

// 找到上下颌的正面坐标系
export default async function switchFrontViewWorker(...args){
    const worker = new ViewWorker()
    requestIdleCallback(async idle => {
        if (idle.timeRemaining()) {
            console.time("working")
            const workingResults = await working(...args)
            worker.postMessage(workingResults)
            console.timeEnd("working")
        }
    })
    return new Promise(resolve => {
        worker.onmessage = ev => {
            resolve(ev.data)
            worker.terminate()
        }
    })
}

function working(uMesh, lMesh){
    const appendPolyData = vtkAppendPolyData.newInstance()
    return new Promise(resolve => {
        useIdleCallback(() => {
            appendPolyData.setInputConnection(uMesh.getOutputPort())
            appendPolyData.addInputConnection(lMesh.getOutputPort())
            const obbTree = vtkOBBTree.newInstance({
                dataset: appendPolyData.getOutputData(),
                maxLevel: 1,
            })
            obbTree.buildLocator()
            const obbMesh = obbTree.generateRepresentation(0)

            const obbData = obbMesh.getPoints().getData()
            const boundary = {
                lMesh: obbBoundary(lMesh.getOutputData()),
                uMesh: obbBoundary(uMesh.getOutputData()),
            }
            const meshData = uMesh.getOutputData().getPoints().getData()
            resolve({ obbData, boundary, meshData })
        })
    })
}

function obbBoundary(dataset){
    const obbTree = vtkOBBTree.newInstance({ dataset, maxLevel: 1 })
    obbTree.buildLocator()
    const obbMesh = obbTree.generateRepresentation(0)
    return d1Tod3(obbMesh.getPoints().getData())
}
