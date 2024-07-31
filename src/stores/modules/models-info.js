import { create } from "zustand"

export const useModelsInfoStore = create((set) => ({
    modelsInfo: [{ filename: "请上传上颌模型!", deleted: false }, { filename: "请上传下颌模型!", deleted: false }],
    setModelsInfo: modelsInfo => set(_ => ({ modelsInfo })),
}))
