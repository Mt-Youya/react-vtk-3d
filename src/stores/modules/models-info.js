import { create } from "zustand"

export const useModelsInfoStore = create((set) => ({
    modelsInfo: ["请上传上颌模型!", "请上传下颌模型!"],
    setModelsInfo: modelsInfo => set(_ => ({ modelsInfo })),
}))
