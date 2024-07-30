import request, { METHOD } from "@/utils/request.js"
import OSS from "ali-oss"
import { useOSSStore } from "@/stores/index.js"

export function getOSSClient() {
    const params = {
        url: import.meta.env.VITE_OSS_URL + "/admin-api/infra/file/getStsToken",
        method: METHOD.GET,
        params: {},
    }
    return request(params).then(({ data }) => new OSS(data)).catch(err => {
        console.log("getOssToken Error", err)
        return false
    })
}

export async function ossPutFile(fileName, fileBlob) {
    const { client } = useOSSStore()
    let backUrl = ""
    try {
        const { url } = await client.put(fileName, fileBlob)
        backUrl = url
    } catch (error) {
        if (client) {
            const { url } = await client.put(fileName, fileBlob)
            backUrl = url
        } else {
            // new Message({
            //     type: "warning",
            //     message: "接口异常请联系管理员",
            // })
        }
    }
    return backUrl
}
