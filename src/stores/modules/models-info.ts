import { create } from "zustand"
import type { ModelInfo } from "@/types"

interface ModelsInfoState {
    modelsInfo: ModelInfo[]
    setModelsInfo: (modelsInfo: ModelInfo[]) => void
}

export const useModelsInfoStore = create<ModelsInfoState>((set) => ({
    modelsInfo: [
        { filename: "请上传上颌模型!", deleted: false },
        { filename: "请上传下颌模型!", deleted: false },
    ],
    setModelsInfo: (modelsInfo) => set(() => ({ modelsInfo })),
}))
