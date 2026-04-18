import { create } from "zustand"
import type { InfoSideData } from "@/types"

interface InfoSideDataState {
    infoSideData: InfoSideData | null
    setInfoSideData: (infoSideData: InfoSideData) => void
}

export const useInfoSideDataStore = create<InfoSideDataState>((set) => ({
    infoSideData: null,
    setInfoSideData: (infoSideData) => set(() => ({ infoSideData })),
}))
