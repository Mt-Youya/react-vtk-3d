import axios, { type InternalAxiosRequestConfig, type AxiosResponse } from "axios"
import type { ApiResponse } from "@/types"

const service = axios.create({
    baseURL: import.meta.env.VITE_API_URL as string,
    timeout: 200000,
    headers: { "Content-Type": "application/json" },
})

export const METHOD = {
    GET: "get",
    POST: "post",
    PUT: "put",
    DELETE: "delete",
} as const

service.interceptors.request.use(
    (config: InternalAxiosRequestConfig) => {
        return config
    },
    (error: unknown) => {
        return Promise.reject(error)
    },
)

service.interceptors.response.use(
    (response: AxiosResponse<ApiResponse>) => {
        const res = response.data
        if (res.code && res.code !== 0) {
            return Promise.reject(res.message || "Error")
        } else {
            return res as unknown as AxiosResponse
        }
    },
    (error: unknown) => {
        return Promise.reject(error)
    },
)

export const FileHeader = { "Content-Type": "multipart/form-data" }

export default service
