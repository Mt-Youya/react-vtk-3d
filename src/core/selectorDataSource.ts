import { BBox } from "./geometry"

type Point2D = [number, number]

declare global {
    interface Window {
        apiSpecificRenderWindow: {
            getSelector(): {
                setRenderer(r: unknown): void
                setCaptureZValues(v: boolean): void
                setArea(...args: number[]): void
                setCurrentPass(v: number): void
                select(): unknown[]
            }
        }
        renderer: unknown
        selectorDataSource: SelectorDataSource
        hlCells: number[]
    }
}

export class SelectorDataSource {
    output: unknown[] | null = null

    run(selectionBox: Point2D[]): void {
        const dpr = window.devicePixelRatio || 1
        const containerHeight = (window.innerHeight - 80) * dpr
        if (selectionBox.length > 2) {
            const [[xmin, ymin], [xmax, ymax]] = BBox(selectionBox)
            console.log("bbox = ", [xmin, ymin, xmax, ymax])
            selectionBox = [
                [xmin, containerHeight - ymax],
                [xmax, containerHeight - ymin],
            ]
            console.log("new selectionBox = ", selectionBox)
        }
        const [p1, p2] = selectionBox
        const hardwareSelector = window.apiSpecificRenderWindow.getSelector()
        hardwareSelector.setRenderer(window.renderer)
        hardwareSelector.setCaptureZValues(true)
        hardwareSelector.setArea(...p1, ...p2)
        hardwareSelector.setCurrentPass(-1)
        const selectionNodes = hardwareSelector.select()
        this.output = selectionNodes
    }

    clear(): void {
        this.output = null
    }
}
