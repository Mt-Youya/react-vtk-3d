import { BBox } from "./geometry"
export class SelectorDataSource {
    constructor() {
        this.output = null
    }

    run(selectionBox) {
        const dpr = window.devicePixelRatio || 1
        const containerHeight = (window.innerHeight - 80) * dpr // TODO: 获取 RenderWindow.topContainer.Height
        // selectionBox 的原点在左下角
        if (selectionBox.length > 2) {
            const [[xmin, ymin], [xmax, ymax]] = BBox(selectionBox)
            console.log('bbox = ', [xmin, ymin, xmax, ymax])
            selectionBox = [[xmin, containerHeight - ymax], [xmax, containerHeight - ymin]]
            console.log('new selectionBox = ', selectionBox)
        }
        const [p1, p2] = selectionBox
        const hardwareSelector = window.apiSpecificRenderWindow.getSelector();
        hardwareSelector.setRenderer(window.renderer);
        // 如果用 FIELD_ASSOCIATION_POINTS 模式，有 bug
        // hardwareSelector.setFieldAssociation(FieldAssociations.FIELD_ASSOCIATION_POINTS)
        hardwareSelector.setCaptureZValues(true)
        hardwareSelector.setArea(...p1, ...p2)
        hardwareSelector.setCurrentPass(-1)
        const selectionNodes = hardwareSelector.select()
        this.output = selectionNodes
    }

    clear() {
        this.output = null
    }
}