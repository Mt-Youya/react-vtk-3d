import { create } from "zustand"

export const useInfoSideDataStore = create(set => ({
    infoSideData: null,
    setInfoSideData: infoSideData => set(_ => ({ infoSideData })),
}))
