import request, { METHOD } from "@/utils/request"
import type { ApiResponse, ModelFileInfo, InfoSideData } from "@/types"

export function stl2Vtp(data: unknown): Promise<ApiResponse> {
    return request({
        url: "/api/stl-to-vtp",
        method: METHOD.POST,
        data,
    })
}

export function getInfo(id: string | number): Promise<ApiResponse> {
    return request({
        url: "/api/getToothWidthInfoById",
        method: METHOD.GET,
        params: { id },
    })
}

export function setScalar(data: unknown): Promise<ApiResponse> {
    return request({
        url: "/api/vtp-set-scalars-label",
        method: METHOD.POST,
        data,
    })
}

export function saveInfo(data: unknown): Promise<ApiResponse> {
    return request({
        url: "/api/save3DMeasureInfo",
        method: METHOD.POST,
        data,
    })
}

export function getDigitalFiles(planId: string | number): Promise<ApiResponse<ModelFileInfo>> {
    return request({
        url: `/api/getDigital`,
        params: { id: planId },
        method: METHOD.GET,
    })
}

export function measureModel(data: unknown): Promise<ApiResponse> {
    return request({
        url: "/api/modelMeasure",
        method: METHOD.POST,
        data,
    })
}

export function getAllToothInfo(
    planId: string | number,
): Promise<ApiResponse<{ results: InfoSideData; initial: boolean }>> {
    return request({
        url: "/api/getAllToothInfo",
        method: METHOD.GET,
        params: { planId },
    })
}
