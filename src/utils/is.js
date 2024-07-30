function call(data) {
    return Object.prototype.toString.call(data)
}

export function isArrayBuffer(data) {
    return call(data) === "[object ArrayBuffer]"
}
