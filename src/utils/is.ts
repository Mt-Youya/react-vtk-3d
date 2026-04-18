function call(data: unknown): string {
    return Object.prototype.toString.call(data)
}

export function isArrayBuffer(data: unknown): data is ArrayBuffer {
    return call(data) === "[object ArrayBuffer]"
}
