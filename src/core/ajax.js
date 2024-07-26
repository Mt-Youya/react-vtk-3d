async function post(url, data) {
    return createRequest(url, 'POST', data)
}

async function get(url, params) {
    return createRequest(url, 'GET', params)
}

function createRequest(url, method, data) {
    return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        if (method == 'GET') {
            url += qsStr(data) 
        }
        xhr.timeout = 2000;
        xhr.onreadystatechange = (e) => {
            if (xhr.readyState == XMLHttpRequest.DONE) {
                if (xhr.status === 200) {
                    if (xhr.getResponseHeader('Content-Type') == 'application/json') {
                        resolve(JSON.parse(xhr.responseText))
                    } else {
                        resolve(xhr.response)
                    }
                } else {
                    reject('unexpected error')
                }
            }
        }
        xhr.onerror = () => {
            reject('ajax error')
        }
        xhr.open(method, url, true)
        xhr.setRequestHeader('Content-Type', 'application/json')
        xhr.send(method == 'POST' ? JSON.stringify(data) : null)
    })
}

function qsStr(obj) {
    if (!obj) return ''
    let res = Object.getOwnPropertyNames(obj).map(k => `${encodeURIComponent(k)}=${encodeURIComponent(obj[k])}`)
    if (res.length) {
        res = '?' + res
    }
    return res
}

export default {
    post,
    get
}