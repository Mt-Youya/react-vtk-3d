import { BrowserRouter as Router, Route, Routes } from "react-router-dom"
import Home from "./pages/home"
import NotFound from "./pages/result/404"
import "./App.css"

function App(){
    return (
        <Router>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="*" element={<NotFound />} />
            </Routes>
        </Router>
    )
}

export default App

// import { useRef, useEffect } from "react"
// import "@kitware/vtk.js/Rendering/Profiles/Geometry"
// import vtkFullScreenRenderWindow from "@kitware/vtk.js/Rendering/Misc/FullScreenRenderWindow"
// import vtkActor from "@kitware/vtk.js/Rendering/Core/Actor"
// import vtkMapper from "@kitware/vtk.js/Rendering/Core/Mapper"
// import vtkSTLReader from "@kitware/vtk.js/IO/Geometry/STLReader"
// import vertexSculpture from "@/js/vertexSculpture"
// import highlightSelectionPoints from "@/js/highlightSelectionPoints"
//
// function App (){
//     const vtkContainerRef = useRef(null)
//     const context = useRef(null)
//
//     function render (){
//         const { renderer, renderWindow } = context.current
//         const camera = renderer.getActiveCamera()
//         // camera.setViewUp(0, 1, 0)
//         camera.setPosition(0, 0, 1)
//         camera.setFocalPoint(0, 0, 0)
//         renderer.resetCamera()
//         renderWindow.render()
//     }
//
//     function init (){
//         const stlReader = vtkSTLReader.newInstance()
//
//         const mapper = vtkMapper.newInstance()
//         mapper.setScalarModeToUseCellData()
//         mapper.setColorModeToMapScalars()
//
//         const actor = vtkActor.newInstance()
//         actor.setMapper(mapper)
//
//         const lut = mapper.getLookupTable()
//         const values = [55, 54, 53, 52, 51]
//         lut.setIndexedLookup(true)
//         lut.setNanColor([1.0, 1.0, 1.0, 1.0])
//         lut.setAnnotations(values, new Array(values.length).fill(""))
//         lut.setTable([
//             [0, 128, 128, 255],
//             [0, 255, 255, 255],
//             [117, 79, 199, 255],
//             [199, 189, 34, 255],
//             [199, 194, 174, 255],
//         ])
//
//         const mapper1 = vtkMapper.newInstance()
//         mapper1.setScalarModeToUsePointData() // 不使用模型自带的颜色，通过 actor1 指定纯色
//         const actor1 = vtkActor.newInstance()
//         actor1.setMapper(mapper1)
//         actor1.getProperty().setColor(0, .4, 0)
//         actor1.getProperty().setRepresentationToWireframe()
//
//         const vertex = vertexSculpture.newInstance()
//         vertex.setInputConnection(stlReader.getOutputPort())
//         mapper.setInputConnection(vertex.getOutputPort())
//         mapper1.setInputConnection(vertex.getOutputPort())
//
//         const highlight = highlightSelectionPoints.newInstance()
//         highlight.setInputConnection(vertex.getOutputPort())
//
//         const mapper2 = vtkMapper.newInstance()
//         mapper2.setInputConnection(highlight.getOutputPort())
//         const actor2 = vtkActor.newInstance()
//         actor2.setMapper(mapper2)
//         actor2.getProperty().setColor(0, 1, 1)
//         actor2.getProperty().setPointSize(6)
//         actor2.getProperty().setRepresentationToPoints()
//
//         const actors = [actor, actor1, actor2]
//         const mappers = [mapper, mapper1, mapper2]
//
//         const cacheCtx = context.current
//
//         for (const item of actors) {
//             cacheCtx.renderer.addActor(item)
//         }
//
//         context.current = {
//             ...cacheCtx,
//             stlReader,
//             highlight,
//             vertex,
//             actors,
//             mappers,
//         }
//         return context.current
//     }
//
//     useEffect(() => {
//         const fullScreenRenderer = vtkFullScreenRenderWindow.newInstance({
//             rootContainer: vtkContainerRef.current,
//             containerStyle: { height: "90%", width: "100%", position: "absolute" },
//             background: [1, .9, 1],
//         })
//         const renderer = fullScreenRenderer.getRenderer()
//         const renderWindow = fullScreenRenderer.getRenderWindow()
//         context.current = { renderer, renderWindow }
//
//         return () => {
//             if (context.current) {
//                 for (const cKey in context.current) {
//                     const item = context.current[cKey]
//                     if (Array.isArray(item)) {
//                         for (const itemElement of item) {
//                             itemElement.delete()
//                         }
//                     } else {
//                         context.current[cKey].delete()
//                     }
//                 }
//                 context.current = null
//             }
//         }
//     }, [])
//
//     async function handleUpload (e){
//         const files = e.target.files
//         const filesBuffer = []
//         for (const file of files) {
//             filesBuffer.push(file.arrayBuffer())
//         }
//         const result = await Promise.all(filesBuffer)
//         init()
//         context.current.stlReader.parseAsArrayBuffer(result[0])
//         render()
//     }
//
//     return (
//         <div>
//             <input type="file" multiple onChange={handleUpload}/>
//             <div ref={vtkContainerRef}/>
//
//         </div>
//     )
// }
//
// export default App
