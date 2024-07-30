import request, { METHOD } from "@/utils/request"

// 分割vtp文件
// POST /medical-record/rpc/iocs/segmentation
// 接口ID：122823412
// 接口地址：https://app.apifox.com/link/project/2048042/apis/api-122823412
export function splitFile(data) {
    return request({
        url: "/medical-record/rpc/iocs/segmentation",
        method: METHOD.POST,
        data,
    })
}

export function stl2Vtp(data) {
    return request({
        url: import.meta.env.VITE_STL_API_URL + "/api/stl-to-vtp",
        method: METHOD.POST,
        data,
    })
}

export function screenshot(data) {
    return request({
        url: import.meta.env.VITE_STL_API_URL + "/api/screen-shot",
        method: METHOD.POST,
        data,
    })
}

export function getInfo(params) {
    return request({
        url: "/medical-record/rpc/iocs/getToothWidthInfoById",
        method: METHOD.GET,
        params,
    })
}

export function setScalar(data) {
    return request({
        url: import.meta.env.VITE_STL_API_URL + "/api/vtp-set-scalars-label",
        method: METHOD.POST,
        data,
    })
}

export function getVtp(data) {
    return request({
        url: import.meta.env.VITE_STL_API_URL + data,
        method: METHOD.GET,
    })
}

export function getOssVtp(data) {
    return request({
        url: data,
        method: METHOD.GET,
    })
}

export function saveInfo(data) {
    return request({
        url: import.meta.env.VITE_OSS_URL + "/medical-record/rpc/iocs/save3DMeasureInfo",
        method: METHOD.POST,
        data,
    })
}

export function getDigitalFiles(planId) {
    return request({
        url: `http://localhost:9009/api/getDigital`,
        params: { id: planId },
        method: METHOD.GET,
    })
}

export function measureModel(data) {
    return request({
        url: "/medical-record/rpc/iocs/modelMeasure",
        method: METHOD.POST,
        data,
    })
}

export function getAllToothInfo(planId) {
    return request({
        url: "http://localhost:9009/api/getAllToothInfo",
        method: METHOD.GET,
        params: { planId },
    })
}
