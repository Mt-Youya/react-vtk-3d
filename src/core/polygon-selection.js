export default class PolygonSelection {
    constructor(container) {
        const canvas = document.createElement('canvas')
        canvas.style = 'position: absolute; left: 0; top: 0; width: 100%;height:100%;pointer-events:none;'
        const boundingRect = container.getBoundingClientRect()
        canvas.width = boundingRect.width
        canvas.height = boundingRect.height
        container.appendChild(canvas)
        this.canvas = canvas
    }

    update(vertexes, autoClose) {
        const ctx = this.canvas.getContext('2d')
        const { width, height } = this.canvas
        ctx.clearRect(0, 0, width, height)
        for (const vertex of vertexes) {
            // 每个顶点绘制一个点（矩形）
            const halfPointSize = 2
            const [x, y] = vertex
            ctx.fillStyle = 'red'
            ctx.fillRect(x - halfPointSize, y - halfPointSize, halfPointSize * 2, halfPointSize * 2)
        }
        // 绘制路径
        if (vertexes.length > 1) {
            ctx.strokeStyle = 'red'
            ctx.lineWidth = 2
            ctx.beginPath()
            let [x, y] = vertexes[0]
            ctx.moveTo(x, y)
            for (let i = 1; i < vertexes.length; i++) {
                [x, y] = vertexes[i]
                ctx.lineTo(x, y)
            }
            if (autoClose) {
                ctx.closePath()
            }
            ctx.stroke()
        }
    }

    delete() {
        this.canvas.remove()
    }
}