import request, { METHOD } from "@/utils/request"

export function stl2Vtp(data) {
    return request({
        url: "/api/stl-to-vtp",
        method: METHOD.POST,
        data,
    })
}


export function getInfo(id) {
    return request({
        url: "/api/getToothWidthInfoById",
        method: METHOD.GET,
        params: { id },
    })
}

export function setScalar(data) {
    return request({
        url: "/api/vtp-set-scalars-label",
        method: METHOD.POST,
        data,
    })
}

export function saveInfo(data) {
    return request({
        url: "/api/save3DMeasureInfo",
        method: METHOD.POST,
        data,
    })
}

export function getDigitalFiles(planId) {
    return request({
        url: `/api/getDigital`,
        params: { id: planId },
        method: METHOD.GET,
    })
}

export function measureModel(data) {
    return request({
        url: "/api/modelMeasure",
        method: METHOD.POST,
        data,
    })
}

export function getAllToothInfo(planId) {
    return request({
        url: "/api/getAllToothInfo",
        method: METHOD.GET,
        params: { planId },
    })
}
