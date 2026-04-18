export function bSearch(arr: number[], item: number): number {
    const len = arr.length
    let start = 0
    let end = len - 1
    while (start <= end) {
        const pivot = Math.floor((start + end) / 2)
        if (arr[pivot] == item) return pivot
        else if (arr[pivot] > item) {
            end = pivot - 1
        } else {
            start = pivot + 1
        }
    }
    return -1
}

export class UniqueOrderedList {
    data: number[]

    constructor(arr: number[]) {
        arr.sort((a, b) => a - b)
        this.data = arr
    }

    add(item: number): boolean {
        const arr = this.data
        const len = arr.length
        let start = 0
        let end = len - 1
        while (start <= end) {
            const pivot = Math.floor((start + end) / 2)
            if (arr[pivot] == item) return false
            else if (arr[pivot] > item) {
                end = pivot - 1
            } else {
                start = pivot + 1
            }
        }
        this.data.splice(start, 0, item)
        return true
    }

    empty(): boolean {
        return !this.data.length
    }

    merge(sortedList: number[]): void {
        if (!this.data.length) {
            this.data = [...sortedList]
            return
        }
        let i = 0
        let j = 0
        const { data } = this
        const mergedList: number[] = []
        const len = data.length
        const len1 = sortedList.length
        while (i < len && j < len1) {
            if (data[i] < sortedList[j]) {
                mergedList.push(data[i])
                i++
            } else if (data[i] > sortedList[j]) {
                mergedList.push(sortedList[j])
                j++
            } else {
                mergedList.push(data[i])
                i++
                j++
            }
        }
        while (i < len) {
            mergedList.push(data[i])
            i++
        }
        while (j < len1) {
            mergedList.push(sortedList[j])
            j++
        }
        this.data = mergedList
    }

    findIndex(v: number): number {
        return bSearch(this.data, v)
    }
}
