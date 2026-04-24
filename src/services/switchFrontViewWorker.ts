import vtkOBBTree from "@kitware/vtk.js/Filters/General/OBBTree"
import vtkAppendPolyData from "@kitware/vtk.js/Filters/General/AppendPolyData"
import ViewWorker from "@/workers/switchFrontView.ts?worker"
import { d1Tod3 } from "@/core/geometry"
import useIdleCallback from "@/hooks/useIdleCallback"
import { logger } from "@/utils/logger"

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyObj = any

// 找到上下颌的正面坐标系
export default async function switchFrontViewWorker(...args: [AnyObj, AnyObj]): Promise<unknown> {
  const worker = new ViewWorker()

  // 添加 timeout 确保高负载时也能及时执行，并正确传播错误
  return new Promise((resolve, reject) => {
    requestIdleCallback(
      async (idle) => {
        if (idle.timeRemaining() > 0) {
          logger.time("working")
          try {
            const workingResults = await working(...args)
            worker.postMessage(workingResults)
            logger.timeEnd("working")
          } catch (err) {
            worker.terminate()
            reject(err)
          }
        }
      },
      { timeout: 2000 },
    )

    worker.onmessage = (ev: MessageEvent) => {
      resolve(ev.data)
      worker.terminate()
    }

    worker.onerror = (err) => {
      worker.terminate()
      reject(err)
    }
  })
}

function working(uMesh: AnyObj, lMesh: AnyObj): Promise<unknown> {
  const appendPolyData = vtkAppendPolyData.newInstance()
  return new Promise((resolve, reject) => {
    useIdleCallback(() => {
      try {
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
      } catch (err) {
        reject(err)
      }
    })
  })
}

function obbBoundary(dataset: AnyObj): ReturnType<typeof d1Tod3> {
  const obbTree = vtkOBBTree.newInstance({ dataset, maxLevel: 1 })
  obbTree.buildLocator()
  const obbMesh = obbTree.generateRepresentation(0)
  return d1Tod3(obbMesh.getPoints().getData())
}
