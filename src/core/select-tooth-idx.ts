export default class SelectToothIdx {
    #initSelected: number | null
    #onSelect: ((val: number) => void) | null = null
    #container: HTMLElement | null = null
    #elem: HTMLElement | null = null
    #pos: [number, number] | null = null

    constructor(
        container: HTMLElement,
        pos: [number, number],
        initSelected: number | null,
        onSelect: (val: number) => void,
    ) {
        this.#initSelected = initSelected
        this.#onSelect = onSelect
        this.#container = container
        this.#pos = pos

        this.#createDom(onSelect)
    }

    #createDom(onSelect: (val: number) => void): void {
        const elem = document.createElement("div")
        const arr: [number, number][] = [
            [55, 51],
            [61, 65],
            [17, 11],
            [21, 27],
            [47, 41],
            [31, 37],
            [85, 81],
            [71, 75],
        ]
        const elems: string[] = []

        const that = this

        function seq(a: number, b: number): string {
            const res: string[] = []
            const step = a > b ? -1 : 1
            while (a !== b) {
                res.push(`<div class="tooth-idx${a === that.#initSelected ? " selected" : ""}">${a}</div>`)
                a += step
            }
            res.push(`<div class="tooth-idx">${a}</div>`)
            return res.join("")
        }

        for (let i = 0; i < arr.length; i += 2) {
            const left = arr[i]
            const right = arr[i + 1]
            elems.push(`<div>${seq(left[0], left[1])}${seq(right[0], right[1])}</div>`)
        }
        elem.className = "yayan-float-window"
        elem.style.cssText = `left: ${this.#pos![0]}px; top: ${this.#pos![1]}px;`
        elem.innerHTML = `
            <div class="tooth-idx-wrap">${elems.join("")}</div>
            <div class="btn-clear-tooth-wrap">
                <div class="btn-clear-tooth">清\n除\n颜\n色</div>
            </div>
        `
        this.#elem = elem
        this.#container!.appendChild(elem)

        // 使用事件委托处理牙齿编号点击
        const wrap = elem.querySelector(".tooth-idx-wrap")!
        wrap.addEventListener("click", (e) => {
            const target = (e.target as HTMLElement).closest(".tooth-idx")
            if (!target) return
            const val = this.#toothMap(parseInt(target.textContent || "0"))
            onSelect(val)
            this.delete()
        })

        // 清除按钮直接绑定 onclick
        const clearBtn = elem.querySelector(".btn-clear-tooth") as HTMLElement
        clearBtn.onclick = () => {
            onSelect(0)
            this.delete()
        }
    }

    #toothMap(val: number): number {
        if (val >= 51 && val <= 55) return val - 42
        if (val >= 11 && val <= 18) return val - 2
        if (val >= 61 && val <= 65) return val - 60
        if (val >= 21 && val <= 27) return val - 20
        if (val >= 41 && val <= 48) return val - 41 + 1
        if (val >= 31 && val <= 38) return val - 31 + 9
        if (val >= 81 && val <= 85) return val - 81 + 1
        if (val >= 71 && val <= 75) return val - 71 + 9
        return 0
    }

    delete(): void {
        this.#elem!.remove()
    }
}
