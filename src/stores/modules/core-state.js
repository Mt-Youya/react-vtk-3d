import { create } from "zustand"

export const useCoreStore = create((set) => ({
    coreMethods: null,
    setCoreMethods: coreMethods => set(_ => ({ coreMethods })),
}))
