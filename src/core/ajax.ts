async function post(url: string, data: unknown): Promise<unknown> {
    return createRequest(url, "POST", data)
}

async function get(url: string, params?: Record<string, unknown>): Promise<unknown> {
    return createRequest(url, "GET", params)
}

function createRequest(url: string, method: "GET" | "POST", data?: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        if (method == "GET") {
            url += qsStr(data as Record<string, unknown> | undefined)
        }
        xhr.timeout = 2000
        xhr.onreadystatechange = () => {
            if (xhr.readyState == XMLHttpRequest.DONE) {
                if (xhr.status === 200) {
                    if (xhr.getResponseHeader("Content-Type") == "application/json") {
                        resolve(JSON.parse(xhr.responseText))
                    } else {
                        resolve(xhr.response)
                    }
                } else {
                    reject("unexpected error")
                }
            }
        }
        xhr.onerror = () => {
            reject("ajax error")
        }
        xhr.open(method, url, true)
        xhr.setRequestHeader("Content-Type", "application/json")
        xhr.send(method == "POST" ? JSON.stringify(data) : null)
    })
}

function qsStr(obj?: Record<string, unknown>): string {
    if (!obj) return ""
    let res: string | string[] = Object.getOwnPropertyNames(obj).map(
        (k) => `${encodeURIComponent(k)}=${encodeURIComponent(String(obj[k]))}`,
    )
    if (res.length) {
        return "?" + res.join("&")
    }
    return ""
}

export default {
    post,
    get,
}
