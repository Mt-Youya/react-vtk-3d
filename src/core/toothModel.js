import vtkActor from '@kitware/vtk.js/Rendering/Core/Actor';
import vtkMapper from '@kitware/vtk.js/Rendering/Core/Mapper';

import vtkXMLPolyDataReader from '@kitware/vtk.js/IO/XML/XMLPolyDataReader';
import highlightSelectionPoints from './highlightSelectionPoints';
import vertexSculpture from './vertexSculpture';

import vtkSTLReader from '@kitware/vtk.js/IO/Geometry/STLReader';
import vtkCoordinate from '@kitware/vtk.js/Rendering/Core/Coordinate';
import {isPointInPolygonV2 as isPointInPolygon} from './geometry';
import { UniqueOrderedList } from './ordered-list';

export default class ToothModel {
    constructor(readerType, name) {
        this.readerType = readerType
        this.name = name
        this.sourceReader = null
        this.mapper = null
        this.mapper1 = null
        this.mapper2 = null
        this.actor = null
        this.actor1 = null
        this.actor2 = null
        this.vertexSculptureFilter = null
        this.highlightSelectionPointsFilter = null
    }

    init(renderer) {
        this.sourceReader = null
        switch(this.readerType) {
            case 'stl':
                this.sourceReader = vtkSTLReader.newInstance();
            break
            case 'vtp':
                this.sourceReader = vtkXMLPolyDataReader.newInstance();
            break
        }

        this.mapper = vtkMapper.newInstance({
            viewSpecificProperties: {
                name: this.name
            }
        });
        const mapper = this.mapper
        mapper.setScalarModeToUseCellData()
        mapper.setColorModeToMapScalars();
        const lut = mapper.getLookupTable()
        const values = new Array(26).fill(null)
        values.forEach((_, idx) => values[idx] = idx + 1)
        lut.setIndexedLookup(true)
        lut.setNanColor([1, .635, .561, 1.0]) // #ffa28f
        lut.setAnnotations(values, new Array(values.length).fill(''))
        lut.setTable([
            // [255, 162, 143, 255], // #ffa28f
            [150, 117, 148, 255], // #967594
            [170, 255, 255, 255], // #aaffff
            [255, 0, 127, 255], // #ff007f
            [170, 255, 127, 255], // #aaff7f
            [0, 0, 127, 255], // #00007f
            [255, 255, 127, 255], // #ffff7f
            [255, 170, 255, 255], // #ffaaff
            [255, 255, 255, 255], // #ffffff

            [77, 99, 82, 255], // #4d6352
            [255, 0, 255, 255], // #ff00ff
            [255, 255, 0, 255], // #ffff00
            [0, 0, 255, 255], // #0000ff
            [0, 255, 0, 255], // #00ff00
            [255, 0, 0, 255], // #ff0000
            [0, 255, 255, 255], // #00ffff
            [202, 200, 232, 255], // #cac8e8

            [68, 114, 196, 255], // #4472c4
            [255, 80, 80, 255], // #ff5050
            [0, 51, 0, 255], // #003300
            [102, 102, 255, 255], // #6666ff
            [204, 204, 0, 255], // #cccc00
            [102, 0, 51, 255], // #660033
            [231, 232, 228, 255], // #e7e8e4
            [95, 95, 95, 255], // #5f5f5f

            [102, 0, 204, 255], // #6600cc
            [255, 153, 0, 255], // #ff9900
        ])
        this.mapper1 = vtkMapper.newInstance();
        const mapper1 = this.mapper1
        mapper1.setScalarModeToUsePointData(); // 不使用模型自带的颜色，通过 actor1 指定纯色
        
        this.actor = vtkActor.newInstance(); // 面渲染
        const actor = this.actor
        actor.setMapper(mapper);
        renderer.addActor(actor);
        
        this.actor1 = vtkActor.newInstance(); // 线框渲染
        const actor1 = this.actor1
        actor1.setMapper(mapper1);
        actor1.getProperty().setColor(0, .4, 0)
        actor1.getProperty().setRepresentationToWireframe();
        actor1.setPickable(false)
        renderer.addActor(actor1);
        
        this.vertexSculptureFilter = vertexSculpture.newInstance();
        const vertexSculptureFilter = this.vertexSculptureFilter
        vertexSculptureFilter.setInputConnection(this.sourceReader.getOutputPort());
        mapper.setInputConnection(vertexSculptureFilter.getOutputPort());
        mapper1.setInputConnection(vertexSculptureFilter.getOutputPort());
        
        this.actor2 = vtkActor.newInstance(); // 选中的点
        const actor2 = this.actor2
        this.mapper2 = vtkMapper.newInstance();
        const mapper2 = this.mapper2
        // const polyDataNormalsFilter = vtkPolyDataNormals.newInstance()
        // polyDataNormalsFilter.setInputConnection(vertexSculptureFilter.getOutputPort())
        this.highlightSelectionPointsFilter = highlightSelectionPoints.newInstance({
            toothCategory: this.name
        })
        const highlightSelectionPointsFilter = this.highlightSelectionPointsFilter
        highlightSelectionPointsFilter.setInputConnection(vertexSculptureFilter.getOutputPort())
        // highlightSelectionPointsFilter.update()
        mapper2.setInputConnection(highlightSelectionPointsFilter.getOutputPort())
        actor2.setMapper(mapper2)
        actor2.getProperty().setColor(0, 1, 1)
        actor2.getProperty().setPointSize(6)
        actor2.getProperty().setRepresentationToPoints()
        renderer.addActor(actor2)
    }

    collapseInward(pointIdxArr) {
        const mesh = this.vertexSculptureFilter.getCachedPolyData();
        const len = mesh.getNumberOfCells();
        const pointData = mesh.getPoints()
        let cellIdx = 0;
        const dataArr = mesh.getPolys().getData();
        
        const currentSelectionBox = this.highlightSelectionPointsFilter.getSelectionBox()
        const [p1, p2] = currentSelectionBox
        const containerHeight = window.innerHeight
        const currentBoundary = currentSelectionBox.length == 2  ? [[p1[0], containerHeight - p2[1]], [p2[0], containerHeight - p1[1]]] : currentSelectionBox
        let iteratation = new UniqueOrderedList(pointIdxArr)
        const faces = []
        for (let i = 0; i < len; i++) {
            const poly = dataArr.slice(cellIdx + 1, cellIdx + 1 + dataArr[cellIdx])
            cellIdx += dataArr[cellIdx] + 1
            faces.push(poly)
        }
        const res = new UniqueOrderedList([])
        res.merge(iteratation.data)
        let orderedList = null
        let iter = 1
        const debugArr = []
        do {
            orderedList = iteratation
            iteratation = new UniqueOrderedList([])
            for (let i = 0; i < faces.length; i++) {
                const poly = faces[i]
                let num = 0
                const temp = []
                for (const idx of poly) {
                    if (orderedList.findIndex(idx) != -1) {
                        num++
                    } else {
                        temp.push(idx)
                    }
                }
                if (num >= 1) {
                    for (const idx of temp) {
                        const coordObj = vtkCoordinate.newInstance({
                            value: pointData.getPoint(idx),
                            renderer: window.renderer
                          })
                          const coord = coordObj.getComputedLocalDisplayValue()
                        //   console.log(`point: ${pointData.getPoint(idx)}, coord: ${coord}`)
                          debugArr.push(`[${pointData.getPoint(idx).join(',')}]`)
                          if (isPointInPolygon(currentBoundary, coord)) {
                            iteratation.add(idx)
                        }
                    }
                }
            }
            // console.log(pointIdxArr.join(','))
            // console.log(pointIdxArr.map(i => `[${pointData.getPoint(i).join(',')}]`).join(',\n'))
            // console.log(debugArr.join(',\n'))
            res.merge(iteratation.data)
            iter++
        } while (!iteratation.empty() && iter < 5)
        return res.data
    }

    pointsInBoundary() {
        const mesh = this.vertexSculptureFilter.getCachedPolyData()
        const pointData = mesh.getPoints()
        const len = mesh.getNumberOfPoints()
        const pointIdxArr = []
        const currentSelectionBox = this.highlightSelectionPointsFilter.getSelectionBox()
        const [p1, p2] = currentSelectionBox
        const dpr = window.devicePixelRatio || 1
        const containerHeight = (window.innerHeight - 80) * dpr
        const currentBoundary = currentSelectionBox.length == 2  ? [[p1[0], containerHeight - p2[1]], [p2[0], containerHeight - p1[1]]] : currentSelectionBox
        const coords = []
        for (let i = 0; i < len; i++) {
          const coordObj = vtkCoordinate.newInstance({
            value: pointData.getPoint(i),
            renderer: window.renderer
          })
          const coord = coordObj.getComputedLocalDisplayValue()
          coords.push(coord)
        }

        for (let i = 0; i < len; i++) {
            const coord = coords[i]
            if (isPointInPolygon(currentBoundary, coord)) {
                pointIdxArr.push(i)
            }
        }
        
        return pointIdxArr
    }

    delete() {
        const {actor, actor1, actor2, mapper, mapper1, mapper2, 
            vertexSculptureFilter, highlightSelectionPointsFilter, sourceReader} = this
        const arr = [actor, actor1, actor2, mapper, mapper1, mapper2, 
            vertexSculptureFilter, highlightSelectionPointsFilter, sourceReader]
          arr.forEach(item => {
            item.delete()
          })
    }
}